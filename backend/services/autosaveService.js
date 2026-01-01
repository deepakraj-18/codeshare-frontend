import { persistContent } from './sessionService.js';

// Autosave interval in milliseconds (10 seconds)
const AUTOSAVE_INTERVAL = 10000;

// Map of session IDs to their autosave intervals
const autosaveIntervals = new Map();

/**
 * Start autosave for a session
 * @param {string} sessionId - Session ID
 */
export const startAutosave = (sessionId) => {
  // Only start if autosave is not already running for this session
  if (autosaveIntervals.has(sessionId)) {
    return;
  }

  // Start new interval
  const interval = setInterval(async () => {
    try {
      await persistContent(sessionId);
    } catch (error) {
      console.error(`Autosave error for session ${sessionId}:`, error);
      // Continue autosave even on error
    }
  }, AUTOSAVE_INTERVAL);

  autosaveIntervals.set(sessionId, interval);
  console.log(`Autosave started for session: ${sessionId}`);
};

/**
 * Stop autosave for a session
 * @param {string} sessionId - Session ID
 */
export const stopAutosave = (sessionId) => {
  const interval = autosaveIntervals.get(sessionId);
  if (interval) {
    clearInterval(interval);
    autosaveIntervals.delete(sessionId);
    console.log(`Autosave stopped for session: ${sessionId}`);
  }
};

/**
 * Stop all autosave intervals (cleanup on server shutdown)
 */
export const stopAllAutosaves = () => {
  for (const [sessionId, interval] of autosaveIntervals.entries()) {
    clearInterval(interval);
  }
  autosaveIntervals.clear();
  console.log('All autosave intervals stopped');
};

