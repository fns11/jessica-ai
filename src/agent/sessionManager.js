/**
 * In-memory session store for active call conversation histories.
 * For production at scale, swap the Map for Redis with a short TTL.
 */
const sessions = new Map();

// Auto-expire sessions after 30 minutes of inactivity
const TTL_MS = 30 * 60 * 1000;
const timers = new Map();

function _resetTimer(callId) {
  if (timers.has(callId)) clearTimeout(timers.get(callId));
  timers.set(callId, setTimeout(() => deleteHistory(callId), TTL_MS));
}

function getHistory(callId) {
  _resetTimer(callId);
  if (!sessions.has(callId)) sessions.set(callId, []);
  return sessions.get(callId);
}

function setHistory(callId, history) {
  sessions.set(callId, history);
  _resetTimer(callId);
}

function deleteHistory(callId) {
  sessions.delete(callId);
  if (timers.has(callId)) {
    clearTimeout(timers.get(callId));
    timers.delete(callId);
  }
}

function activeCount() {
  return sessions.size;
}

module.exports = { getHistory, setHistory, deleteHistory, activeCount };
