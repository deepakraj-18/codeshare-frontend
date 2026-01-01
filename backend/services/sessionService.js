import { getPool } from '../db/connection.js';
import { saveContent, loadContent } from '../storage/r2Storage.js';

// In-memory session storage (source of truth during active sessions)
const sessions = new Map();

/**
 * Check if a session exists (without creating it)
 * @param {string} sessionId - Session ID
 * @returns {boolean} True if session exists
 */
export const sessionExists = (sessionId) => {
  return sessions.has(sessionId);
};

/**
 * Get or create a session
 * @param {string} sessionId - Session ID
 * @returns {Object} Session object
 */
export const getSession = (sessionId) => {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      content: '',
      users: new Set(),
      lastSaved: null,
    });
  }
  return sessions.get(sessionId);
};

/**
 * Add user to session
 * @param {string} sessionId - Session ID
 * @param {string} socketId - Socket ID
 */
export const addUser = (sessionId, socketId) => {
  const session = getSession(sessionId);
  session.users.add(socketId);
  return session.users.size;
};

/**
 * Remove user from session
 * @param {string} sessionId - Session ID
 * @param {string} socketId - Socket ID
 */
export const removeUser = (sessionId, socketId) => {
  const session = sessions.get(sessionId);
  if (session) {
    session.users.delete(socketId);
    return session.users.size;
  }
  return 0;
};

/**
 * Update session content
 * @param {string} sessionId - Session ID
 * @param {string} content - New content
 */
export const updateContent = (sessionId, content) => {
  const session = getSession(sessionId);
  session.content = content || '';
  return session;
};

/**
 * Get session content
 * @param {string} sessionId - Session ID
 * @returns {string} Session content
 */
export const getContent = (sessionId) => {
  const session = sessions.get(sessionId);
  return session ? session.content : '';
};

/**
 * Get user count for a session
 * @param {string} sessionId - Session ID
 * @returns {number} User count
 */
export const getUserCount = (sessionId) => {
  const session = sessions.get(sessionId);
  return session ? session.users.size : 0;
};

/**
 * Load persisted content from storage and update in-memory session
 * Only updates if session doesn't exist or session content is empty
 * @param {string} sessionId - Session ID
 * @returns {Promise<string>} Loaded content (empty string if not found or not loaded)
 */
export const loadPersistedContent = async (sessionId) => {
  try {
    // Check if session exists and has content - don't overwrite active content
    const existingSession = sessions.get(sessionId);
    if (existingSession && existingSession.content && existingSession.content !== '') {
      // Session exists with content, don't load from storage
      return existingSession.content;
    }

    // Try to load from R2
    const content = await loadContent(sessionId);
    
    if (content !== null) {
      // Update in-memory session (only if it was empty or didn't exist)
      const session = getSession(sessionId);
      session.content = content;
      session.lastSaved = new Date();
      return content;
    }

    // No persisted content found, return empty string
    return '';
  } catch (error) {
    console.error(`Error loading persisted content for session ${sessionId}:`, error);
    // On error, return empty string (fallback)
    return '';
  }
};

/**
 * Persist session content to storage
 * @param {string} sessionId - Session ID
 * @returns {Promise<void>}
 */
export const persistContent = async (sessionId) => {
  const session = sessions.get(sessionId);
  
  if (!session) {
    return;
  }

  try {
    // Save content to R2
    await saveContent(sessionId, session.content);

    // Update database metadata
    const pool = getPool();
    const contentKey = `sessions/${sessionId}/content.txt`;
    const now = new Date();

    await pool.query(
      `INSERT INTO sessions (id, content_key, last_saved_at, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) 
       DO UPDATE SET content_key = $2, last_saved_at = $3, updated_at = $4`,
      [sessionId, contentKey, now, now]
    );

    session.lastSaved = now;
    console.log(`Content persisted for session: ${sessionId}`);
  } catch (error) {
    console.error(`Error persisting content for session ${sessionId}:`, error);
    // Don't throw - persistence failures should not break realtime editing
  }
};

/**
 * Persist content on disconnect
 * @param {string} sessionId - Session ID
 * @returns {Promise<void>}
 */
export const persistOnDisconnect = async (sessionId) => {
  const session = sessions.get(sessionId);
  
  if (session && session.users.size === 0) {
    // Last user disconnected, persist content
    await persistContent(sessionId);
  }
};

