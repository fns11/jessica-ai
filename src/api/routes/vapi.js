const express = require('express');
const { vapiWebhookAuth } = require('../middleware/auth');
const { handleTurn, handleCallEnd } = require('../../agent/callHandler');
const { loadClient } = require('../../config/configLoader');
const logger = require('../../utils/logger');

const router = express.Router();

/**
 * POST /api/vapi/webhook
 *
 * Vapi calls this on every conversation event:
 *   - message-type: "function-call" or "assistant-request" → we respond with text
 *   - message-type: "end-of-call-report"                   → cleanup
 *
 * The clientId is passed via Vapi's "metadata" field on the assistant config.
 */
router.post('/webhook', vapiWebhookAuth, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing message' });

  const { type, call } = message;
  const callId = call?.id;
  const clientId = call?.metadata?.clientId;

  if (!clientId) {
    logger.warn({ event: 'missing_client_id', callId });
    return res.json({ response: "I'm sorry, I'm not configured yet. Please try again later." });
  }

  let clientConfig;
  try {
    clientConfig = loadClient(clientId);
  } catch (err) {
    logger.error({ event: 'config_load_failed', clientId, error: err.message });
    return res.json({ response: "I'm having trouble looking up your account. Please hold." });
  }

  // Verify client subscription is active
  if (clientConfig._meta?.planStatus !== 'active') {
    logger.warn({ event: 'inactive_client', clientId });
    return res.json({ response: "This service is currently unavailable. Please contact support." });
  }

  if (type === 'end-of-call-report') {
    handleCallEnd(callId);
    return res.json({ received: true });
  }

  // "assistant-request" fires when the caller speaks and Vapi needs our reply
  if (type === 'assistant-request') {
    const transcript = message.transcript || message.text || '';
    const reply = await handleTurn({ callId, transcript }, clientConfig);
    // Vapi expects { response: "..." }
    return res.json({ response: reply });
  }

  // Unhandled message types — acknowledge silently
  res.json({ received: true });
});

module.exports = router;
