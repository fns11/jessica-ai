const fs = require('fs');
const path = require('path');
const { validateClientConfig } = require('../utils/validators');
const logger = require('../utils/logger');

const CLIENTS_DIR = path.join(__dirname, 'clients');
const cache = new Map();

function loadClient(clientId) {
  if (cache.has(clientId)) return cache.get(clientId);

  const filePath = path.join(CLIENTS_DIR, `${clientId}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`No config found for client: ${clientId}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const config = JSON.parse(raw);
  validateClientConfig(config);

  cache.set(clientId, config);
  logger.debug({ event: 'config_loaded', clientId });
  return config;
}

// Call after updating a client's JSON to pick up changes without restart
function reloadClient(clientId) {
  cache.delete(clientId);
  return loadClient(clientId);
}

function listClients() {
  return fs
    .readdirSync(CLIENTS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}

function findClientByPhoneNumberId(phoneNumberId) {
  for (const clientId of listClients()) {
    try {
      const config = loadClient(clientId);
      if (config._meta?.vapiPhoneNumberId === phoneNumberId) return config;
    } catch { /* skip malformed configs */ }
  }
  return null;
}

module.exports = { loadClient, reloadClient, listClients, findClientByPhoneNumberId };
