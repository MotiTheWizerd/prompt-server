# AgenticIDE — Detailed Guide

A visual development environment for composing, testing, and deploying AI agent pipelines. Build multi-step text and image generation workflows by connecting nodes on a canvas, create agentic automations, and generate complex AI art — all from a single platform.

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
| HTTP Client        | Axios (preconfigured instance with auth interceptors)         |
| Notifications      | Sonner (toast)                                                |
| AI SDK             | OpenAI SDK 6 (compatible endpoints), Claude Agent SDK         |
| AI Text Providers  | Mistral AI, GLM (Zhipu AI), OpenRouter, HuggingFace (Qwen)   |
| AI Image Providers | HuggingFace (FLUX.1-schnell, FLUX.1-dev), GLM-Image (Z.AI native) |
| Backend API        | Separate FastAPI backend at `http://localhost:8000/api/v1`    |
| Auth               | JWT (access + refresh tokens) via backend auth endpoints      |

---

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```bash
# Backend API URL (optional — defaults to http://localhost:8000/api/v1)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Text providers (at least one required)
MISTRAL_API_KEY=your_mistral_api_key
GLM_API_KEY=your_glm_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
HF_API_KEY=your_huggingface_api_key

# HF_API_KEY is also used for image generation (FLUX models)
# GLM_API_KEY is also used for GLM-Image generation (Z.AI native API)
```

| Provider             | Get a key at                             | Used for                     |
| -------------------- | ---------------------------------------- | ---------------------------- |
| Mistral AI           | https://console.mistral.ai/              | Text (default for most nodes)|
| GLM (Z.AI)           | https://open.bigmodel.cn/                | Text + Vision + Image        |
| OpenRouter           | https://openrouter.ai/                   | Text (free tier available)   |
| HuggingFace          | https://huggingface.co/settings/tokens   | Text (Qwen) + Image (FLUX)   |
| Claude CLI           | Local Claude CLI install                 | Vision (imageDescriber, personasReplacer) |

### 3. Run the dev server

```bash
pnpm dev
```

Open http://localhost:3000 → Landing page → Login → `/home`

---

## Routing & Layout Architecture

The app uses Next.js route groups to separate public and authenticated areas:

```
src/app/
├── layout.tsx                    # Root layout (Geist font, metadata, Sonner toasts)
├── globals.css                   # Tailwind theme, dark mode
├── (public)/                     # Public route group
│   ├── layout.tsx                # Shared public layout (dark bg + Navbar)
│   ├── page.tsx                  # Landing page (/)
│   └── login/page.tsx            # Login page (/login)
├── (authenticated)/              # Authenticated route group
│   ├── layout.tsx                # Auth guard + MainSidebar + header + UserAvatar
│   └── home/page.tsx             # Home page (/home)
├── image-genai/                  # Image GenAI (own full-screen layout)
│   ├── layout.tsx                # Image GenAI layout (AppSidebar, own auth guard)
│   ├── page.tsx                  # Main canvas (React Flow + toolbar)
│   ├── characters/page.tsx       # Character management
│   └── settings/page.tsx         # Settings (placeholder)
├── prototype/page.tsx            # Prototype/legacy page
└── api/                          # API routes (see below)
```

### Route Groups

| Group | Layout | Pages | Purpose |
| ----- | ------ | ----- | ------- |
| `(public)` | Navbar | `/`, `/login` | Landing page + login |
| `(authenticated)` | Auth guard + MainSidebar + header + UserAvatar | `/home`, `/agents`, `/settings` | Main app shell |
| `image-genai/` | Own full-screen layout (AppSidebar) | `/image-genai`, `/image-genai/characters`, `/image-genai/settings` | Node editor (standalone) |

### Authentication Flow

