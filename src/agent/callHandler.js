const { buildSystemPrompt } = require('./promptEngine');
const logger = require('../utils/logger');

const DEFAULT_MODEL  = 'claude-sonnet-4-6';
const DEFAULT_VOICE  = process.env.VAPI_VOICE_ID || 'sarah'; // ElevenLabs voice

// Tools Vapi will pass to Claude — function-call webhooks fire back to us.
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'takeMessage',
      description: 'Record a message from the caller to pass to the business owner.',
      parameters: {
        type: 'object',
        properties: {
          callerName:  { type: 'string', description: "Caller's full name" },
          callerPhone: { type: 'string', description: "Caller's phone number" },
          message:     { type: 'string', description: 'The message content to pass along' }
        },
        required: ['callerName', 'callerPhone', 'message']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'bookAppointment',
      description: 'Record an appointment request from the caller.',
      parameters: {
        type: 'object',
        properties: {
          callerName:      { type: 'string', description: "Caller's full name" },
          callerPhone:     { type: 'string', description: "Caller's callback number" },
          appointmentType: { type: 'string', description: 'Type of appointment requested' },
          preferredDate:   { type: 'string', description: 'Preferred date/time (e.g. "Thursday morning")' },
          notes:           { type: 'string', description: 'Additional notes or reason for visit' }
        },
        required: ['callerName', 'callerPhone', 'appointmentType', 'preferredDate']
      }
    }
  }
];

function buildAssistantConfig(clientConfig) {
  if (!clientConfig) {
    return {
      firstMessage: 'Thank you for calling. How can I help you today?',
      model: {
        provider: 'anthropic',
        model: DEFAULT_MODEL,
        messages: [{ role: 'system', content: 'You are a helpful receptionist. Be brief and professional.' }],
        maxTokens: 300,
        temperature: 0.7
      },
      voice: { provider: '11labs', voiceId: DEFAULT_VOICE }
    };
  }

  const firstMessage = clientConfig.firstMessage
    || `Thank you for calling ${clientConfig.businessName}, this is ${clientConfig.agentName}! How can I help you today?`;

  return {
    name: clientConfig.agentName,
    firstMessage,
    model: {
      provider: 'anthropic',
      model: clientConfig._meta?.claudeModel || DEFAULT_MODEL,
      messages: [{ role: 'system', content: buildSystemPrompt(clientConfig) }],
      maxTokens: 300,
      temperature: 0.7,
      tools: TOOLS
    },
    voice: {
      provider: clientConfig._meta?.voiceProvider || '11labs',
      voiceId: clientConfig._meta?.voiceId || DEFAULT_VOICE
    },
    // metadata flows through to function-call and end-of-call-report payloads
    metadata: { clientId: clientConfig.clientId }
  };
}

function logCallEnd(message, call) {
  logger.info({
    event: 'call_ended',
    callId: call?.id,
    clientId: call?.metadata?.clientId,
    endedReason: message.endedReason,
    durationSeconds: message.durationSeconds,
    summary: message.summary || null,
    recordingUrl: message.recordingUrl || null
  });
}

module.exports = { buildAssistantConfig, logCallEnd };
