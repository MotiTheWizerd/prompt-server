# Execution Orchestration — Server Migration Blueprint

Move the graph execution pipeline from the browser (`runner.ts`) to the FastAPI backend with SSE-based real-time status streaming.

---

## 1. Current Architecture (Client-Side)

### How It Works Today

The entire execution pipeline runs in the browser. When the user clicks **Run**, the flow store calls `executeGraph()` which loops through nodes sequentially, calling Next.js API routes one at a time.

```
Browser (runner.ts)
  |
  |-- 1. buildExecutionPlan(nodes, edges)     // Kahn's topo sort
  |-- 2. Mark all planned nodes "pending"
  |-- 3. FOR each step in sorted order:
  |       |-- Check upstream errors (skip if failed)
  |       |-- Gather text inputs + adapter inputs from outputs map
  |       |-- resolveModelForNode() — pick provider + model
  |       |-- executor(ctx) — calls fetch("/api/...") to Next.js
  |       |      |
  |       |      +---> Next.js route ---> External AI API (Mistral, HF, Claude)
  |       |      <--- response --------<
  |       |
  |       |-- Store output in outputs map
  |       |-- onStatus(nodeId, "complete"|"error", output)
  |-- 4. Return all outputs
```

### Execution Entry Point

**File:** `src/modules/image-gen-editor/engine/runner.ts`

```typescript
export async function executeGraph(
  nodes: Node[],
  edges: Edge[],
  providerId: string,
  onStatus: StatusCallback,
  cachedOutputs?: Record<string, NodeOutput>
): Promise<Record<string, NodeOutput>>
```

- `cachedOutputs` enables partial re-execution (`runFromNode`) — upstream nodes that already ran keep their outputs; only the target node and its downstream chain re-execute.
- `onStatus` fires for every state transition so the UI updates in real-time.

### Graph Analysis

**Topological Sort** — `src/modules/image-gen-editor/engine/graph/topological-sort.ts`

Kahn's algorithm. Filters out `group` nodes. Deduplicates by ID. Detects cycles and throws. Returns `ExecutionStep[]`:

```typescript
interface ExecutionStep {
  nodeId: string;
  nodeType: string;
  inputNodeIds: string[];     // upstream text edges
  adapterNodeIds: string[];   // upstream adapter edges (character personas)
}
```

**Edge Classification** — `src/modules/image-gen-editor/engine/graph/edge-classification.ts`

Two functions that separate edges by target handle:
- `getTextInputNodeIds(nodeId, edges)` — edges where `targetHandle` does NOT start with `adapter-`
- `getAdapterInputNodeIds(nodeId, edges)` — edges where `targetHandle` starts with `adapter-`

**BFS Traversal** — `src/modules/image-gen-editor/engine/graph/traversal.ts`

- `getUpstreamNodes(startNodeId, nodes, edges)` — BFS backwards to find all ancestors (used by `runFromNode`)
- `getDownstreamNodes(startNodeId, nodes, edges)` — BFS forward to find all descendants

### Status Lifecycle

Each node transitions through:

```
idle → pending → running → complete
                         → error
                         → skipped (no executor registered)
```

**Error Propagation:** If any upstream node (text or adapter) has an error, all downstream nodes in the chain get `{ error: "Upstream node failed" }` without executing.

### Model Resolution

**File:** `src/modules/image-gen-editor/model-defaults.ts`

Priority chain:
```
nodeData.providerId / nodeData.model   (user override on node settings)
       ↓ (fallback)
NODE_MODEL_DEFAULTS[nodeType]          (per-node-type default)
       ↓ (fallback)
globalProviderId                       (flow-level provider)
```

Current per-node-type defaults:

| Node Type         | Default Provider | Default Model               |
|-------------------|------------------|-----------------------------|
| grammarFix        | mistral          | ministral-14b-2512          |
| compressor        | mistral          | ministral-14b-2512          |
| promptEnhancer    | mistral          | ministral-14b-2512          |
| initialPrompt     | mistral          | ministral-14b-2512          |
| translator        | mistral          | ministral-14b-2512          |
| storyTeller       | mistral          | labs-mistral-small-creative |
| imageDescriber    | claude           | (CLI default)               |
| personasReplacer  | claude           | (CLI default)               |

