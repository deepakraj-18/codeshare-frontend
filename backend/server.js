import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';

import { initSchema, closePool } from './db/connection.js';
import {
  getSession,
  sessionExists,
  addUser,
  removeUser,
  updateContent,
  getContent,
  getUserCount,
  loadPersistedContent,
  persistOnDisconnect,
} from './services/sessionService.js';
import { startAutosave, stopAutosave, stopAllAutosaves } from './services/autosaveService.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
};

app.use(cors(corsOptions));

const io = new Server(httpServer, {
  cors: corsOptions,
});

// Initialize database schema on startup
initSchema().catch((error) => {
  console.error('Failed to initialize database schema:', error);
  process.exit(1);
});

// Track which sessions each socket is in
const socketSessions = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socketSessions.set(socket.id, new Set());

  // Handle join-session
  socket.on('join-session', async (sessionId) => {
    if (!sessionId) {
      socket.emit('session-error', { message: 'Session ID is required' });
      return;
    }

    try {
      // Check if session is new or empty before loading persisted content
      const isNewSession = !sessionExists(sessionId);
      
      // Load persisted content only if session is new or empty
      if (isNewSession) {
        // Session doesn't exist, load persisted content (will create session if needed)
        await loadPersistedContent(sessionId);
      } else {
        // Session exists, check if it's empty
        const existingSession = getSession(sessionId);
        if (!existingSession.content || existingSession.content === '') {
          // Session exists but is empty, try to load persisted content
          await loadPersistedContent(sessionId);
        }
        // If session exists with content, don't load from storage
      }
      
      // Get session (now guaranteed to exist)
      const session = getSession(sessionId);
      
      // Add user to session
      const userCount = addUser(sessionId, socket.id);

      // Start autosave for this session (idempotent - only starts if not running)
      startAutosave(sessionId);

      // Join socket room
      socket.join(sessionId);
      
      // Track this socket's session
      socketSessions.get(socket.id).add(sessionId);

      // Send session-joined event with current content
      socket.emit('session-joined', {
        content: session.content,
        userCount,
      });

      // Broadcast user count update to other users in session
      socket.to(sessionId).emit('user-count-update', { userCount });

      console.log(`User ${socket.id} joined session ${sessionId}`);
    } catch (error) {
      console.error(`Error joining session ${sessionId}:`, error);
      socket.emit('session-error', {
        message: 'Failed to join session',
      });
    }
  });

  // Handle code-change
  socket.on('code-change', ({ sessionId, content }) => {
    if (!sessionId) {
      socket.emit('session-error', { message: 'Session ID is required' });
      return;
    }

    try {
      // Update in-memory content
      updateContent(sessionId, content);

      // Broadcast to other users in the session (not the sender)
      socket.to(sessionId).emit('code-update', {
        content,
      });

      console.log(`Code updated for session ${sessionId} by ${socket.id}`);
    } catch (error) {
      console.error(`Error handling code-change for session ${sessionId}:`, error);
      socket.emit('session-error', {
        message: 'Failed to update code',
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id);

    // Get all sessions this socket was in
    const sessions = socketSessions.get(socket.id) || new Set();
    
    // Remove socket from all sessions
    for (const sessionId of sessions) {
      const userCount = removeUser(sessionId, socket.id);
      
      if (userCount === 0) {
        // Last user left, persist content and stop autosave
        await persistOnDisconnect(sessionId);
        stopAutosave(sessionId);
      } else {
        // Broadcast user count update
        io.to(sessionId).emit('user-count-update', { userCount });
      }
    }
    
    // Clean up socket session tracking
    socketSessions.delete(socket.id);
  });
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  
  // Stop all autosave intervals
  stopAllAutosaves();
  
  // Persist all active sessions
  // Note: This would require iterating through all sessions
  // For now, autosave handles regular persistence
  
  // Close database pool
  await closePool();
  
  // Close HTTP server
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
});

