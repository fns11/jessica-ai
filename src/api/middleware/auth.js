const crypto = require('crypto');

// Vapi sends the raw secret in x-vapi-secret (not an HMAC signature).
function vapiWebhookAuth(req, res, next) {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) return next();

  const provided = req.headers['x-vapi-secret'];
  if (!provided) return res.status(401).json({ error: 'Missing signature' });

  const a = Buffer.from(secret);
  const b = Buffer.from(provided);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
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
