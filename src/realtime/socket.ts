import { io, Socket } from "socket.io-client";
import { getTokenReliable } from "../storage/token.storage";
import { getServerBaseUrl } from "../api/client";
import { runRealtimeTeardowns } from "./teardown";

let socket: Socket | null = null;
let socketToken: string | null = null;

function teardownSocket() {
  if (!socket) return;
  try {
    runRealtimeTeardowns();
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

function waitForConnect(sock: Socket, timeoutMs = 4_000): Promise<void> {
  if (sock.connected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Socket connect timeout"));
    }, timeoutMs);

    const onConnect = () => {
      cleanup();
      resolve();
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    const cleanup = () => {
      clearTimeout(timer);
      sock.off("connect", onConnect);
      sock.off("connect_error", onError);
    };

    sock.once("connect", onConnect);
    sock.once("connect_error", onError);
  });
}

/**
 * Authenticated Socket.IO client. Recreates when token changes or connection is dead.
 * Returns the socket quickly; connection may still be in progress (listeners still work).
 */
export async function getSocket(): Promise<Socket> {
  const token = await getTokenReliable().catch(() => null);
  if (!token) {
    throw new Error("Not signed in");
  }

  if (socket && socketToken !== token) {
    teardownSocket();
  }

  if (socket) {
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
      try {
        await waitForConnect(socket);
      } catch {
        /* return socket anyway — reconnect will finish later */
      }
    }
    return socket;
  }

  socketToken = token;
  socket = io(getServerBaseUrl(), {
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5_000,
    auth: { token }
  });

  if (__DEV__) {
    socket.on("connect", () => console.log("[socket] connected", socket?.id));
    socket.on("disconnect", (reason) => console.log("[socket] disconnected", reason));
    socket.on("reconnect", (n) => console.log("[socket] reconnected", n));
  }

  try {
    await waitForConnect(socket);
  } catch {
    /* allow listeners to attach; reconnect continues in background */
  }
  return socket;
}
