const crypto = require('crypto');

/**
 * Verifies the Vapi webhook signature.
 * Vapi sends X-Vapi-Signature as HMAC-SHA256 of the raw body.
 */
function vapiWebhookAuth(req, res, next) {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) return next(); // Skip in dev if not configured

  const signature = req.headers['x-vapi-signature'];
  if (!signature) return res.status(401).json({ error: 'Missing signature' });

  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  next();
}

/**
 * Simple bearer token auth for internal client management API.
 */
function internalAuth(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token || token !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

module.exports = { vapiWebhookAuth, internalAuth };
