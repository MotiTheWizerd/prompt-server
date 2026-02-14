/**
 * Generic typed EventBus.
 *
 * Each module instantiates its own bus with a domain-specific EventMap:
 *   const bus = new EventBus<MyEventMap>();
 *
 * The bus itself has zero domain knowledge — it's pure infrastructure.
 */

import { Logger } from "../logger/Logger";

type Listener<T> = (payload: T) => void;

export class EventBus<TEventMap extends Record<string, unknown>> {
  private listeners = new Map<string, Set<Listener<unknown>>>();
  private log: Logger;
  private quietEvents = new Set<string>();

  constructor(name = "event-bus") {
    this.log = new Logger(name);
  }

  /** Suppress logging for high-frequency events (e.g. "flow:dirty"). */
  silence(...events: (keyof TEventMap & string)[]): this {
    for (const e of events) this.quietEvents.add(e);
    return this;
  }

  on<K extends keyof TEventMap & string>(
    event: K,
    listener: Listener<TEventMap[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as Listener<unknown>);

    return () => {
      this.listeners.get(event)?.delete(listener as Listener<unknown>);
    };
  }

  emit<K extends keyof TEventMap & string>(event: K, payload: TEventMap[K]): void {
    if (!this.quietEvents.has(event)) this.log.info(event, payload);
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of set) {
        listener(payload);
      }
    }
  }

  off<K extends keyof TEventMap & string>(
    event: K,
    listener: Listener<TEventMap[K]>
  ): void {
    this.listeners.get(event)?.delete(listener as Listener<unknown>);
  }

  /** Remove all listeners for all events. */
  clear(): void {
    this.listeners.clear();
  }
}
