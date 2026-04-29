function validateClientConfig(config) {
  const required = ['clientId', 'businessName', 'agentName', 'timezone'];
  const missing = required.filter(k => !config[k]);
  if (missing.length) throw new Error(`Client config missing fields: ${missing.join(', ')}`);
}

function validateWebhookPayload(body) {
  if (!body || !body.message) throw new Error('Invalid Vapi webhook payload');
}

module.exports = { validateClientConfig, validateWebhookPayload };
