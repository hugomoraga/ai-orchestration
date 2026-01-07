/**
 * Core types and interfaces for the AI Orchestration Framework
 */

/**
 * Represents a chat message in a conversation
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Options for chat completion requests
 */
export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stream?: boolean;
  stopSequences?: string[];
  /**
   * Force the response language. When set, automatically prepends a system message
   * instructing the model to respond in the specified language.
   * 
   * Supported values: ISO 639-1 language codes (e.g., 'es', 'en', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'ru')
   * or full language names (e.g., 'spanish', 'english', 'french').
   * 
   * @example
   * ```typescript
   * await orchestrator.chat(messages, { responseLanguage: 'es' });
   * await orchestrator.chat(messages, { responseLanguage: 'spanish' });
   * ```
   */
  responseLanguage?: string;
  /**
   * Number between -2.0 and 2.0. Positive values penalize new tokens based on their
   * existing frequency in the text so far, decreasing the model's likelihood to
   * repeat the same line verbatim.
   */
  frequencyPenalty?: number;
  /**
   * Number between -2.0 and 2.0. Positive values penalize new tokens based on whether
   * they appear in the text so far, increasing the model's likelihood to talk about
   * new topics.
   */
  presencePenalty?: number;
  /**
   * If specified, the system will make a best effort to sample deterministically,
   * such that repeated requests with the same seed and parameters should return the same result.
   */
  seed?: number | null;
  /**
   * Request timeout in milliseconds. If not specified, uses the orchestrator's default timeout.
   */
  timeout?: number;
  /**
   * A unique identifier representing your end-user, which can help to monitor and detect abuse.
   */
  user?: string;
  [key: string]: unknown; // Allow provider-specific options
}

/**
 * Response from a chat completion (non-streaming)
 */
export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  finishReason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Streaming chunk from a chat completion
 */
export interface ChatChunk {
  content: string;
  done: boolean;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  finishReason?: string;
}

/**
 * Health status of a provider
 */
export interface ProviderHealth {
  healthy: boolean;
  latency?: number; // in milliseconds
  lastChecked?: Date;
  error?: string;
}

/**
 * Provider metadata
 */
export interface ProviderMetadata {
  id: string;
  name: string;
  model?: string;
  costPerToken?: {
    prompt: number;
    completion: number;
  };
  capabilities?: string[];
}