1. User visits `/` → sees landing page
2. Clicks "Get Started" or "Log In" → navigates to `/login`
3. Submits email + password → `POST /api/v1/auth/login` → receives JWT tokens + user details
4. Tokens stored in localStorage (`access_token` + `refresh_token`)
5. User details stored in Zustand user store + localStorage (`user_details`)
6. Redirected to `/home`
7. All API calls auto-attach `Bearer` token via axios interceptor
8. On 401 → auto-refresh via `POST /api/v1/auth/refresh` → retry original request
9. If refresh fails → clear tokens + clear user → redirect to `/login`
10. Logout → clear tokens + clear user → redirect to `/login`

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
│  editor:status → Editor disabled/active state       │
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
| Branding         | `src/lib/constants.ts`          | Centralized product name, tagline, description                   |
| Auth             | `src/lib/auth.ts`               | Token storage helpers (get, set, clear, isAuthenticated)         |
| API Client       | `src/lib/api.ts`                | Axios instance with Bearer token + auto-refresh interceptors     |
| User Store       | `src/store/user-store.ts`       | Zustand store for current user details (persisted to localStorage) |
| Zustand Store    | `src/store/flow-store.ts`       | Multi-flow state: nodes, edges, execution status per flow        |
| Execution Engine | `src/lib/engine/`               | Graph sorting, sequential node execution, executor registry      |
| Model Defaults   | `src/lib/model-defaults.ts`     | Per-node-type default provider + model assignments               |
| Editor Manager   | `src/lib/editor-manager.ts`     | Zustand micro-store: editor status, project management, init lifecycle |
| Event Bus        | `src/lib/event-bus.ts`          | Typed event emitter decoupling UI, persistence, and execution    |
| Auto-Save        | `src/lib/auto-save.ts`          | Debounced file persistence triggered by `flow:dirty` events      |
| Undo Manager     | `src/lib/undo-manager.ts`       | Per-flow undo/redo with debounced snapshots and batch grouping   |
| Text Providers   | `src/lib/providers.ts`          | OpenAI-compatible client factory for all text AI providers       |
| Image Providers  | `src/lib/image-providers.ts`    | Universal image generation registry (HuggingFace FLUX, GLM-Image Z.AI) |

---

## Landing Page

The landing page at `/` is a clean, minimal marketing page built with Framer Motion scroll animations:

| Section | Component | Description |
| ------- | --------- | ----------- |
| Navbar | `src/components/landing/navbar.tsx` | Fixed top nav with scroll blur effect, mobile hamburger menu |
| Hero | `src/components/landing/hero.tsx` | Product name, tagline, CTAs with staggered fade-in |
| Features | `src/components/landing/features.tsx` | 6-card grid (uses reusable `FeatureCard` component) |
| How It Works | `src/components/landing/how-it-works.tsx` | 3-step pipeline walkthrough |
| Use Cases | `src/components/landing/use-cases.tsx` | 4 use case cards with accent borders |
| CTA + Footer | `src/components/landing/cta-footer.tsx` | Final call-to-action + minimal footer |

### Reusable Landing Components

| Component | File | Purpose |
| --------- | ---- | ------- |
| `SectionWrapper` | `src/components/landing/section-wrapper.tsx` | Scroll-animated section container (whileInView fade-up) |
| `GradientText` | `src/components/landing/gradient-text.tsx` | Blue-to-purple gradient text (configurable tag: h1/h2/span) |
| `FeatureCard` | `src/components/landing/feature-card.tsx` | Animated feature card with icon, title, description |

---

## Sidebar Navigation

### MainSidebar (Authenticated Area)

**File:** `src/components/main-sidebar.tsx`

Used by the `(authenticated)` layout for `/home` and inner app pages.

| Icon | Label | Route | Color |
| ---- | ----- | ----- | ----- |
| Home | Home | `/home` | blue |
| ImageIcon | Image GenAI | `/image-genai` | fuchsia |
| Bot | Agents Automations | `/agents` | emerald |
| Settings | Settings | `/settings` | gray |
| LogOut | Sign Out | → `/login` | red (hover) |

### AppSidebar (Image GenAI)

**File:** `src/components/app-sidebar.tsx`

Used by the image-genai layout for the node editor.

| Icon | Label | Route | Color |
| ---- | ----- | ----- | ----- |
| Workflow | Editor | `/image-genai` | blue |
| UserRound | Characters | `/image-genai/characters` | amber |
| Settings | Settings | `/image-genai/settings` | gray |
| LogOut | Sign Out | → `/login` | red (hover) |

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
| **Grammar Fix**       | Proofreader — fixes grammar, spelling, and punctuation. Optional style tone adjustment without expanding or rewriting content. |
| **Compressor**        | Compresses text over 2500 characters via AI summarization; passes shorter text through.      |
| **Personas Replacer** | Analyzes a target image and replaces characters with connected personas. Vision-powered.     |

### Output Nodes

| Node               | Description                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------- |
| **Text Output**    | Terminal sink — displays the final text result. Copy to clipboard support.                    |
| **Image Generator**| Takes upstream text prompt and generates an image via HuggingFace (FLUX) or GLM-Image (Z.AI). Per-node model selection via settings. |

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
| GLM (Z.AI)  | glm-4.7-flash              | glm-4.6v             | `https://api.z.ai/api/coding/paas/v4`  |
| OpenRouter  | dolphin-mistral-24b (free)  | —                    | `https://openrouter.ai/api/v1`          |
| HuggingFace | Qwen2.5-72B-Instruct       | Qwen2.5-VL-7B       | `https://router.huggingface.co/v1`      |
| Claude CLI  | (local CLI)                 | (local CLI)          | Local process                            |

