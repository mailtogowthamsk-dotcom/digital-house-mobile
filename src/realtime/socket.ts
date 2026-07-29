import { io, Socket } from "socket.io-client";
import { getTokenReliable } from "../storage/token.storage";
import { getServerBaseUrl } from "../api/client";
import { runRealtimeRewires, runRealtimeTeardowns } from "./teardown";

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

/** Current socket instance without creating/connecting (for sync listener attach). */
export function getSocketInstance(): Socket | null {
  return socket;
}

type GetSocketOptions = {
  /**
   * When false, return the socket instance immediately without waiting for connect.
   * Use this so presence/chat can attach listeners before the handshake snapshot fires.
   */
  waitForConnection?: boolean;
};

/**
 * Authenticated Socket.IO client. Recreates when token changes or connection is dead.
 * By default waits briefly for connect; pass waitForConnection:false to attach listeners first.
 */
export async function getSocket(opts?: GetSocketOptions): Promise<Socket> {
  const token = await getTokenReliable().catch(() => null);
  if (!token) {
    throw new Error("Not signed in");
  }

  const waitForConnection = opts?.waitForConnection !== false;
  let replaced = false;

  if (socket && socketToken !== token) {
    teardownSocket();
    replaced = true;
  }

  if (socket) {
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
      if (waitForConnection) {
        try {
          await waitForConnect(socket);
        } catch {
          /* return socket anyway — reconnect will finish later */
        }
      }
    }
    return socket;
  }

  socketToken = token;
  socket = io(getServerBaseUrl(), {
    transports: ["websocket", "polling"],
    // Fall back to polling if the WebSocket handshake fails (default is false in
    // v4.8). Keeps realtime alive on networks / reverse proxies that block WS.
    tryAllTransports: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5_000,
    auth: { token }
  });

  /**
   * Re-arm every realtime module on each successful (re)connect. Module wiring
   * can fail — no token yet on resume, a handshake that never completes — and
   * the re-arm listener each module installs lives on the socket it failed to
   * wire. Owning that listener here is what makes recovery unconditional, so an
   * open ChatScreen can never end up permanently deaf.
   */
  socket.on("connect", () => {
    if (__DEV__) console.log("[socket] connected", socket?.id);
    runRealtimeRewires();
  });

  if (__DEV__) {
    socket.on("disconnect", (reason) => console.log("[socket] disconnected", reason));
    socket.on("connect_error", (err) => console.log("[socket] connect_error", err?.message));
  }

  // Attach module listeners BEFORE waiting — otherwise presence:snapshot is lost.
  // Always run them: teardown is unconditional, so a conditional rewire leaves
  // whichever modules did not trigger this call detached with nothing to restore them.
  runRealtimeRewires();

  if (replaced && __DEV__) {
    console.log("[socket] recreated after token change");
  }

  if (waitForConnection) {
    try {
      await waitForConnect(socket);
    } catch {
      /* allow listeners to attach; reconnect continues in background */
    }
  }

  return socket;
}
