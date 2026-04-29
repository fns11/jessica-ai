const Anthropic = require('@anthropic-ai/sdk');
const { buildSystemPrompt } = require('./promptEngine');
const sessionManager = require('./sessionManager');
const logger = require('../utils/logger');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 300; // Keep responses tight — voice UX requires brevity

/**
 * Main entry point called by the Vapi webhook on each conversation turn.
 *
 * @param {object} vapiMessage  - Parsed Vapi message payload
 * @param {object} clientConfig - Loaded white-label client config
 * @returns {string}            - Text response for Vapi to speak
 */
async function handleTurn(vapiMessage, clientConfig) {
  const { callId, transcript } = vapiMessage;

  // Build or retrieve in-flight conversation history
  const history = sessionManager.getHistory(callId);

  // Append the latest caller utterance
  if (transcript) {
    history.push({ role: 'user', content: transcript });
  }

  const systemPrompt = buildSystemPrompt(clientConfig);

  let reply;
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          // Cache the system prompt — it's identical across turns in the same call
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: history
    });

    reply = response.content[0]?.text?.trim() || "I'm sorry, could you repeat that?";
  } catch (err) {
    logger.error({ message: 'Claude API error', callId, error: err.message });
    reply = "I'm sorry, I'm having a little trouble right now. Please hold for a moment.";
  }

  // Store assistant reply for multi-turn continuity
  history.push({ role: 'assistant', content: reply });
  sessionManager.setHistory(callId, history);

  logger.info({ event: 'turn_complete', callId, clientId: clientConfig.clientId });
  return reply;
}

/**
 * Called by Vapi end-of-call webhook. Cleans up session state.
 */
function handleCallEnd(callId) {
  sessionManager.deleteHistory(callId);
  logger.info({ event: 'call_ended', callId });
}

module.exports = { handleTurn, handleCallEnd };
