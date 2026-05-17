import { io, Socket } from "socket.io-client";
import { getToken } from "../storage/token.storage";
import { SERVER_BASE } from "../api/client";

let socket: Socket | null = null;
let socketToken: string | null = null;

function teardownSocket() {
  if (!socket) return;
  try {
    socket.removeAllListeners();
    socket.disconnect();
  } catch {
    // ignore
  }
  socket = null;
  socketToken = null;
}

/** Drop connection (e.g. logout). Next getSocket() creates a fresh client. */
export function disconnectSocket() {
  teardownSocket();
}

/**
 * Authenticated Socket.IO client. Recreates when token changes or connection is dead.
 */
export async function getSocket(): Promise<Socket> {
  const token = await getToken().catch(() => null);
  if (!token) {
    throw new Error("Not signed in");
  }

  if (socket && socketToken !== token) {
    teardownSocket();
  }

  if (socket && !socket.connected) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  if (socket?.connected) {
    return socket;
  }

  socketToken = token;
  socket = io(SERVER_BASE, {
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    auth: { token }
  });

  return socket;
}
