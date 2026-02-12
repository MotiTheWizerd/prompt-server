# Session Summary

## 1. StoryTeller Prompt Rework

Rewrote the `/api/storyteller` prompt from an image-prompt generator to an actual narrative storyteller.

**Before**: "You are a wildly creative art director and visual storyteller" — produced image generation prompts with lighting, composition, and art style directions.

**After**: "You are a wildly creative storyteller and wordsmith" — produces narrative passages focused on words, emotions, atmosphere, and character. Outputs clean markdown with headings, paragraph breaks, and italics (no bold).

**Impact**: Downstream image generation improved significantly — the image generator receives richer narrative context instead of redundant visual directions, producing more creative and accurate results.

**File**: `src/app/api/storyteller/route.ts`

---

## 2. Undo/Redo System (Per-Flow)

Implemented a full undo/redo system with per-flow history isolation.

### Architecture

- **UndoManager** (`src/lib/undo-manager.ts`) — standalone singleton, zero React/Zustand deps
  - Per-flow history stacks: `Map<string, { past: Snapshot[], future: Snapshot[] }>`
  - Snapshot = `{ nodes, edges }` — only undoable state (excludes execution, UI transients)
  - Max 50 entries per flow
  - 500ms debounce for rapid changes (node drags, text typing) — "first snapshot wins"
  - 50ms batch window for compound actions (node delete + connected edge cleanup = one undo step)

### Store Integration (`src/store/flow-store.ts`)

- New actions: `undo()`, `redo()` — blocked during execution (`isRunning` guard)
- Snapshot capture in 7 mutation points:
  - `onNodesChange` — debounced for position, immediate for remove, skips select/dimensions
  - `onEdgesChange` — immediate for remove, debounced otherwise, skips select
  - `onConnect` — immediate
  - `addNode` — immediate
  - `updateNodeData` — debounced, skipped during execution (runner pushes text to textOutput nodes)
  - `setNodeParent` — immediate
  - `removeNodeFromGroup` — immediate
- Lifecycle hooks: `seedInitial` on create/load, `clear` on close

### Keyboard Shortcuts (`src/components/TabBar.tsx`)

- `Ctrl+Z` → undo
- `Ctrl+Shift+Z` / `Ctrl+Y` → redo
- Textarea/input guard: lets browser native undo handle text fields

### Bug Fix — Batch Window

Initial implementation created separate undo entries for node removal and connected edge cleanup (React Flow fires them as separate `onNodesChange` + `onEdgesChange` calls). Added a 50ms batch window so multiple immediate pushes within the same frame are grouped as one undo step.

### Files Changed

- `src/lib/undo-manager.ts` (new)
- `src/store/flow-store.ts` (modified)
- `src/components/TabBar.tsx` (modified)
