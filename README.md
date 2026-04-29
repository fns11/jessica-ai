# Jessica AI — White-Label Voice Receptionist SaaS

A production-ready AI voice receptionist backend. Each client gets a fully personalized AI agent in their brand's name, voice, and style.

**Stack:** Node.js + Express · Vapi.ai (voice) · Claude Sonnet (brain) · Stripe (billing)  
**Price point:** $99/mo per client · ~$3–8/mo in API costs at typical usage

---

## Architecture

```
Inbound call
    │
    ▼
Vapi.ai phone number  ──► POST /api/vapi/webhook
                               │
                               ├─ configLoader  ──► src/config/clients/<id>.json
                               │
                               ├─ promptEngine  ──► builds Claude system prompt
                               │
                               ├─ callHandler   ──► Anthropic Messages API
                               │
                               └─ sessionManager ──► in-memory multi-turn history
                                    │
                                    ▼
                              JSON { response: "..." }
                                    │
                                    ▼
                           Vapi speaks the reply to caller
```

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/jessica-ai.git
cd jessica-ai
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your real keys
```

Required keys:
| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `VAPI_API_KEY` | app.vapi.ai → Account |
| `VAPI_WEBHOOK_SECRET` | Vapi dashboard → Webhooks |
| `STRIPE_SECRET_KEY` | dashboard.stripe.com |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks |
| `STRIPE_PRICE_ID` | Create a $99/mo recurring price in Stripe |
| `API_SECRET` | Any random string — protects `/api/clients` |
| `APP_URL` | Your public URL (e.g. `https://jessica-ai.yourserver.com`) |

### 3. Create your first client

```bash
# Generates a client config from the template
node scripts/seed-client.js my-dental-client "Sunrise Family Dental" "Jessica"
# Edit the generated file:
# src/config/clients/my-dental-client.json
```

### 4. Run locally

```bash
npm run dev       # nodemon — hot reload
# or
npm start         # production
```

### 5. Expose to Vapi (local dev)

```bash
npx ngrok http 3000
# Copy the https URL → use it as your Vapi webhook URL
```

---

## Vapi Setup

1. Log in at [app.vapi.ai](https://app.vapi.ai)
2. **Create an Assistant:**
   - Type: **Custom** (not a template)
   - Server URL: `https://yourserver.com/api/vapi/webhook`
   - First message: `"Thank you for calling [Business Name], this is Jessica — how can I help you today?"`
3. **Set metadata on the assistant:**
   ```json
   { "clientId": "my-dental-client" }
   ```
   This tells Jessica which client config to load for each call.
4. **Buy / assign a phone number** in Vapi and point it to your assistant.
5. Client sets call forwarding on their existing number to the Vapi number.

---

## Stripe Setup

1. Create a **Product** in Stripe: "Jessica AI Receptionist"
2. Add a **Price**: $99.00 · Recurring · Monthly
3. Copy the `price_...` ID → set as `STRIPE_PRICE_ID` in `.env`
4. Add a webhook endpoint in Stripe:
   - URL: `https://yourserver.com/api/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
5. Copy the webhook signing secret → `STRIPE_WEBHOOK_SECRET`

---

## Client Config Schema

Located at `src/config/clients/<clientId>.json`. Full reference:

```json
{
  "clientId":               "unique-slug",
  "businessName":           "Display name spoken on every call",
  "agentName":              "Jessica (or any name you white-label)",
  "industry":               "dental / legal / real estate / etc.",
  "timezone":               "America/New_York",
  "tone":                   "Free-text personality instruction for Claude",
  "businessHours": {
    "Monday": "9:00 AM – 5:00 PM"
  },
  "services":               ["Array of service strings"],
  "faqs": [
    { "question": "...", "answer": "..." }
  ],
  "appointmentInstructions": "What info to collect and how to confirm",
  "escalationNumber":       "Phone number for urgent/complex calls",
  "closingStatement":       "Final line Jessica says before hanging up",
  "customInstructions":     "Any extra rules — industry-specific, legal disclaimers, etc.",
  "_meta": {
    "stripeCustomerId":     "cus_...",
    "planStatus":           "active",
    "vapiPhoneNumberId":    "pn_...",
    "usageCapUSD":          20
  }
}
```

---

## API Reference

### Internal API (requires `Authorization: Bearer <API_SECRET>`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/clients` | List all client IDs |
| `GET` | `/api/clients/:id` | Get a client config |
| `POST` | `/api/clients` | Create a new client |
| `PUT` | `/api/clients/:id` | Update a client config |
| `DELETE` | `/api/clients/:id` | Delete a client |

### Public API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/billing/checkout` | Start Stripe checkout (`{ email, clientId }`) |
| `POST` | `/api/billing/webhook` | Stripe event webhook |
| `POST` | `/api/vapi/webhook` | Vapi call events |
| `GET` | `/health` | Health check |

---

## Deployment (VPS / DigitalOcean Droplet)

```bash
# On your server
git clone ... && cd jessica-ai
npm install --production
cp .env.example .env && nano .env   # fill in keys

# Run with PM2
npm install -g pm2
pm2 start server.js --name jessica-ai
pm2 save
pm2 startup

# Reverse proxy with nginx
# Point yourdomain.com → localhost:3000
```

Minimum server spec: **1 vCPU, 1 GB RAM** (same server as Hermes is fine).

---

## Cost Model

| Item | Cost |
|---|---|
| Vapi voice calls | ~$0.05–0.09/min (Vapi + telephony) |
| Claude Sonnet API | ~$0.003/call turn (cached prompt) |
| Server | $6–12/mo (shared VPS) |
| **Revenue per client** | **$99/mo** |
| **Break-even** | ~200 minutes/mo per client |
| **Margin at avg usage (60 min/mo)** | **~$85/client** |

Set `usageCapUSD` in `_meta` to auto-flag high-usage clients before costs spiral.

---

## Scaling Notes

- **Session store:** Swap `sessionManager.js` Map for Redis once you exceed ~50 concurrent calls.
- **Config store:** Replace JSON files with a database (Postgres/Supabase) once you have 20+ clients.
- **Billing automation:** Wire `handleWebhookEvent` in `stripe.js` to update `planStatus` automatically (currently logs only).
- **Multi-region:** Vapi handles call routing — just deploy the Express backend in multiple regions behind a load balancer.

---

## License

MIT
