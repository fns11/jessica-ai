const Stripe = require('stripe');
const logger = require('../utils/logger');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createCheckoutSession(email, clientId) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: email,
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1
      }
    ],
    metadata: { clientId },
    success_url: `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/#pricing`
  });
  return session;
}

async function cancelSubscription(subscriptionId) {
  return stripe.subscriptions.cancel(subscriptionId);
}

async function getCustomer(customerId) {
  return stripe.customers.retrieve(customerId);
}

/**
 * Handles Stripe webhook events.
 * Updates _meta.planStatus in the client config file on subscription changes.
 */
async function handleWebhookEvent(rawBody, signature) {
  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  const { type, data } = event;
  logger.info({ event: 'stripe_webhook', type });

  switch (type) {
    case 'checkout.session.completed': {
      const clientId = data.object.metadata?.clientId;
      logger.info({ event: 'subscription_activated', clientId });
      // TODO: write planStatus: 'active' to client config file or database
      break;
    }
    case 'customer.subscription.deleted':
    case 'invoice.payment_failed': {
      const clientId = data.object.metadata?.clientId;
      logger.warn({ event: 'subscription_deactivated', clientId, reason: type });
      // TODO: write planStatus: 'inactive' to client config file or database
      break;
    }
  }

  return event;
}

module.exports = { createCheckoutSession, cancelSubscription, getCustomer, handleWebhookEvent };