### Image Providers

| Provider    | Models                                          | API Endpoint                                        |
| ----------- | ----------------------------------------------- | --------------------------------------------------- |
| HuggingFace | FLUX.1-schnell (fast), FLUX.1-dev (quality)     | `https://router.huggingface.co/hf-inference/models/` |
| GLM-Image   | GLM-Image (Z.AI native)                         | `https://api.z.ai/api/paas/v4/images/generations`   |

> **Note:** GLM-Image uses the Z.AI native API directly (not routed through HuggingFace). It returns an image URL which is downloaded and converted to base64 by the provider. Uses `GLM_API_KEY`.

### Per-Node Model Defaults

Each node type has a default provider + model assignment. Resolution priority:

```
nodeData override  →  node-type default
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
│   ├── globals.css                         # Tailwind theme, dark mode
│   ├── (public)/                           # Public route group
│   │   ├── layout.tsx                      # Shared public layout (Navbar)
│   │   ├── page.tsx                        # Landing page (/)
│   │   └── login/page.tsx                  # Login page (/login)
│   ├── (authenticated)/                    # Authenticated route group
│   │   ├── layout.tsx                      # Auth guard + MainSidebar + header + UserAvatar
│   │   └── home/page.tsx                   # Home page (/home)
│   ├── image-genai/
│   │   ├── layout.tsx                      # Image GenAI layout (AppSidebar, own auth guard)
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
│       ├── generate-image/route.ts         # POST — image generation (FLUX, GLM-Image)
│       ├── pipeline/route.ts               # POST — legacy two-step pipeline
│       ├── providers/route.ts              # GET — available text AI providers
│       ├── image-providers/route.ts        # GET — available image AI providers
│       ├── characters/route.ts             # GET/POST — character CRUD
│       ├── characters/[id]/image/route.ts  # GET — character avatar image
│       └── claude-code/test-claude/route.ts # GET — Claude CLI connectivity test
├── components/
│   ├── landing/
│   │   ├── navbar.tsx                      # Landing page fixed navbar
│   │   ├── hero.tsx                        # Hero section
│   │   ├── features.tsx                    # Features grid
│   │   ├── how-it-works.tsx                # How it works steps
│   │   ├── use-cases.tsx                   # Use case cards
│   │   ├── cta-footer.tsx                  # CTA + footer
│   │   ├── section-wrapper.tsx             # Reusable scroll-animated section
│   │   ├── gradient-text.tsx               # Reusable gradient text component
│   │   └── feature-card.tsx                # Reusable animated feature card
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
│   │   ├── GeneralDropdown.tsx             # Reusable dropdown (value/label options, Radix popover)
│   │   ├── Modal.tsx                       # Reusable modal with blurry backdrop + fade animation
│   │   ├── ProviderSelect.tsx              # AI provider selector (characters, prototype pages)
│   │   ├── UserAvatar.tsx                  # Reusable user avatar (initials, gradient circle)
│   │   └── AppToaster.tsx                  # Sonner toaster (dark theme, bottom-right)
│   ├── ui/                                 # Radix UI primitives (button, dialog, popover, command)
│   ├── main-sidebar.tsx                    # Main app sidebar (Home, Image GenAI, Agents, Settings)
│   ├── app-sidebar.tsx                     # Image GenAI sidebar (Editor, Characters, Settings)
│   ├── TabBar.tsx                          # Multi-flow tab bar
│   └── ImageLightbox.tsx                   # Full-screen image viewer
├── store/
│   ├── flow-store.ts                       # Zustand store (multi-flow state + actions)
│   ├── user-store.ts                       # Zustand store (current user details, localStorage-persisted)
│   └── types.ts                            # FlowData, TabState interfaces
└── lib/
    ├── constants.ts                        # Branding constants (BRAND.name, tagline, description)
    ├── auth.ts                             # Token helpers (get/set/clear tokens, isAuthenticated)
    ├── api.ts                              # Axios instance (baseURL, Bearer interceptor, auto-refresh)
    ├── providers.ts                        # Text AI provider config + OpenAI client factory
    ├── image-providers.ts                  # Image generation provider registry
    ├── model-defaults.ts                   # Per-node-type model assignments
    ├── editor-manager.ts                   # Editor lifecycle manager (Zustand micro-store)
    ├── event-bus.ts                        # Typed EventEmitter (flow + execution + editor events)
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

## Backend Auth API

The frontend communicates with a separate FastAPI backend for authentication.

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/api/v1/auth/login` | Email + password → access + refresh tokens |
| POST | `/api/v1/auth/refresh` | Refresh token → new token pair |