### Executor Registry

**File:** `src/modules/image-gen-editor/engine/executor/ExecutorManager.ts`

12 registered executors:

| Executor             | Category         | Makes API Call | Endpoint              |
|----------------------|------------------|----------------|-----------------------|
| consistentCharacter  | Data Source       | No             | —                     |
| sceneBuilder         | Data Source       | No             | —                     |
| initialPrompt        | Text Processing   | Yes (if adapters) | `/api/inject-persona` |
| promptEnhancer       | Text Processing   | Yes            | `/api/enhance` + optional `/api/inject-persona` |
| translator           | Text Processing   | Yes            | `/api/translate`      |
| storyTeller          | Text Processing   | Yes            | `/api/storyteller` + optional `/api/inject-persona` |
| grammarFix           | Text Processing   | Yes            | `/api/grammar-fix`    |
| compressor           | Text Processing   | Yes (if >2500 chars) | `/api/compress` |
| imageDescriber       | Image Processing  | Yes            | `/api/describe`       |
| imageGenerator       | Image Processing  | Yes            | `/api/generate-image` |
| personasReplacer     | Image Processing  | Yes            | `/api/replace`        |
| textOutput           | Output            | No             | —                     |

### Shared Utilities

**File:** `src/modules/image-gen-editor/engine/executor/utils.ts`

- `mergeInputText(inputs)` — joins upstream `.text`, `.replacePrompt`, `.injectedPrompt`, `.personaDescription` with `\n\n`
- `extractPersonas(adapterInputs)` — filters adapter outputs to those with `personaDescription`, maps to `{ name, description }[]`
- `injectPersonasIfPresent(text, adapterInputs, providerId, maxTokens?, model?)` — if personas exist, calls `/api/inject-persona` to merge them into the text
- `LANGUAGE_NAMES` — 28-entry map of language code → full name

### NodeOutput Shape

```typescript
interface NodeOutput {
  text?: string;              // Text result
  image?: string;             // Base64 data URL (image generation / describer)
  personaDescription?: string; // Character persona description
  personaName?: string;        // Character name
  replacePrompt?: string;      // Persona replacement result
  injectedPrompt?: string;     // Persona-injected prompt
  error?: string;              // Error message
  durationMs?: number;         // Execution time
}
```

### Problems with Client-Side Execution

1. **N round trips** — A 6-node pipeline = 6 separate browser→server→AI→server→browser hops
2. **No parallel branches** — The `for` loop is sequential even when DAG branches are independent
3. **Fragile** — Tab close mid-execution = inconsistent state, no recovery
4. **Provider IDs exposed** — Every `fetch()` body includes `providerId` + `model` in DevTools
5. **No server-side caching** — Identical inputs re-execute from scratch
6. **No rate limiting** — 100-node graph = 100 unthrottled API calls from browser
7. **Main thread blocking** — Image compression in `image-utils.ts` uses Canvas on main thread

---

## 2. Target Architecture (Server-Side)

### Overview

```
Browser                                          FastAPI Server
  |                                                   |
  |-- POST /api/v1/flows/execute ------------------->|
  |     { flowId, nodes, edges, providerId,           |
  |       triggerNodeId?, cachedOutputs? }             |
  |                                                   |-- 1. Kahn's topo sort
  |                                                   |-- 2. Resolve models per node
  |                                                   |-- 3. FOR each step:
  |                                                   |       |-- Call AI provider directly
  |                                                   |       |-- (parallel branches concurrent)
  |<-- SSE: node-status { nodeId, status: "pending" } |
  |<-- SSE: node-status { nodeId, status: "running" } |
  |<-- SSE: node-output  { nodeId, output }           |
  |<-- SSE: node-status { nodeId, status: "complete" }|
  |     ...                                           |
  |<-- SSE: execution-complete { outputs }            |
  |                                                   |
```

### Key Differences

