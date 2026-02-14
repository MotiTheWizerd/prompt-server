"use client";

/**
 * useWebSocket — React hook wrapping WebSocketManager.
 *
 * Returns { on, send, isConnected } — a simple API for components
 * to subscribe to server events and send messages.
 *
 * The hook does NOT own the connection. It resolves the DI-managed singleton
 * and syncs connection state into React via useSyncExternalStore.
 *
 * Usage:
 *   const { on, send, isConnected } = useWebSocket();
 *
 *   useEffect(() => {
 *     const unsub = on("execution.node.completed", (data) => { ... });
 *     return unsub;
 *   }, [on]);
 *
 *   send("execution.start", { flow_id: "abc", nodes: [...] });
 */

import { useCallback, useSyncExternalStore } from "react";
import { useService, TOKENS } from "@/modules/core/di";
import type { WebSocketManager } from "@/modules/websocket";
import type { WSMessageHandler } from "@/modules/websocket";

export interface UseWebSocketReturn {
  /** Subscribe to a server event type. Returns an unsubscribe function. */
  on: <T = Record<string, unknown>>(type: string, handler: WSMessageHandler<T>) => () => void;
  /** Send a typed message to the server. */
  send: (type: string, data?: Record<string, unknown>) => void;
  /** Whether the WebSocket is currently connected. */
  isConnected: boolean;
}

/** SSR snapshot — always false on server. */
const SERVER_SNAPSHOT = false;

export function useWebSocket(): UseWebSocketReturn {
  const manager = useService<WebSocketManager>(TOKENS.WebSocketManager);

  // Sync connection state via useSyncExternalStore (React 19 best practice)
  const isConnected = useSyncExternalStore(
    (onStoreChange) => manager.onStateChange(() => onStoreChange()),
    () => manager.isConnected,
    () => SERVER_SNAPSHOT,
  );

  // Stable refs — manager is a DI singleton, so these never change
  const on = useCallback(
    <T = Record<string, unknown>>(type: string, handler: WSMessageHandler<T>) => {
      return manager.on(type, handler);
    },
    [manager],
  );

  const send = useCallback(
    (type: string, data: Record<string, unknown> = {}) => {
      manager.send(type, data);
    },
    [manager],
  );

  return { on, send, isConnected };
}
