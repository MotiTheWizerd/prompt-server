# Prompt Creator - Quick Start Guide

AI-powered image editor for generating consistent character prompts. Analyze persona images, preserve identity, and generate prompts that swap a person's face into target images while keeping clothing, pose, and background intact.

---

## Tech Stack

| Layer        | Technology                              |
| ------------ | --------------------------------------- |
| Framework    | Next.js 16.1.6 (App Router)            |
| Frontend     | React 19, Tailwind CSS 4               |
| Language     | TypeScript 5 (strict mode)             |
| AI Providers | Mistral AI (Pixtral), GLM/Zhipu (GLM-4) |
| AI SDK       | OpenAI SDK (compatible endpoints), Claude Agent SDK |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```bash
# At least one provider key is required
MISTRAL_API_KEY=your_mistral_api_key
GLM_API_KEY=your_glm_api_key
```

- **Mistral AI** - Get a key at https://console.mistral.ai/
- **GLM (Zhipu AI)** - Get a key at https://open.bigmodel.cn/

### 3. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000

---

## How It Works

The app runs a **two-step AI pipeline**:

### Step 1: Describe Persona

Upload images and the AI generates a detailed persona description.

- **Reference images** (0-5) - Scene, style, environment examples
- **Persona image** (1) - The face/identity you want to preserve
- **Text instructions** (optional) - Extra context for the AI

Output: A structured text description of the persona's face, hair, body, skin tone, and distinguishing features.

### Step 2: Replace / Generate Prompt

Using the persona description from Step 1, upload a **target image** (the person to replace). The AI produces an image-generation prompt that:

- Swaps the target's identity with the persona's face/features
- Preserves the target's clothing, pose, camera angle
- Keeps the target's background and lighting

Output: A ready-to-use prompt for AI image generation tools.

---

## Project Structure

```
src/
  app/
    page.tsx              # Main UI (two-mode editor)
    layout.tsx            # Root layout + fonts
    globals.css           # Tailwind theme + dark mode
    api/
      providers/route.ts  # GET  - list available AI providers
      describe/route.ts   # POST - Step 1: persona description
      replace/route.ts    # POST - Step 2: replacement prompt
      pipeline/route.ts   # POST - both steps in one call
  lib/
    providers.ts          # AI provider config (Mistral, GLM)
    agents/               # Agent framework (executor, types)
    claude-code/          # Claude Code CLI integration
scripts/
    run-pipeline.ts       # Full pipeline from CLI
    test-visual-agent.ts  # Test image analysis
    test-replace-agent.ts # Test replace step
```

---

## Key Files to Know

| File | What it does |
| ---- | ------------ |
| [page.tsx](src/app/page.tsx) | The entire frontend UI - image upload, provider selection, results display |
| [providers.ts](src/lib/providers.ts) | Defines AI providers, API keys, base URLs, model lists |
| [describe/route.ts](src/app/api/describe/route.ts) | Step 1 API - sends images to vision model, returns persona description |
| [replace/route.ts](src/app/api/replace/route.ts) | Step 2 API - takes description + target image, returns generation prompt |
| [pipeline/route.ts](src/app/api/pipeline/route.ts) | Runs both steps in a single request |
| [executor.ts](src/lib/agents/executor.ts) | Agent execution framework (template substitution, parallel/pipeline runs) |

---

## CLI Scripts

Run the pipeline or test individual steps from the command line:

```bash
# Full pipeline (both steps)
npm run pipeline -- -p persona.jpg -t target.jpg [-r ref1.jpg -r ref2.jpg] [-x "extra text"]

# Test visual analysis on a single image
npm run test:visual -- ./image.jpg

# Test replace step with a description
npm run test:replace -- -t target.jpg -d "persona description text"

# Test Claude Code CLI connectivity
npm run test:claude
```

---

## API Endpoints

### `GET /api/providers`
Returns available providers and their models.

### `POST /api/describe`
```json
{
  "images": [
    { "data": "base64...", "type": "reference", "filename": "scene.jpg" },
    { "data": "base64...", "type": "persona", "filename": "face.jpg" }
  ],
  "text": "optional instructions",
  "provider": "mistral",
  "model": "pixtral-12b-2409"
}
```

### `POST /api/replace`
```json
{
  "personaDescription": "detailed description from step 1...",
  "targetImage": { "data": "base64...", "filename": "target.jpg" },
  "provider": "mistral"
}
```

### `POST /api/pipeline`
Combines both steps. Requires persona image + target image. Returns:
```json
{
  "personaDescription": "...",
  "replacePrompt": "...",
  "timing": { "step1Ms": 3200, "step2Ms": 2800, "totalMs": 6000 }
}
```

---

## AI Providers

| Provider | Vision Model | Text Model | Notes |
| -------- | ------------ | ---------- | ----- |
| Mistral  | pixtral-12b-2409 | magistral-medium-2509 | Accepts full data URLs |
| GLM (Zhipu) | glm-4.6v | glm-4.7-flash | Needs raw base64 (no data URL prefix). Has 3 text model variants. Supports extended thinking. |

Both providers use OpenAI-compatible API endpoints via the OpenAI SDK.

---

## UI Features

- **Drag & drop** images into upload zones
- **Ctrl+V** to paste images from clipboard
- **Click** upload zones to use file picker
- **Provider selector** with model dropdown (GLM has multiple models)
- **Extended thinking toggle** for GLM models
- **Copy to clipboard** button on results
- **Mode switching** between Describe and Replace steps

---

## Adding a New AI Provider

Edit [providers.ts](src/lib/providers.ts):

```typescript
glm: {
  id: "your-provider",
  name: "Display Name",
  textModel: "model-name",
  visionModel: "vision-model-name",
  supportsVision: true,
  apiKey: process.env.YOUR_API_KEY || "",
  baseUrl: "https://api.provider.com/v1",
  // Optional: list of selectable models
  availableModels: ["model-a", "model-b"],
}
```

Then add `YOUR_API_KEY` to `.env.local`.

---

## Development Tips

- The frontend is a single page ([page.tsx](src/app/page.tsx)) with all state managed via React hooks (no Redux/Context)
- Images are converted to base64 on the client before sending to API routes
- The agent framework in [src/lib/agents/](src/lib/agents/) supports template-based prompts with `{{variable}}` substitution, parallel execution, and pipeline chaining - it's ready for extension but not yet wired into the main flow
- The Claude Code integration in [src/lib/claude-code/](src/lib/claude-code/) wraps the Claude CLI for text and multimodal tasks
- All API routes are in `src/app/api/` following Next.js App Router conventions
- Tailwind v4 is used with a dark-first gradient theme