| Aspect             | Current (Browser)                      | Target (Server)                           |
|--------------------|----------------------------------------|-------------------------------------------|
| Orchestration      | `runner.ts` in browser                 | Python runner on FastAPI                  |
| AI calls           | Browser → Next.js route → AI API       | Server → AI API directly                  |
| Status updates     | Synchronous callbacks in same process  | SSE stream to browser                     |
| Branch execution   | Sequential always                      | Parallel for independent branches         |
| API keys           | On Next.js server (env vars)           | On FastAPI server (env vars)              |
| Provider exposure  | providerId in browser network requests | Hidden — server resolves internally       |
| Caching            | None                                   | Server can cache by input hash            |
| Rate limiting      | None                                   | Per-user, per-provider throttling         |
| Tab close          | Execution dies                         | Server can finish + store results         |
| Image compression  | Canvas on main thread (freezes UI)     | Server-side (Pillow / sharp)              |

### Partial Re-Execution (`runFromNode`)

The server supports the same cached-output pattern:

```json
POST /api/v1/flows/execute
{
  "flow_id": "abc-123",
  "nodes": [...],
  "edges": [...],
  "provider_id": "mistral",
  "trigger_node_id": "node-5",
  "cached_outputs": {
    "node-1": { "text": "previously computed text..." },
    "node-3": { "text": "..." }
  }
}
```

The server runs `getUpstreamNodes(triggerNodeId)` to find ancestors, filters the topo sort to only include the trigger node + its unexecuted ancestors + all downstream nodes, and uses `cached_outputs` for already-computed nodes.

---

## 3. SSE Event Protocol

### Event Types

```
event: node-status
data: { "node_id": "node-1", "status": "pending" }

event: node-status
data: { "node_id": "node-1", "status": "running" }

event: node-output
data: { "node_id": "node-1", "output": { "text": "...", "durationMs": 1234 } }

event: node-status
data: { "node_id": "node-1", "status": "complete" }

event: node-status
data: { "node_id": "node-2", "status": "error", "error": "Upstream node failed" }

event: execution-complete
data: { "outputs": { "node-1": {...}, "node-2": {...} } }

event: execution-error
data: { "error": "Graph contains a cycle" }
```

### Mapping to Frontend

The existing `StatusCallback` signature stays the same:

```typescript
type StatusCallback = (
  nodeId: string,
  status: NodeExecutionStatus,
  output?: NodeOutput
) => void;
```

The SSE client maps events:

| SSE Event             | Frontend Action                                |
|-----------------------|------------------------------------------------|
| `node-status`         | `onStatus(nodeId, status)`                     |
| `node-output`         | `onStatus(nodeId, status, output)` + store output |
| `execution-complete`  | Mark execution as done, store all outputs      |
| `execution-error`     | Set global error, stop execution               |

---

## 4. What Gets Ported to Python

### 4.1 Graph Analysis Module

Port these TypeScript modules to a Python `graph/` package:

| TypeScript Source                        | Python Target                    | Logic                                |
|------------------------------------------|----------------------------------|--------------------------------------|
| `engine/graph/topological-sort.ts`       | `graph/topological_sort.py`      | Kahn's algorithm, cycle detection    |
| `engine/graph/edge-classification.ts`    | `graph/edge_classification.py`   | Text vs adapter edge filtering       |
| `engine/graph/traversal.ts`             | `graph/traversal.py`            | BFS upstream/downstream              |

### 4.2 Runner

| TypeScript Source     | Python Target      | Logic                                              |
|-----------------------|--------------------|----------------------------------------------------|
| `engine/runner.ts`    | `runner.py`        | Topo sort → sequential/parallel loop → status emit |

### 4.3 Executors

Each executor becomes a Python async function:

| TypeScript Source                         | Python Target                   | API Calls                           |
|-------------------------------------------|---------------------------------|-------------------------------------|
| `executor/data-sources.ts`               | `executors/data_sources.py`     | None (pure data pass-through)       |
| `executor/text-processing.ts`            | `executors/text_processing.py`  | Direct LLM calls (no Next.js hop)   |
| `executor/image-processing.ts`           | `executors/image_processing.py` | Direct vision/image API calls       |
| `executor/output.ts`                     | `executors/output.py`           | None (merge inputs)                 |
| `executor/utils.ts`                      | `executors/utils.py`            | `merge_input_text`, `extract_personas`, `inject_personas` |
| `executor/ExecutorManager.ts`            | `executors/registry.py`         | Dict of node_type → executor fn     |

### 4.4 Prompt Templates

All prompt templates currently live in the Next.js API routes. They move to Python:

