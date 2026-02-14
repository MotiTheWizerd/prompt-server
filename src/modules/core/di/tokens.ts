/**
 * DI tokens — unique symbols for each registered service.
 *
 * Every service that participates in DI gets a token here.
 * The token is the key used to register and resolve instances from the Container.
 *
 * Naming convention: PascalCase matching the class/service name.
 */

// ---- Core infrastructure ----
export const EventBus           = Symbol("EventBus");
export const WebSocketManager   = Symbol("WebSocketManager");

// ---- Subsystem managers ----
export const AutoSaveManager  = Symbol("AutoSaveManager");
export const UndoManager      = Symbol("UndoManager");
export const ExecutorManager  = Symbol("ExecutorManager");
export const GraphManager     = Symbol("GraphManager");

// ---- Editor services ----
export const ProjectService    = Symbol("ProjectService");
export const ComponentService  = Symbol("ComponentService");
export const FlowLoader        = Symbol("FlowLoader");
export const NodeIdService     = Symbol("NodeIdService");

// ---- Orchestrators ----
export const EditorManager    = Symbol("EditorManager");

/**
 * Convenience namespace export for import ergonomics:
 *   import { TOKENS } from "@/modules/core/di";
 *   container.resolve<EventBus>(TOKENS.EventBus);
 */
export const TOKENS = {
  EventBus,
  WebSocketManager,
  AutoSaveManager,
  UndoManager,
  ExecutorManager,
  GraphManager,
  ProjectService,
  ComponentService,
  FlowLoader,
  NodeIdService,
  EditorManager,
} as const;
