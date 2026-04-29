require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const logger = require('./src/utils/logger');

const vapiRoutes = require('./src/api/routes/vapi');
const billingRoutes = require('./src/api/routes/billing');
const clientRoutes = require('./src/api/routes/clients');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());

// Raw body for Stripe webhook signature verification — must come before json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/vapi', vapiRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/clients', clientRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use((err, req, res, next) => {
  logger.error({ message: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => logger.info(`Jessica AI running on port ${PORT}`));