| Next.js Route                   | Prompt Purpose                        | Python Target                       |
|---------------------------------|---------------------------------------|-------------------------------------|
| `/api/enhance`                  | Prompt enhancement (with/without notes) | `prompts/enhance.py`              |
| `/api/translate`                | Translation to target language        | `prompts/translate.py`              |
| `/api/describe`                 | Image description (3 variants: ref-only, persona-only, both) + Claude variant | `prompts/describe.py` |
| `/api/replace`                  | Persona replacement in image descriptions | `prompts/replace.py`            |
| `/api/storyteller`              | Creative narrative generation         | `prompts/storyteller.py`            |
| `/api/grammar-fix`              | Grammar correction + optional style   | `prompts/grammar_fix.py`           |
| `/api/compress`                 | Text compression                      | `prompts/compress.py`               |
| `/api/inject-persona`           | Merge character traits into prompts   | `prompts/inject_persona.py`        |
| `/api/generate-image`           | Image generation (passthrough)        | `prompts/generate_image.py`        |

### 4.5 Provider Clients

| TypeScript Source          | Python Target             | What It Does                                    |
|----------------------------|---------------------------|-------------------------------------------------|
| `lib/providers.ts`         | `providers/text.py`       | OpenAI SDK clients for Mistral, GLM, OpenRouter, HuggingFace |
| `lib/image-providers.ts`   | `providers/image.py`      | HuggingFace FLUX + GLM-Image generation         |
| Claude CLI adapter          | `providers/claude.py`     | Claude API (replace CLI with direct API)        |

### 4.6 Configuration

| TypeScript Source              | Python Target              | What It Contains                          |
|--------------------------------|----------------------------|-------------------------------------------|
| `model-defaults.ts`           | `config/model_defaults.py` | Per-node-type provider + model assignments |
| `scene-prompts.ts`            | `config/scene_prompts.py`  | 50+ scene attribute prompt templates       |
| `image-utils.ts`              | `utils/image.py`           | Image resize/compress (Pillow instead of Canvas) |

---

## 5. Detailed Executor Logic Reference

### 5.1 Data Sources (No API calls)

**consistentCharacter** — Returns `{ text, personaDescription, personaName }` from `nodeData.characterDescription` and `nodeData.characterName`. Error if no character selected.

**sceneBuilder** — Reads 7 dropdown keys (`imageStyle`, `lighting`, `timeOfDay`, `weather`, `cameraAngle`, `cameraLens`, `mood`) from `nodeData`, calls `composeScenePrompt()` which joins the matching prompt blocks with `\n\n`.

### 5.2 Text Processing

**initialPrompt** — Reads `nodeData.text`. If adapter personas exist, calls `injectPersonasIfPresent()` which sends to `/api/inject-persona`. Returns the (optionally persona-injected) text.

**promptEnhancer** — Merges upstream text via `mergeInputText()`. Sends `{ text, notes?, providerId, model }` to `/api/enhance`. Then optionally injects personas.

**translator** — Merges upstream text. Maps `nodeData.language` code to full name via `LANGUAGE_NAMES`. Sends `{ text, language, providerId, model }` to `/api/translate`. No language selected = pass-through.

**storyTeller** — Merges upstream text OR reads `nodeData.idea`. Sends `{ text, tags?, providerId, model }` to `/api/storyteller`. Then optionally injects personas.

**grammarFix** — Merges upstream text. Sends `{ text, style?, providerId, model }` to `/api/grammar-fix`.

**compressor** — Merges upstream text. If under 2500 chars, pass-through. Otherwise sends `{ text, providerId, model }` to `/api/compress`.

### 5.3 Image Processing

**imageDescriber** — Reads `nodeData.image` (base64) and `nodeData.notes`. Sends `{ images: [{data, filename, type: "reference"}], providerId, model, text? }` to `/api/describe`. Returns `{ text: description, image }`.

**imageGenerator** — Merges upstream text OR reads `nodeData.prompt`. Sends `{ prompt, providerId?, model?, width?, height? }` to `/api/generate-image`. Returns `{ image: base64, text: prompt }`.

**personasReplacer** — Prefers upstream image over `nodeData.image`. Extracts personas from adapters. Sends `{ personas, targetImage, providerId, model, upstreamDescription? }` to `/api/replace`. If upstream text exists, the route does text-only persona swap instead of re-analyzing the image with VLM.

