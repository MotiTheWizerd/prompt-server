/**
 * bootstrap() — the single wiring point for the entire DI container.
 *
 * Read this file to understand the full dependency graph.
 * Every service, its scope, and its dependencies are declared here.
 *
 * Call once at app startup (e.g. in a top-level React layout or provider).
 * The returned Container is passed to <DIProvider> for React access.
 *
 * Bootstrap also wires backward-compat singletons so that existing
 * `import { eventBus }` / `import { undoManager }` patterns keep working
 * during the migration period.
 */

import { Container, TOKENS } from "@/modules/core/di";
import { EventBus, Logger } from "@/modules/core";
import { WebSocketManager } from "@/modules/websocket";

// Domain types & classes
import type { EventMap } from "@/modules/image-gen-editor/event-bus";
import { setEventBusInstance } from "@/modules/image-gen-editor/event-bus";
import { wireEditorEvents } from "@/modules/image-gen-editor/event-wiring";
import { AutoSaveManager } from "@/modules/image-gen-editor/auto-save";
import { UndoManager, setUndoManagerInstance } from "@/modules/image-gen-editor/undo-manager";
import { ExecutorManager, setExecutorManagerInstance } from "@/modules/image-gen-editor/engine/executor";
import { GraphManager } from "@/modules/image-gen-editor/engine/graph";
import { ProjectService } from "@/modules/image-gen-editor/editor-manager/project-service";
import { ComponentService } from "@/modules/image-gen-editor/editor-manager/component-service";
import { FlowLoader } from "@/modules/image-gen-editor/editor-manager/flow-loader";
import { NodeIdService } from "@/modules/image-gen-editor/editor-manager/node-id-service";
import { ImageGenEditorManager } from "@/modules/image-gen-editor/editor-manager/ImageGenEditorManager";
import { setEditorManagerInstance } from "@/modules/image-gen-editor/editor-manager";

const log = new Logger("bootstrap");

/**
 * Create and wire the DI container.
 * Each registration is a lazy factory — instances are created on first resolve().
 */
export function bootstrap(): Container {
  const container = new Container();

  // ---- Tier 1: Core infrastructure (zero deps) ----

  container.register(TOKENS.EventBus, () => {
    log.info("Creating EventBus");
    return new EventBus<EventMap>("editor-bus").silence("flow:dirty", "flow:saved");
  });

  // ---- Tier 1.5: WebSocket (zero deps, core infra) ----

  container.register(TOKENS.WebSocketManager, () => {
    log.info("Creating WebSocketManager");
    return new WebSocketManager(new Logger("websocket"));
  });

  // ---- Tier 2: Subsystem managers (depend on Tier 1) ----

  container.register(TOKENS.GraphManager, () => {
    log.info("Creating GraphManager");
    return new GraphManager();
  });

  container.register(TOKENS.ExecutorManager, () => {
    log.info("Creating ExecutorManager");
    return new ExecutorManager(new Logger("executor"));
  });

  container.register(TOKENS.UndoManager, () => {
    log.info("Creating UndoManager");
    return new UndoManager();
  });

  container.register(TOKENS.AutoSaveManager, () => {
    log.info("Creating AutoSaveManager");
    return new AutoSaveManager();
  });

  // ---- Tier 3: Editor services (depend on Tier 1) ----

  container.register(TOKENS.ProjectService, () => {
    log.info("Creating ProjectService");
    return new ProjectService();
  });

  container.register(TOKENS.ComponentService, () => {
    log.info("Creating ComponentService");
    return new ComponentService();
  });

  container.register(TOKENS.FlowLoader, () => {
    log.info("Creating FlowLoader");
    return new FlowLoader();
  });

  container.register(TOKENS.NodeIdService, () => {
    log.info("Creating NodeIdService");
    return new NodeIdService();
  });

  // ---- Tier 4: Orchestrator (depends on everything) ----

  container.register(TOKENS.EditorManager, (c) => {
    log.info("Creating ImageGenEditorManager");
    return new ImageGenEditorManager(
      c.resolve<AutoSaveManager>(TOKENS.AutoSaveManager),
      c.resolve<ProjectService>(TOKENS.ProjectService),
      c.resolve<ComponentService>(TOKENS.ComponentService),
      c.resolve<FlowLoader>(TOKENS.FlowLoader),
      c.resolve<NodeIdService>(TOKENS.NodeIdService),
    );
  });

  // ---- Wire backward-compat singletons ----
  // Eagerly resolve so the proxies work immediately.

  setEventBusInstance(container.resolve<EventBus<EventMap>>(TOKENS.EventBus));
  setUndoManagerInstance(container.resolve<UndoManager>(TOKENS.UndoManager));
  setExecutorManagerInstance(container.resolve<ExecutorManager>(TOKENS.ExecutorManager));
  setEditorManagerInstance(container.resolve<ImageGenEditorManager>(TOKENS.EditorManager));

  // ---- Wire event subscriptions (single source of truth) ----
  wireEditorEvents(container.resolve<EventBus<EventMap>>(TOKENS.EventBus));

  log.info("Bootstrap complete — all services registered");

  return container;
}
