const express = require('express');
const { vapiWebhookAuth } = require('../middleware/auth');
const { buildAssistantConfig, logCallEnd } = require('../../agent/callHandler');
const { dispatch } = require('../../agent/functions');
const { findClientByPhoneNumberId, loadClient } = require('../../config/configLoader');
const logger = require('../../utils/logger');

const router = express.Router();

/**
 * POST /api/vapi/webhook
 *
 * Single endpoint for all Vapi events:
 *
 *  assistant-request  — call just connected; return per-client assistant config
 *  function-call      — AI invoked a tool (takeMessage / bookAppointment)
 *  end-of-call-report — call finished; log summary + duration
 *  status-update      — call state change; log only
 */
router.post('/webhook', vapiWebhookAuth, async (req, res) => {
  const { message } = req.body;
  if (!message?.type) return res.status(400).json({ error: 'Missing message.type' });

  const { type, call } = message;
  const callId = call?.id;

  logger.debug({ event: 'vapi_webhook', type, callId });

  switch (type) {
    case 'assistant-request': {
      // Look up client by the Vapi phone number that received the inbound call.
      const phoneNumberId = call?.phoneNumber?.id;
      const clientConfig = phoneNumberId ? findClientByPhoneNumberId(phoneNumberId) : null;

      if (!clientConfig) {
        logger.warn({ event: 'unknown_phone_number', phoneNumberId, callId });
        return res.json({ assistant: buildAssistantConfig(null) });
      }

      if (clientConfig._meta?.planStatus !== 'active') {
        logger.warn({ event: 'inactive_client', clientId: clientConfig.clientId, callId });
        return res.json({
          assistant: {
            firstMessage: 'This service is temporarily unavailable. Please try again later.',
            model: { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', messages: [] },
            voice: { provider: '11labs', voiceId: 'sarah' }
          }
        });
      }

      logger.info({ event: 'call_started', clientId: clientConfig.clientId, callId });
      return res.json({ assistant: buildAssistantConfig(clientConfig) });
    }

    case 'function-call': {
      // The AI decided to call one of our defined tools.
      const { name, parameters } = message.functionCall ?? {};
      const clientId = call?.metadata?.clientId;

      let clientConfig = null;
      if (clientId) {
        try { clientConfig = loadClient(clientId); } catch { /* non-fatal */ }
      }

      try {
        const result = await dispatch(name, parameters, clientConfig, callId);
        return res.json({ result });
      } catch (err) {
        logger.error({ event: 'function_error', name, callId, error: err.message });
        return res.json({ result: 'I was unable to complete that action. Please try again.' });
      }
    }

    case 'end-of-call-report': {
      logCallEnd(message, call);
      return res.json({ received: true });
    }

    case 'status-update': {
      logger.info({ event: 'call_status', status: message.status, callId });
      return res.json({ received: true });
    }

    default:
      return res.json({ received: true });
  }
});

module.exports = router;