### 5.4 Output

**textOutput** — Calls `mergeInputText(inputs)`. Returns merged text. No API call.

---

## 6. Prompt Template Catalog

### enhance (Prompt Enhancement)

Two variants:

**With notes:**
```
You are an expert prompt engineer specializing in AI image generation prompts.
Take the following prompt and enhance it according to the instructions provided.

## ORIGINAL PROMPT:
{text}

## ENHANCEMENT INSTRUCTIONS:
{notes}

Apply the enhancement instructions to improve the original prompt...
Output ONLY the enhanced prompt. Keep under 2500 characters.
```

**Without notes:**
```
You are an expert prompt engineer specializing in AI image generation prompts.
Take this simple prompt and transform it into a detailed, rich prompt...
Output ONLY the enhanced prompt. Keep under 2500 characters.
```

### translate

```
Translate the following text to {language}.
Output ONLY the translation, nothing else.
Keep under 2500 characters.

{text}
```

### storyteller

```
You are a wildly creative storyteller and wordsmith...
RULES:
- Every time you receive the same concept, create DIFFERENT interpretation
- Be bold and surprising. Subvert expectations
- Focus on words, emotions, atmosphere, character — NOT visual descriptions
- Use rich literary language: metaphors, rhythm, sensory details
- Format as clean markdown (## headings, paragraphs, *italics*, no **bold**)
- Output ONLY the story. Keep under 2500 characters

CONCEPT: {text}
STYLE TAGS: {tags}  (optional)
```
Temperature: 0.95

### grammar-fix

```
You are a proofreader. Fix all grammar, spelling, and punctuation errors.
{optional: After fixing, lightly adjust tone to be more {style}}
Output ONLY the corrected text. Preserve original structure and length.

{text}
```

### compress

```
Compress the following text to be shorter while preserving ALL information.
Output ONLY the compressed text.

{text}
```

### inject-persona

```
You are an expert prompt engineer specializing in AI image generation prompts.
Your task is to inject specific character appearance details into an existing prompt.

## CHARACTERS:
### {name}
{description}
(repeated for each persona)

## ORIGINAL PROMPT:
{promptText}

## YOUR TASK:
Rewrite the original prompt so that each named character's physical appearance
is injected where they are referenced.
Rules:
1. KEEP everything from original (scene, setting, clothing, pose, action...)
2. REPLACE/ENRICH character references with physical traits
3. Unmatched character names stay as-is
4. Generic "a woman" with single character → replace with traits
5. MERGE naturally into sentences
6. Do NOT add clothing from CHARACTER descriptions — only physical traits
7. Use traits exactly as described
8. If no character reference, add characters naturally into the scene
Output ONLY the rewritten prompt. Keep under 2500 characters.
```

### describe (Image Description)

Three variants depending on input combination. Each has a standard version and a Claude-specific version (cleaner framing). See `src/app/api/describe/route.ts` for full prompts.

Also supports Florence-2 via HuggingFace Inference (not chat-based).

### replace (Persona Replacement)

Handles single-persona and multi-persona scenarios. If `upstreamDescription` is provided, does text-only swap. Otherwise, analyzes image via vision model. See `src/app/api/replace/route.ts` for full prompts.

### generate-image

Pure passthrough — sends `{ prompt, model, width, height, steps, seed, negativePrompt }` to the image provider's `generate()` function.

---

## 7. Migration Phases

### Phase 1: Graph Engine in Python

Port the graph analysis and runner — no AI calls yet, just the skeleton:

- `graph/topological_sort.py` — Kahn's algorithm
- `graph/edge_classification.py` — text vs adapter edge filtering
- `graph/traversal.py` — BFS upstream/downstream
- `runner.py` — execution loop with status emission
- `executors/registry.py` — node_type → executor mapping
- `executors/utils.py` — `merge_input_text`, `extract_personas`
- `models.py` — Pydantic models for `ExecutionStep`, `NodeOutput`, `NodeExecutionContext`
- Unit tests for topo sort, edge classification, traversal

### Phase 2: Data Source + Output Executors

No AI calls — pure data transformation:

