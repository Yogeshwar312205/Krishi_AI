import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/**
 * One socket for the whole app, opened on first use.
 *
 * Every component that wanted live updates used to open its own connection. On
 * the fleet owner's Jobs screen that is one socket per job card, all carrying
 * the same broadcast — which is both wasteful and a good way to hit a
 * connection limit on a phone.
 *
 * Never disconnected on unmount, deliberately: the next screen wants it, and a
 * connection that tears down and re-establishes on every tab change is how you
 * miss the fix that arrives in between.
 */
let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
  }
  return socket;
};

export default getSocket;
