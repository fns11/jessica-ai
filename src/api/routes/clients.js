const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { internalAuth } = require('../middleware/auth');
const { loadClient, reloadClient, listClients } = require('../../config/configLoader');
const { validateClientConfig } = require('../../utils/validators');
const logger = require('../../utils/logger');

const router = express.Router();
const CLIENTS_DIR = path.join(__dirname, '../../config/clients');

// All routes require internal auth
router.use(internalAuth);

// GET /api/clients — list all client IDs
router.get('/', (req, res) => {
  res.json({ clients: listClients() });
});

// GET /api/clients/:id — get client config
router.get('/:id', (req, res) => {
  try {
    const config = loadClient(req.params.id);
    res.json(config);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/clients — create new client
router.post('/', (req, res) => {
  const clientId = req.body.clientId || uuidv4();
  const config = { ...req.body, clientId };

  try {
    validateClientConfig(config);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const filePath = path.join(CLIENTS_DIR, `${clientId}.json`);
  if (fs.existsSync(filePath)) {
    return res.status(409).json({ error: 'Client already exists' });
  }

  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  logger.info({ event: 'client_created', clientId });
  res.status(201).json({ clientId });
});

// PUT /api/clients/:id — update client config
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const filePath = path.join(CLIENTS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Client not found' });
  }

  const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const updated = { ...existing, ...req.body, clientId: id };

  try {
    validateClientConfig(updated);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
  reloadClient(id);
  logger.info({ event: 'client_updated', clientId: id });
  res.json({ updated: true });
});

// DELETE /api/clients/:id — remove client
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const filePath = path.join(CLIENTS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Client not found' });
  }
  fs.unlinkSync(filePath);
  logger.info({ event: 'client_deleted', clientId: id });
  res.json({ deleted: true });
});

module.exports = router;