- `executors/data_sources.py` — `consistent_character`, `scene_builder`
- `executors/output.py` — `text_output`
- `config/scene_prompts.py` — port scene prompt templates
- `config/model_defaults.py` — port model defaults table

### Phase 3: Text Provider Clients

Set up OpenAI SDK + Claude API in Python:

- `providers/text.py` — Mistral, GLM, OpenRouter, HuggingFace (OpenAI-compatible)
- `providers/claude.py` — Claude API (direct, not CLI)
- `providers/registry.py` — `get_provider(provider_id)` factory
- Environment variable configuration

### Phase 4: Text Processing Executors + Prompt Templates

- `executors/text_processing.py` — all 6 text executors calling providers directly
- `prompts/enhance.py`, `prompts/translate.py`, `prompts/storyteller.py`, `prompts/grammar_fix.py`, `prompts/compress.py`, `prompts/inject_persona.py`
- These executors call the provider clients directly (no HTTP hop)

### Phase 5: Image Provider Clients

- `providers/image.py` — HuggingFace FLUX + GLM-Image
- `utils/image.py` — server-side image resize/compress (Pillow)

### Phase 6: Image Processing Executors + Prompt Templates

- `executors/image_processing.py` — `image_describer`, `image_generator`, `personas_replacer`
- `prompts/describe.py`, `prompts/replace.py`
- Florence-2 integration

### Phase 7: SSE Endpoint

- `POST /api/v1/flows/execute` — accepts graph, streams SSE events
- Integrate runner with SSE response
- Support `trigger_node_id` + `cached_outputs` for partial re-execution
- Auth: validate JWT from request header

### Phase 8: Frontend Swap

- Replace `executeGraph()` in `runner.ts` with SSE client
- New function: `executeGraphRemote(nodes, edges, providerId, onStatus, triggerNodeId?, cachedOutputs?)`
- Uses `EventSource` or `fetch()` with `ReadableStream` to consume SSE
- Maps events to existing `onStatus` callbacks
- Flow store / UI unchanged

### Phase 9: Cleanup

- Remove Next.js API routes (`/api/enhance`, `/api/translate`, etc.)
- Remove `src/lib/providers.ts` and `src/lib/image-providers.ts` (server owns this now)
- Remove client-side executor files (optional — keep as fallback)
- Update `model-defaults.ts` to fetch from server
- Remove `image-utils.ts` (server handles image prep)

---

## 8. File Reference Tables

### Current Frontend → Target Python

| Frontend File                                    | Python Module                    |
|--------------------------------------------------|----------------------------------|
| `engine/graph/topological-sort.ts`               | `graph/topological_sort.py`      |
| `engine/graph/edge-classification.ts`            | `graph/edge_classification.py`   |
| `engine/graph/traversal.ts`                      | `graph/traversal.py`            |
| `engine/runner.ts`                               | `runner.py`                      |
| `engine/types.ts`                                | `models.py` (Pydantic)          |
| `engine/executor/ExecutorManager.ts`             | `executors/registry.py`          |
| `engine/executor/utils.ts`                       | `executors/utils.py`             |
| `engine/executor/data-sources.ts`                | `executors/data_sources.py`      |
| `engine/executor/text-processing.ts`             | `executors/text_processing.py`   |
| `engine/executor/image-processing.ts`            | `executors/image_processing.py`  |
| `engine/executor/output.ts`                      | `executors/output.py`            |
| `model-defaults.ts`                              | `config/model_defaults.py`       |
| `scene-prompts.ts`                               | `config/scene_prompts.py`        |
| `image-utils.ts`                                 | `utils/image.py`                 |
| `lib/providers.ts`                               | `providers/text.py`              |
| `lib/image-providers.ts`                         | `providers/image.py`             |
| `app/api/enhance/route.ts`                       | `prompts/enhance.py`             |
| `app/api/translate/route.ts`                     | `prompts/translate.py`           |
| `app/api/describe/route.ts`                      | `prompts/describe.py`            |
| `app/api/replace/route.ts`                       | `prompts/replace.py`             |
| `app/api/storyteller/route.ts`                   | `prompts/storyteller.py`         |
| `app/api/grammar-fix/route.ts`                   | `prompts/grammar_fix.py`         |
| `app/api/compress/route.ts`                      | `prompts/compress.py`            |
| `app/api/inject-persona/route.ts`                | `prompts/inject_persona.py`      |
| `app/api/generate-image/route.ts`                | `prompts/generate_image.py`      |

