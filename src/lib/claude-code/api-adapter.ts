/**
 * Claude Code API Adapter
 *
 * Bridges the Claude CLI integration with the API route handlers.
 * Throws on failure (matching OpenAI SDK behavior) so existing catch blocks work.
 */

import { runClaude, runClaudeWithBase64Images } from "./index";
import { ClaudeCodeBase64Image } from "./types";

export async function callClaudeVision(
  prompt: string,
  images: ClaudeCodeBase64Image[]
): Promise<string> {
  const result = await runClaudeWithBase64Images(prompt, images);
  if (!result.success) {
    throw new Error(result.error || "Claude CLI call failed");
  }
  return result.output;
}

export async function callClaudeText(prompt: string): Promise<string> {
  const result = await runClaude(prompt);
  if (!result.success) {
    throw new Error(result.error || "Claude CLI call failed");
  }
  return result.output;
}
