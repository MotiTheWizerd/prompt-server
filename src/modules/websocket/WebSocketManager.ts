/**
 * WebSocketManager — singleton service managing the WebSocket connection.
 *
 * Responsibilities:
 *  - Connection lifecycle: connect, disconnect, auto-reconnect
 *  - Exponential backoff reconnection (1s → 2s → 4s → … → 30s cap)
 *  - Internal pub/sub for typed message handlers
 *  - Ping/keepalive to detect dead connections
 *  - Logger integration for consistent debugging
 *
 * Design:
 *  - Zero React dependency. Pure infrastructure.
 *  - Registered in DI as a lazy singleton (Tier 1.5).
 *  - React components consume via the useWebSocket hook.
 *  - Accepts a token-resolver function so every reconnect gets a fresh JWT.
 */

import { Logger } from "@/modules/core";
import {
  WS_CONFIG,
  type WSMessage,
  type WSMessageHandler,
  type WSConnectionState,
  type WSStateChangeCallback,
} from "./types";

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private log: Logger;

  // ---- Internal pub/sub ----
  private handlers = new Map<string, Set<WSMessageHandler>>();

  // ---- State ----
  private _state: WSConnectionState = "disconnected";
  private stateListeners = new Set<WSStateChangeCallback>();

  // ---- Reconnection ----
  private tokenResolver: (() => string | null) | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private intentionalClose = false;

  // ---- Ping/keepalive ----
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private awaitingPong = false;

  constructor(logger?: Logger) {
    this.log = logger ?? new Logger("websocket");
  }

  // ================================================================
  // Public API
  // ================================================================

  /** Current connection state. */
  get state(): WSConnectionState {
    return this._state;
  }

  /** Convenience boolean. */
  get isConnected(): boolean {
    return this._state === "connected";
  }

  /**
   * Open a WebSocket connection.
   * Accepts a token-resolver so every reconnect gets a fresh JWT.
   * If already connected, disconnects first.
   */
  connect(tokenResolver: () => string | null): void {
    if (this.ws) {
      this.log.warn("connect() called while already connected — disconnecting first");
      this.internalDisconnect();
    }

    this.tokenResolver = tokenResolver;
    this.intentionalClose = false;
    this.reconnectAttempt = 0;
    this.doConnect();
  }

  /**
   * Gracefully close the connection.
   * Suppresses reconnection. Clears all timers.
   */
  disconnect(): void {
    this.intentionalClose = true;
    this.internalDisconnect();
    this.log.info("Disconnected (intentional)");
  }

  /**
   * Subscribe to a specific server event type.
   * Returns an unsubscribe function (mirrors EventBus.on() convention).
   *
   * Use "*" to subscribe to all message types (wildcard).
   */
  on<T = Record<string, unknown>>(
    type: string,
    handler: WSMessageHandler<T>,
  ): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    const typedHandler = handler as WSMessageHandler;
    this.handlers.get(type)!.add(typedHandler);

    return () => {
      this.handlers.get(type)?.delete(typedHandler);
    };
  }

  /**
   * Send a typed message to the server.
   * Silently drops if not connected (logs a warning).
   */
  send(type: string, data: Record<string, unknown> = {}): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log.warn(`send() called while not connected — dropping "${type}"`);
      return;
    }
    this.ws.send(JSON.stringify({ type, data }));
    this.log.log(`→ ${type}`, data);
  }

  /**
   * Subscribe to connection state changes.
   * Returns an unsubscribe function.
   * Used by the React hook to sync isConnected into React state.
   */
  onStateChange(callback: WSStateChangeCallback): () => void {
    this.stateListeners.add(callback);
    return () => {
      this.stateListeners.delete(callback);
    };
  }

  /** Remove all message handlers. */
  clearHandlers(): void {
    this.handlers.clear();
  }

  // ================================================================
  // Connection internals
  // ================================================================

  private internalDisconnect(): void {
    this.clearReconnectTimer();
    this.stopPing();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close(1000, "client disconnect");
      this.ws = null;
    }
    this.setState("disconnected");
  }

  private doConnect(): void {
    const token = this.tokenResolver?.();
    if (!token) {
      this.log.warn("No token available — cannot connect");
      this.setState("disconnected");
      return;
    }

    this.setState("connecting");
    const url = `${WS_CONFIG.baseUrl}${WS_CONFIG.path}?token=${encodeURIComponent(token)}`;
    this.log.info(`Connecting…`);

    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      this.log.error("WebSocket constructor threw", err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = this.handleOpen;
    this.ws.onmessage = this.handleMessage;
    this.ws.onclose = this.handleClose;
    this.ws.onerror = this.handleError;
  }

  // ---- Event handlers (arrow fns for correct `this`) ----

  private handleOpen = (): void => {
    this.log.info("Connection opened");
    this.reconnectAttempt = 0;
    this.setState("connected");
    this.startPing();
  };

  private handleMessage = (event: MessageEvent): void => {
    let msg: WSMessage;
    try {
      msg = JSON.parse(event.data as string);
    } catch {
      this.log.warn("Received non-JSON message", event.data);
      return;
    }

    // Handle pong internally
    if (msg.type === "pong") {
      this.awaitingPong = false;
      this.clearPongTimeout();
      return;
    }

    this.log.log(`← ${msg.type}`, msg.data);

    // Dispatch to type-specific handlers
    this.dispatch(msg.type, msg.data);

    // Dispatch to wildcard handlers
    this.dispatch("*", msg.data);
  };

  private handleClose = (event: CloseEvent): void => {
    this.log.warn(`Connection closed: code=${event.code} reason="${event.reason}"`);
    this.ws = null;
    this.stopPing();
    this.setState("disconnected");

    if (!this.intentionalClose) {
      this.scheduleReconnect();
    }
  };

  private handleError = (): void => {
    // WebSocket error events carry no useful info — the close that follows
    // will trigger reconnection. Just log.
    this.log.error("WebSocket error");
  };

  // ---- Handler dispatch ----

  private dispatch(type: string, data: unknown): void {
    const set = this.handlers.get(type);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(data as Record<string, unknown>);
      } catch (err) {
        this.log.error(`Handler error for "${type}"`, err);
      }
    }
  }

  // ================================================================
  // Reconnection with exponential backoff
  // ================================================================

  private scheduleReconnect(): void {
    if (this.intentionalClose) return;

    const { initialDelayMs, maxDelayMs, backoffFactor } = WS_CONFIG.reconnect;
    const delay = Math.min(
      initialDelayMs * Math.pow(backoffFactor, this.reconnectAttempt),
      maxDelayMs,
    );

    this.log.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempt++;
      this.doConnect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ================================================================
  // Ping / keepalive
  // ================================================================

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send("ping", {});
        this.awaitingPong = true;
        this.pongTimer = setTimeout(() => {
          if (this.awaitingPong) {
            this.log.warn("Pong timeout — closing to trigger reconnect");
            this.ws?.close(4000, "pong timeout");
          }
        }, WS_CONFIG.pongTimeoutMs);
      }
    }, WS_CONFIG.pingIntervalMs);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    this.clearPongTimeout();
    this.awaitingPong = false;
  }

  private clearPongTimeout(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  // ================================================================
  // State management
  // ================================================================

  private setState(state: WSConnectionState): void {
    if (this._state === state) return;
    this._state = state;
    for (const listener of this.stateListeners) {
      try {
        listener(state);
      } catch (err) {
        this.log.error("State listener error", err);
      }
    }
  }
}
