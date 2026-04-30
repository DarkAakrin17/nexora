import { io } from 'socket.io-client';

let socket = null;

export function initSocket(token) {
  if (socket) socket.disconnect();

  // In prod, VITE_API_URL is the Render backend URL
  // In dev, socket connects to same origin (Vite proxies /socket.io)
  const serverUrl = import.meta.env.VITE_API_URL || window.location.origin;

  socket = io(serverUrl, {
    auth: { token },
    transports: ['websocket'], // Force websocket to avoid sticky-session polling issues on Render
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => console.log('🔌 Socket connected'));
  socket.on('disconnect', (reason) => console.log('🔌 Socket disconnected:', reason));
  socket.on('connect_error', (err) => console.error('Socket error:', err.message));

  return socket;
}

export function getSocket() { return socket; }

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}
