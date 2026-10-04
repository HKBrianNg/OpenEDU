// worker/src/routes/logStore.js
export const LOG_STORE = new Map();
const MAX_LOGS = 500;

export function storeLog(log) {
  LOG_STORE.set(log.id, log);
  if (LOG_STORE.size > MAX_LOGS) {
    const oldestKey = LOG_STORE.keys().next().value;
    LOG_STORE.delete(oldestKey);
  }
}