### Executor → API Endpoint → Prompt Template

| Executor           | Current Next.js Endpoint   | Response Key   | Prompt Template File       |
|--------------------|----------------------------|----------------|----------------------------|
| initialPrompt      | `/api/inject-persona`      | `injected`     | `prompts/inject_persona.py`|
| promptEnhancer     | `/api/enhance`             | `enhanced`     | `prompts/enhance.py`       |
| translator         | `/api/translate`           | `translation`  | `prompts/translate.py`     |
| storyTeller        | `/api/storyteller`         | `story`        | `prompts/storyteller.py`   |
| grammarFix         | `/api/grammar-fix`         | `fixed`        | `prompts/grammar_fix.py`   |
| compressor         | `/api/compress`            | `compressed`   | `prompts/compress.py`      |
| imageDescriber     | `/api/describe`            | `description`  | `prompts/describe.py`      |
| imageGenerator     | `/api/generate-image`      | `imageData`    | `prompts/generate_image.py`|
| personasReplacer   | `/api/replace`             | `description`  | `prompts/replace.py`       |

### Provider Configuration

| Provider     | SDK              | Base URL                                    | Models                                     |
|--------------|------------------|---------------------------------------------|--------------------------------------------|
| Mistral      | OpenAI (compat)  | `https://api.mistral.ai/v1`                | ministral-14b-2512, labs-mistral-small-creative, pixtral-12b-2409 |
| GLM          | OpenAI (compat)  | `https://api.z.ai/api/coding/paas/v4`     | glm-4.7, glm-4.7-flashx, glm-4.7-flash, glm-4.6v |
| OpenRouter   | OpenAI (compat)  | `https://openrouter.ai/api/v1`             | dolphin-mistral-24b (free)                 |
| HuggingFace  | OpenAI (compat)  | `https://router.huggingface.co/v1`         | Qwen2.5-72B, Qwen2.5-VL-7B               |
| Claude       | Anthropic SDK    | Direct API                                  | (configurable)                             |
| HF Image     | REST             | `https://router.huggingface.co/hf-inference/models/` | FLUX.1-schnell, FLUX.1-dev   |
| GLM-Image    | REST             | `https://api.z.ai/api/paas/v4/images/generations`   | glm-image                    |

---

## 9. Suggested Python Package Structure

```
backend/
└── execution/
    ├── __init__.py
    ├── models.py                    # Pydantic: ExecutionStep, NodeOutput, NodeContext
    ├── runner.py                    # Main execution loop + SSE emission
    ├── graph/
    │   ├── __init__.py
    │   ├── topological_sort.py      # Kahn's algorithm
    │   ├── edge_classification.py   # Text vs adapter edges
    │   └── traversal.py            # BFS upstream/downstream
    ├── executors/
    │   ├── __init__.py
    │   ├── registry.py              # node_type → executor mapping
    │   ├── utils.py                 # merge_input_text, extract_personas
    │   ├── data_sources.py          # consistent_character, scene_builder
    │   ├── text_processing.py       # 6 text executors
    │   ├── image_processing.py      # 3 image executors
    │   └── output.py               # text_output
    ├── prompts/
    │   ├── __init__.py
    │   ├── enhance.py
    │   ├── translate.py
    │   ├── describe.py
    │   ├── replace.py
    │   ├── storyteller.py
    │   ├── grammar_fix.py
    │   ├── compress.py
    │   ├── inject_persona.py
    │   └── generate_image.py
    ├── providers/
    │   ├── __init__.py
    │   ├── text.py                  # OpenAI-compat clients
    │   ├── image.py                 # HuggingFace FLUX + GLM-Image
    │   ├── claude.py                # Anthropic SDK
    │   └── registry.py             # get_provider(), get_image_provider()
    ├── config/
    │   ├── __init__.py
    │   ├── model_defaults.py        # Per-node-type defaults
    │   └── scene_prompts.py         # 50+ scene prompt templates
    └── utils/
        ├── __init__.py
        └── image.py                 # Pillow-based resize/compress
```
