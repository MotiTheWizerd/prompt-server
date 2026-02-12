# Prompt Creator — Detailed Guide

A visual, node-based AI prompt pipeline builder. Design multi-step text and image generation workflows by connecting nodes on a canvas — each node performs one AI operation (enhance, translate, describe, generate image, etc.) and passes its output downstream. The execution engine topologically sorts the graph and runs nodes in order, with real-time status updates and per-edge animation.

---

## Tech Stack

| Layer              | Technology                                                    |
| ------------------ | ------------------------------------------------------------- |
| Framework          | Next.js 16 (App Router)                                      |
| Frontend           | React 19, TypeScript 5 (strict)                              |
| Node Graph         | @xyflow/react 12 (React Flow)                                |
| State Management   | Zustand 5                                                    |
| Styling            | Tailwind CSS 4, tw-animate-css                               |
| UI Components      | Radix UI, cmdk (command palette), Lucide icons                |
| Animation          | Framer Motion 12                                             |
| Notifications      | Sonner (toast)                                                |
| AI SDK             | OpenAI SDK 6 (compatible endpoints), Claude Agent SDK         |
| AI Text Providers  | Mistral AI, GLM (Zhipu AI), OpenRouter, HuggingFace (Qwen)   |
| AI Image Providers | HuggingFace (FLUX.1-schnell, FLUX.1-dev)                     |
| Persistence        | File-based (server-side JSON files, auto-save via event bus)  |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```bash
# Text providers (at least one required)
MISTRAL_API_KEY=your_mistral_api_key
GLM_API_KEY=your_glm_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
HF_API_KEY=your_huggingface_api_key

# HF_API_KEY is also used for image generation (FLUX models)
```

| Provider             | Get a key at                             | Used for                     |
| -------------------- | ---------------------------------------- | ---------------------------- |
| Mistral AI           | https://console.mistral.ai/              | Text (default for most nodes)|
| GLM (Zhipu AI)       | https://open.bigmodel.cn/                | Text + Vision                |
| OpenRouter           | https://openrouter.ai/                   | Text (free tier available)   |
| HuggingFace          | https://huggingface.co/settings/tokens   | Text (Qwen) + Image (FLUX)  |
| Claude CLI           | Local Claude CLI install                 | Vision (imageDescriber, personasReplacer) |

### 3. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000 → redirects to `/dashboard`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Dashboard (React Flow canvas)                      │
│  ┌───────┐   ┌───────┐   ┌───────┐   ┌──────────┐ │
│  │ Input │──▶│Process│──▶│Process│──▶│  Output  │ │
│  │ Node  │   │ Node  │   │ Node  │   │  Node    │ │
│  └───────┘   └───────┘   └───────┘   └──────────┘ │
│       ▲ adapter handles (character personas)        │
│  ┌────┴────┐                                        │
│  │Character│                                        │
│  │  Node   │                                        │
│  └─────────┘                                        │
└─────────────────┬───────────────────────────────────┘
                  │ execute()
                  ▼
┌─────────────────────────────────────────────────────┐
│  Execution Engine                                   │
│  1. Kahn's topological sort (graph.ts)              │
│  2. Sequential execution (runner.ts)                │
│  3. Executor registry lookup (executors.ts)         │
│  4. Per-node model resolution (model-defaults.ts)   │
│  5. API calls to Next.js routes → AI providers      │
└─────────────────┬───────────────────────────────────┘
                  │ status callbacks
                  ▼
