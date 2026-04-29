const express = require('express');
const { createCheckoutSession, handleWebhookEvent } = require('../../billing/stripe');
const logger = require('../../utils/logger');

const router = express.Router();

// POST /api/billing/checkout — start $99/mo Stripe checkout
router.post('/checkout', async (req, res) => {
  const { email, clientId } = req.body;
  if (!email || !clientId) {
    return res.status(400).json({ error: 'email and clientId required' });
  }
  try {
    const session = await createCheckoutSession(email, clientId);
    res.json({ url: session.url });
  } catch (err) {
    logger.error({ event: 'checkout_error', error: err.message });
    res.status(500).json({ error: 'Could not create checkout session' });
  }
});

// POST /api/billing/webhook — Stripe webhook (raw body required)
router.post('/webhook', async (req, res) => {
  const signature = req.headers['stripe-signature'];
  try {
    await handleWebhookEvent(req.body, signature);
    res.json({ received: true });
  } catch (err) {
    logger.error({ event: 'stripe_webhook_error', error: err.message });
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
