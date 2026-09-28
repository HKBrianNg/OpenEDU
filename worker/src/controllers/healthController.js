// src/controllers/healthController.js
import { json } from '../routes/index.js';
import { VERSION, RELEASE_NOTES } from '../constants/version.js';

export const healthController = async ({ lang }) => {
  return json({
    status: 'ok',
    version: VERSION,
    releaseNotes: RELEASE_NOTES[VERSION] || null,
    timestamp: new Date().toISOString(),
  });
};