┌─────────────────────────────────────────────────────┐
│  Event Bus (event-bus.ts)                           │
│  flow:dirty → Auto-Save (auto-save.ts)              │
│  execution:node-status → UI updates                 │
│  flow:created/closed/switched → Tab management      │
└─────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  Persistence                                        │
│  users/test/flows/{flowId}/flow.json                │
│  File-based, debounced auto-save (2s)               │
│  Flush-on-unload via sendBeacon                     │
└─────────────────────────────────────────────────────┘
```

### Key Systems

| System           | File(s)                         | Purpose                                                          |
| ---------------- | ------------------------------- | ---------------------------------------------------------------- |
| Zustand Store    | `src/store/flow-store.ts`       | Multi-flow state: nodes, edges, execution status per flow        |
| Execution Engine | `src/lib/engine/`               | Graph sorting, sequential node execution, executor registry      |
| Model Defaults   | `src/lib/model-defaults.ts`     | Per-node-type default provider + model assignments               |
| Event Bus        | `src/lib/event-bus.ts`          | Typed event emitter decoupling UI, persistence, and execution    |
| Auto-Save        | `src/lib/auto-save.ts`          | Debounced file persistence triggered by `flow:dirty` events      |
| Undo Manager     | `src/lib/undo-manager.ts`       | Per-flow undo/redo with debounced snapshots and batch grouping   |
| Text Providers   | `src/lib/providers.ts`          | OpenAI-compatible client factory for all text AI providers       |
| Image Providers  | `src/lib/image-providers.ts`    | Universal image generation registry (HuggingFace FLUX)           |

---

## Node Types

Nodes are the building blocks of a flow. Each node has typed input/output handles and an associated executor function. Drag nodes from the sidebar onto the canvas and connect them with edges.

### Input Nodes

| Node              | Description                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| **Initial Prompt**    | Text entry point. Type your prompt text directly. Supports persona injection via adapter handles. |
| **Image Describer**   | Upload an image → AI vision model generates a text description. Uses Claude CLI by default.       |

### Scene Atmosphere

| Node              | Description                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| **Scene Builder**     | Pure data source — compose a scene prompt from dropdowns (style, lighting, time of day, weather, camera angle, lens, mood). No AI call. |

### Processing Nodes

| Node                  | Description                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------- |
| **Prompt Enhancer**   | Enhances upstream text with optional notes. Supports persona injection via adapters.         |
| **Story Teller**      | Creative narrative generator — produces vivid story passages from a concept + tags. Focuses on words, emotion, and character (not visual/image descriptions). Persona-aware. |
| **Translator**        | Translates upstream text to a target language (26 languages supported).                      |
| **Grammar Fix**       | Fixes grammar and typos in English text, with optional style guidance.                       |
| **Compressor**        | Compresses text over 2500 characters via AI summarization; passes shorter text through.      |
| **Personas Replacer** | Analyzes a target image and replaces characters with connected personas. Vision-powered.     |

### Output Nodes

| Node               | Description                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------- |
| **Text Output**    | Terminal sink — displays the final text result. Copy to clipboard support.                    |
| **Image Generator**| Takes upstream text prompt and generates an image via HuggingFace FLUX models.                |

### Utility Nodes

| Node                    | Description                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Consistent Character**| Pure data source — holds a saved character persona (name + description). Connect via adapter handles to inject persona identity into downstream nodes. |
| **Group**               | Visual container — groups nodes together on the canvas. No execution logic.              |

---

## Execution Engine

When you click **Run**, the engine:

1. **Topological Sort** — Kahn's algorithm (`graph.ts`) builds an execution plan. Groups are excluded. Cycles are detected and rejected.
2. **Sequential Execution** — `runner.ts` iterates the sorted plan. For each node:
   - Resolves the effective provider + model via `resolveModelForNode()` (priority: node override → node-type default → global provider)
   - Gathers text inputs from upstream edges and adapter inputs from adapter edges
   - Looks up the executor in `executorRegistry` and calls it
   - Calls `onStatus(nodeId, status, output)` for every state transition
3. **Status Flow** — Each node transitions through: `idle → pending → running → complete/error/skipped`
4. **Error Propagation** — If an upstream node errors, all downstream nodes in the chain are marked `error` with "Upstream node failed"

### Adapter Handles

Some nodes (initialPrompt, promptEnhancer, storyTeller, personasReplacer) support **adapter inputs** — special connection points (top-left "+" handle) that receive character persona data from ConsistentCharacter nodes. These are separate from regular text flow edges and enable persona injection into prompts.

---

## AI Providers

### Text Providers

All text providers use OpenAI-compatible APIs via the OpenAI SDK.

| Provider    | Text Model                  | Vision Model         | Base URL                                 |
| ----------- | --------------------------- | -------------------- | ---------------------------------------- |
| Mistral     | ministral-14b-2512          | pixtral-12b-2409     | `https://api.mistral.ai/v1`             |
| GLM (Zhipu) | glm-4.7-flash              | glm-4.6v             | `https://open.bigmodel.cn/api/paas/v4`  |
| OpenRouter  | dolphin-mistral-24b (free)  | —                    | `https://openrouter.ai/api/v1`          |
| HuggingFace | Qwen2.5-72B-Instruct       | Qwen2.5-VL-7B       | `https://router.huggingface.co/v1`      |
| Claude CLI  | (local CLI)                 | (local CLI)          | Local process                            |

### Image Providers

| Provider    | Models                                      |
| ----------- | ------------------------------------------- |
| HuggingFace | FLUX.1-schnell (fast), FLUX.1-dev (quality) |

### Per-Node Model Defaults

Each node type has a default provider + model assignment. Resolution priority:

