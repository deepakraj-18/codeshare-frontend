import { io } from 'socket.io-client';

// Socket.IO client instance
let socket = null;

/**
 * Initialize and connect to Socket.IO server
 * @param {string} serverUrl - Socket.IO server URL
 * @returns {Object} Socket instance
 */
export const initSocket = (serverUrl) => {
  if (socket && socket.connected) {
    return socket;
  }

  socket = io(serverUrl, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socket;
};

/**
 * Get the current socket instance
 * @returns {Object|null} Socket instance or null
 */
export const getSocket = () => {
  return socket;
};

/**
 * Disconnect the socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

