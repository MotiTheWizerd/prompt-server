"use client";

/**
 * AppProviders — client-side provider wrapper for the root layout.
 *
 * Bootstraps the DI container once and wraps children with <DIProvider>.
 * Connects the WebSocket when the user is authenticated.
 *
 * IMPORTANT: This is the root component — never subscribe to stores via
 * React hooks here (causes full-tree re-renders). Use Zustand's
 * non-React .subscribe() instead.
 */

import { useMemo, useEffect, type ReactNode } from "react";
import { DIProvider, TOKENS } from "@/modules/core/di";
import { bootstrap } from "@/modules/bootstrap";
import { getAccessToken } from "@/lib/auth";
import { useUserStore } from "@/store/user-store";
import type { WebSocketManager } from "@/modules/websocket";

export function AppProviders({ children }: { children: ReactNode }) {
  const container = useMemo(() => bootstrap(), []);

  // Connect/disconnect WebSocket based on auth state.
  // Uses Zustand .subscribe() (not a React hook) to avoid re-rendering the root.
  useEffect(() => {
    const wsManager = container.resolve<WebSocketManager>(TOKENS.WebSocketManager);

    const sync = () => {
      const user = useUserStore.getState().user;
      if (user) {
        if (wsManager.state === "disconnected") {
          wsManager.connect(() => getAccessToken());
        }
      } else {
        wsManager.disconnect();
      }
    };

    // Initial check
    sync();

    // Re-check only when user changes (login/logout)
    const unsub = useUserStore.subscribe(
      (state, prev) => {
        if (state.user !== prev.user) sync();
      },
    );

    return () => {
      unsub();
      wsManager.disconnect();
    };
  }, [container]);

  return <DIProvider container={container}>{children}</DIProvider>;
}