```
nodeData override  →  node-type default  →  global provider fallback
```

| Node Type        | Default Provider | Default Model              | Rationale                      |
| ---------------- | ---------------- | -------------------------- | ------------------------------ |
| grammarFix       | mistral          | ministral-14b-2512         | Mechanical — fast and cheap    |
| compressor       | mistral          | ministral-14b-2512         | Summarization — lightweight    |
| promptEnhancer   | mistral          | ministral-14b-2512         | Good writing, fast turnaround  |
| initialPrompt    | mistral          | ministral-14b-2512         | Persona injection only         |
| translator       | mistral          | ministral-14b-2512         | Mechanical — fast and reliable |
| storyTeller      | mistral          | labs-mistral-small-creative| Creative writing specialist    |
| imageDescriber   | claude           | (CLI default)              | Vision — rate-limit avoidance  |
| personasReplacer | claude           | (CLI default)              | Vision — rate-limit avoidance  |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                          # Root layout (Geist font, Sonner toasts)
│   ├── page.tsx                            # Root page (redirects to /dashboard)
│   ├── globals.css                         # Tailwind theme, dark mode
│   ├── dashboard/
│   │   ├── layout.tsx                      # Dashboard layout (sidebar)
│   │   ├── page.tsx                        # Main canvas (React Flow + sidebar + toolbar)
│   │   ├── characters/page.tsx             # Character management page
│   │   └── settings/page.tsx               # Settings page
│   ├── prototype/page.tsx                  # Prototype/legacy page
│   └── api/
│       ├── flows/route.ts                  # GET list / POST save flow
│       ├── flows/[flowId]/route.ts         # GET / DELETE single flow
│       ├── enhance/route.ts                # POST — prompt enhancement
│       ├── translate/route.ts              # POST — translation
│       ├── describe/route.ts               # POST — image description (vision)
│       ├── replace/route.ts                # POST — persona replacement
│       ├── storyteller/route.ts            # POST — creative story generation
│       ├── grammar-fix/route.ts            # POST — grammar correction
│       ├── compress/route.ts               # POST — text compression
│       ├── inject-persona/route.ts         # POST — persona injection into text
│       ├── generate-image/route.ts         # POST — image generation (FLUX)
│       ├── pipeline/route.ts               # POST — legacy two-step pipeline
│       ├── providers/route.ts              # GET — available AI providers
│       ├── characters/route.ts             # GET/POST — character CRUD
│       ├── characters/[id]/image/route.ts  # GET — character avatar image
│       └── claude-code/test-claude/route.ts # GET — Claude CLI connectivity test
├── components/
│   ├── nodes/
│   │   ├── index.ts                        # Node type registry (nodeTypes map)
│   │   ├── BaseNode.tsx                    # Shared node shell (header, handles, status ring)
│   │   ├── InitialPromptNode.tsx           # Text input node
│   │   ├── PromptEnhancerNode.tsx          # Enhance text with notes
│   │   ├── TranslatorNode.tsx              # Language translation
│   │   ├── StoryTellerNode.tsx             # Creative story generator
│   │   ├── GrammarFixNode.tsx              # Grammar correction
│   │   ├── CompressorNode.tsx              # Text compression
│   │   ├── ImageDescriberNode.tsx          # Vision → text description
│   │   ├── ImageGeneratorNode.tsx          # Text → image generation
│   │   ├── PersonasReplacerNode.tsx        # Persona swap on target image
│   │   ├── ConsistentCharacterNode.tsx     # Character persona data source
│   │   ├── SceneBuilderNode.tsx            # Scene attribute composer
│   │   ├── TextOutputNode.tsx              # Terminal text display
│   │   ├── GroupNode.tsx                   # Visual grouping container
│   │   └── NodeSettingsPopover.tsx         # Per-node settings popover
│   ├── shared/
│   │   ├── ImageUpload.tsx                 # Reusable image upload (drag/paste/click)
│   │   ├── LanguageSelect.tsx              # Language dropdown
│   │   ├── ProviderSelect.tsx              # AI provider selector
│   │   └── AppToaster.tsx                  # Sonner toaster (dark theme, bottom-right)
│   ├── ui/                                 # Radix UI primitives (button, dialog, popover, command)
│   ├── TabBar.tsx                          # Multi-flow tab bar
│   ├── ImageLightbox.tsx                   # Full-screen image viewer
│   └── app-sidebar.tsx                     # Dashboard sidebar
├── store/
│   ├── flow-store.ts                       # Zustand store (multi-flow state + actions)
│   └── types.ts                            # FlowData, TabState interfaces
└── lib/
    ├── providers.ts                        # Text AI provider config + OpenAI client factory
    ├── image-providers.ts                  # Image generation provider registry
    ├── model-defaults.ts                   # Per-node-type model assignments
    ├── event-bus.ts                        # Typed EventEmitter (flow + execution events)
    ├── auto-save.ts                        # Debounced file persistence via event bus
    ├── undo-manager.ts                     # Per-flow undo/redo history (snapshot stacks + debounce)
    ├── toast.ts                            # Sonner toast helpers (success/error/info/warning)
    ├── characters.ts                       # Character data helpers
    ├── scene-prompts.ts                    # Scene prompt composition from dropdown values
    ├── image-utils.ts                      # Image processing utilities
    ├── utils.ts                            # General utilities (cn, clsx)
    ├── engine/
    │   ├── index.ts                        # Engine barrel export
    │   ├── types.ts                        # NodeOutput, ExecutionState, StatusCallback types
    │   ├── graph.ts                        # Kahn's topological sort, upstream/downstream BFS
    │   ├── runner.ts                       # executeGraph() — orchestrates full pipeline run
    │   └── executors.ts                    # Executor registry (one function per node type)
    ├── agents/                             # Agent framework (template-based prompts, executor)
    └── claude-code/                        # Claude CLI integration (API adapter)
