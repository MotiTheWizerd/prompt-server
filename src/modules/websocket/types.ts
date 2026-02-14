/**
 * WebSocket protocol types and configuration constants.
 *
 * The server sends/receives messages as JSON: { type: string, data: Record<string, any> }
 */

// ---- Wire Protocol ----

/** Inbound message from the server. */
export interface WSMessage<T = Record<string, unknown>> {
  type: string;
  data: T;
}

// ---- Handler Type ----

export type WSMessageHandler<T = Record<string, unknown>> = (data: T) => void;

// ---- Connection State ----

export type WSConnectionState = "disconnected" | "connecting" | "connected";

// ---- State Change Callback ----

export type WSStateChangeCallback = (state: WSConnectionState) => void;

// ---- Configuration ----

export const WS_CONFIG = {
  /** Base URL — reads from env, falls back to localhost for dev. */
  baseUrl:
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"
      : "",

  /** Path appended to base URL. */
  path: "/api/v1/ws",

  /** Reconnection backoff schedule. */
  reconnect: {
    initialDelayMs: 1_000,
    maxDelayMs: 30_000,
    backoffFactor: 2,
  },

  /** Client-initiated ping interval. */
  pingIntervalMs: 25_000,

  /** How long to wait for a pong before considering connection dead. */
  pongTimeoutMs: 5_000,
} as const;
