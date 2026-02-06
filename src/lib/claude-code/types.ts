/**
 * Claude Code CLI Integration Types
 */

export interface ClaudeCodeOptions {
  /** Timeout in milliseconds (default: 120000 = 2 minutes) */
  timeout?: number;
  /** Working directory for the claude process */
  cwd?: string;
  /** Model to use (if supported by CC flags) */
  model?: string;
}

export interface ClaudeCodeResult {
  /** Whether the execution succeeded */
  success: boolean;
  /** The output from Claude Code */
  output: string;
  /** Error message if failed */
  error?: string;
  /** Execution time in milliseconds */
  executionTime: number;
}

export interface ClaudeCodeImageInput {
  /** Path to the image file */
  path: string;
  /** Optional label for the image */
  label?: string;
}

export interface ClaudeCodeBase64Image {
  /** Base64 data URL (e.g. "data:image/jpeg;base64,...") */
  dataUrl: string;
  /** Optional label for the image */
  label?: string;
}