```

---

## State Management

The Zustand store manages multiple flows simultaneously with tab-based navigation.

### Store Shape

```typescript
interface TabState {
  activeFlowId: string;      // Currently visible flow
  flowIds: string[];          // Tab order
  flows: Record<string, FlowData>;
}

interface FlowData {
  id: string;
  name: string;
  nodes: Node[];              // React Flow nodes
  edges: Edge[];              // React Flow edges
  hoveredGroupId: string | null;
  execution: ExecutionState;  // Running status, outputs, provider
  isDirty: boolean;           // Unsaved changes flag
  lastSavedAt: number | null;
}

interface ExecutionState {
  isRunning: boolean;
  nodeStatus: Record<string, NodeExecutionStatus>;   // idle|pending|running|complete|error|skipped
  nodeOutputs: Record<string, NodeOutput>;
  globalError: string | null;
  providerId: string;
}
```

### Key Actions

- **Flow CRUD**: `createFlow`, `closeFlow`, `switchFlow`, `renameFlow`
- **Graph editing**: `onNodesChange`, `onEdgesChange`, `onConnect`, `updateNodeData`, `addNode`
- **Execution**: `runFromNode` (partial graph re-execution with smart upstream resolution)
- **Undo/Redo**: `undo`, `redo` — per-flow history via `UndoManager` singleton
- **State**: `markClean`, `patchFlow` (immutable update helper)

---

## Persistence

Flows are saved as JSON files on the server filesystem:

```
users/test/flows/{flowId}/flow.json
```

### Auto-Save Flow

1. Any state change in the store emits `flow:dirty` via the event bus
2. `auto-save.ts` listens for `flow:dirty` and debounces saves (2 second delay)
3. Save serializes the flow (strips runtime state) and POSTs to `/api/flows`
4. The API route writes the JSON file to disk
5. On page unload, `flushAll()` uses `navigator.sendBeacon` to save any remaining dirty flows

### API Endpoints

| Method | Route                     | Description                           |
| ------ | ------------------------- | ------------------------------------- |
| GET    | `/api/flows`              | List all saved flows                  |
| POST   | `/api/flows`              | Save / update a flow                  |
| GET    | `/api/flows/[flowId]`     | Load a single flow                    |
| DELETE | `/api/flows/[flowId]`     | Delete a flow                         |

---

## API Routes — AI Processing

All AI processing routes accept a `providerId` and optional `model` field. They resolve the AI provider, call the external API, and return the result.

| Route                  | Input                               | Output               | Used by             |
| ---------------------- | ----------------------------------- | -------------------- | ------------------- |
| `/api/enhance`         | `text`, `notes?`                    | `enhanced`           | promptEnhancer      |
| `/api/translate`       | `text`, `language`                  | `translation`        | translator          |
| `/api/describe`        | `images[]`                          | `description`        | imageDescriber      |
| `/api/replace`         | `personas[]`, `targetImage`         | `description`        | personasReplacer    |
| `/api/storyteller`     | `text`, `tags?`                     | `story`              | storyTeller         |
| `/api/grammar-fix`     | `text`, `style?`                    | `fixed`              | grammarFix          |
| `/api/compress`        | `text`                              | `compressed`         | compressor          |
| `/api/inject-persona`  | `personas[]`, `promptText`          | `injected`           | initialPrompt, promptEnhancer, storyTeller |
| `/api/generate-image`  | `prompt`, `providerId?`, `model?`   | `imageData` (base64) | imageGenerator      |
| `/api/pipeline`        | `images[]`, `targetImage`           | `personaDescription`, `replacePrompt` | (legacy) |

---

## Event Bus

The typed event bus (`src/lib/event-bus.ts`) decouples the UI, persistence, and execution layers.

| Event                    | Payload                                  | Listeners                |
| ------------------------ | ---------------------------------------- | ------------------------ |
| `flow:created`           | `{ flowId, name }`                       | Auto-save                |
| `flow:closed`            | `{ flowId }`                             | —                        |
| `flow:switched`          | `{ flowId }`                             | —                        |
| `flow:renamed`           | `{ flowId, name }`                       | —                        |
| `flow:dirty`             | `{ flowId }`                             | Auto-save (debounced)    |
| `flow:saved`             | `{ flowId }`                             | —                        |
| `execution:started`      | `{ flowId }`                             | UI                       |
| `execution:node-status`  | `{ flowId, nodeId, status, output? }`    | UI (node status rings)   |
| `execution:completed`    | `{ flowId }`                             | UI                       |
| `execution:error`        | `{ flowId, error }`                      | UI (toast notification)  |

---

## UI Features

- **Node Canvas** — React Flow canvas with drag-and-drop node placement from a categorized sidebar
- **Multi-Flow Tabs** — Create, switch, rename, and close multiple flows as tabs
- **Undo/Redo** — Ctrl+Z / Ctrl+Shift+Z with per-flow history, debounced drag/typing, batch grouping for compound actions (node delete + edge cleanup = one undo step)
- **Per-Node Play** — Every node has a play button to re-run from that point (smart upstream resolution: unexecuted ancestors run first, cached outputs reused)
- **Edge Animation** — Running nodes animate their outgoing edges in real-time
- **Status Indicators** — Each node shows its execution state (pending → running spinner → green complete / red error)
- **Toast Notifications** — Sonner-based themed toasts for pipeline completion, errors, and info
- **Image Upload** — Drag & drop, Ctrl+V paste from clipboard, or click to pick files
- **Provider Selection** — Global provider selector in the toolbar; per-node overrides planned
- **Image Lightbox** — Click generated images for full-screen preview
- **Copy to Clipboard** — TextOutput nodes have a one-click copy button
- **Character Management** — Create and manage consistent character personas at `/dashboard/characters`
- **MiniMap + Controls** — React Flow built-in minimap and zoom controls
- **Dark Theme** — Dark-first gradient theme with Geist font family

### Keyboard Shortcuts

| Shortcut         | Action                                  |
| ---------------- | --------------------------------------- |
| Ctrl+Z           | Undo (flow-level, skipped in text inputs) |
| Ctrl+Shift+Z / Ctrl+Y | Redo                               |
| Ctrl+T           | New flow tab                            |
| Ctrl+W           | Close current tab                       |
| Ctrl+Tab         | Next tab                                |
| Ctrl+Shift+Tab   | Previous tab                            |

---

## CLI Scripts

```bash
# Full pipeline (legacy two-step: describe + replace)
npm run pipeline -- -p persona.jpg -t target.jpg [-r ref1.jpg] [-x "extra text"]

# Test visual analysis on a single image
npm run test:visual -- ./image.jpg

# Test replace step with a description
npm run test:replace -- -t target.jpg -d "persona description text"

# Test Claude Code CLI connectivity
npm run test:claude
```

---

## Adding a New Text Provider

Edit `src/lib/providers.ts`:

```typescript
yourProvider: {
  id: "yourProvider",
  name: "Display Name",
  textModel: "model-name",
  visionModel: "vision-model-name",
  supportsVision: true,
  baseURL: "https://api.provider.com/v1",
  apiKeyEnv: "YOUR_API_KEY",
},
```

Then add `YOUR_API_KEY=...` to `.env.local`.

## Adding a New Image Provider

Edit `src/lib/image-providers.ts` — implement the `ImageProvider` interface:

```typescript
const yourProvider: ImageProvider = {
  id: "yourProvider",
  name: "Display Name",
  models: [
    { id: "model-id", name: "Model Name" },
  ],
  async generate(prompt, model, options) {
    // Call your API, return { imageData, width, height }
  },
};

// Register in the registry:
const imageProviderRegistry: Record<string, ImageProvider> = {
  huggingface,
  yourProvider,  // ← add here
};
```