Access tokens expire in 30 minutes, refresh tokens in 7 days. The axios interceptor in `api.ts` handles automatic token refresh transparently.

---

## Backend Projects API

| Method | Path | Body | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/api/v1/projects` | `{ project_name, user_id }` | Create a new project |
| POST | `/api/v1/projects/select` | `{ user_id }` | List all projects for a user |

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
| `editor:status`          | `{ status: "disabled" \| "active" }`     | Editor Manager           |
| `execution:started`      | `{ flowId }`                             | UI                       |
| `execution:node-status`  | `{ flowId, nodeId, status, output? }`    | UI (node status rings)   |
| `execution:completed`    | `{ flowId }`                             | UI                       |
| `execution:error`        | `{ flowId, error }`                      | UI (toast notification)  |

---

## UI Features

- **Landing Page** — Modern marketing page with Framer Motion scroll animations, Navbar, Hero, Features, How It Works, Use Cases, CTA
- **Node Canvas** — React Flow canvas with drag-and-drop node placement from a categorized sidebar
- **Multi-Flow Tabs** — Create, switch, rename, and close multiple flows as tabs
- **Undo/Redo** — Ctrl+Z / Ctrl+Shift+Z with per-flow history, debounced drag/typing, batch grouping for compound actions (node delete + edge cleanup = one undo step)
- **Per-Node Play** — Every node has a play button to re-run from that point (smart upstream resolution: unexecuted ancestors run first, cached outputs reused)
- **Edge Animation** — Running nodes animate their outgoing edges in real-time
- **Status Indicators** — Each node shows its execution state (pending → running spinner → green complete / red error)
- **Toast Notifications** — Sonner-based themed toasts for pipeline completion, errors, and info
- **Image Upload** — Drag & drop, Ctrl+V paste from clipboard, or click to pick files
- **Provider Selection** — Per-node provider + model override via settings popover on all nodes (GeneralDropdown combobox). Image Generator nodes show image providers; text nodes show text providers.
- **Project Selector** — Dropdown in the editor header to select/create projects (backed by FastAPI `POST /api/v1/projects` and `POST /api/v1/projects/select`)
- **LLM Indicator** — Nodes that use AI models display a brain icon in the header
- **Image Lightbox** — Click generated images for full-screen preview
- **Copy to Clipboard** — TextOutput nodes have a one-click copy button
- **User Avatar** — Gradient initials avatar in the authenticated header, pulled from Zustand user store
- **Character Management** — Create and manage consistent character personas at `/image-genai/characters`
- **Multi-Select** — Shift+Click to add/remove nodes from selection; Shift+Drag for box (marquee) select
- **MiniMap + Controls** — React Flow built-in minimap, zoom controls, and a help button (?) with an interactive shortcut reference popup
- **Help Panel** — Click the ? button in the bottom-left controls to view all canvas controls, selection, connection, keyboard shortcuts, and node interaction instructions in a two-column popup
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
| Shift+Click      | Add/remove node from selection          |
| Shift+Drag       | Box select multiple nodes               |
| Backspace/Delete | Remove selected nodes                   |
| Double-click edge| Remove a connection                     |

---

## CLI Scripts

```bash
# Full pipeline (legacy two-step: describe + replace)
pnpm pipeline -- -p persona.jpg -t target.jpg [-r ref1.jpg] [-x "extra text"]

# Test visual analysis on a single image
pnpm test:visual -- ./image.jpg

# Test replace step with a description
pnpm test:replace -- -t target.jpg -d "persona description text"

# Test Claude Code CLI connectivity
pnpm test:claude
```

---

## Adding a New Text Provider

Edit `src/lib/providers.ts`:

```typescript
const yourModels: ProviderModel[] = [
  { id: "model-name", name: "Model Display Name" },
  { id: "vision-model", name: "Vision Model", supportsVision: true },
];

yourProvider: {
  id: "yourProvider",
  name: "Display Name",
  textModel: "model-name",
  visionModel: "vision-model-name",
  supportsVision: true,
  baseURL: "https://api.provider.com/v1",
  apiKeyEnv: "YOUR_API_KEY",
  models: yourModels,  // Shown in per-node settings dropdown
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
