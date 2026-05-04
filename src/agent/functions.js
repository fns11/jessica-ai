const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const PENDING_DIR = path.join(__dirname, '../../data/pending');

function _save(type, clientId, callId, payload) {
  if (!fs.existsSync(PENDING_DIR)) fs.mkdirSync(PENDING_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${type}_${clientId || 'unknown'}_${ts}.json`;
  const record = { type, clientId, callId, timestamp: new Date().toISOString(), ...payload };
  fs.writeFileSync(path.join(PENDING_DIR, filename), JSON.stringify(record, null, 2));
  logger.info({ event: `${type}_saved`, clientId, callId, filename });
  return record;
}

async function takeMessage({ callerName, callerPhone, message }, clientConfig, callId) {
  _save('message', clientConfig?.clientId, callId, { callerName, callerPhone, message });
  return `I've recorded your message, ${callerName}. Someone will get back to you at ${callerPhone} as soon as possible.`;
}

async function bookAppointment({ callerName, callerPhone, appointmentType, preferredDate, notes }, clientConfig, callId) {
  _save('appointment', clientConfig?.clientId, callId, {
    callerName, callerPhone, appointmentType, preferredDate, notes: notes || ''
  });
  return `Perfect, ${callerName}! I've noted your ${appointmentType} request for ${preferredDate}. The team will call you at ${callerPhone} within one business day to confirm. Is there anything else I can help you with?`;
}

async function dispatch(name, parameters, clientConfig, callId) {
  switch (name) {
    case 'takeMessage':    return takeMessage(parameters, clientConfig, callId);
    case 'bookAppointment': return bookAppointment(parameters, clientConfig, callId);
    default:
      logger.warn({ event: 'unknown_function', name, callId });
      return 'I was unable to complete that action. Please try again.';
  }
}

module.exports = { dispatch };
