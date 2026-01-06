/**
 * Core interfaces for AI providers and strategies
 */

import type {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ChatChunk,
  ProviderHealth,
  ProviderMetadata,
} from './types.js';

// Re-export types for convenience
export type {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ChatChunk,
  ProviderHealth,
  ProviderMetadata,
};

/**
 * Main interface that all AI providers must implement
 */
export interface AIService {
  /**
   * Unique identifier for this provider instance
   */
  readonly id: string;

  /**
   * Provider metadata
   */
  readonly metadata: ProviderMetadata;

  /**
   * Check the health status of this provider
   */
  checkHealth(): Promise<ProviderHealth>;

  /**
   * Perform a chat completion (non-streaming)
   */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;

  /**
   * Perform a chat completion with streaming
   */
  chatStream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ReadableStream<ChatChunk>>;
}

/**
 * Strategy interface for selecting providers
 */
export interface SelectionStrategy {
  /**
   * Select a provider from the available list
   * @param providers List of available providers
   * @param context Optional context for selection (e.g., request metadata)
   */
  select(
    providers: AIService[],
    context?: SelectionContext
  ): Promise<AIService | null>;

  /**
   * Update strategy state (e.g., after a successful/failed request)
   */
  update?(provider: AIService, success: boolean, metadata?: unknown): void;
}

/**
 * Context passed to selection strategies
 */
export interface SelectionContext {
  messages?: ChatMessage[];
  options?: ChatOptions;
  previousAttempts?: string[]; // IDs of providers already tried
  [key: string]: unknown; // Allow custom context
}

/**
 * Configuration for a provider instance
 */
export interface ProviderConfig {
  id: string;
  type: string;
  apiKey?: string;
  baseURL?: string;
  model?: string;
  enabled?: boolean;
  priority?: number;
  weight?: number;
  metadata?: Record<string, unknown>;
  [key: string]: unknown; // Allow provider-specific config
}

/**
 * Configuration for a selection strategy
 */
export interface StrategyConfig {
  type: string;
  [key: string]: unknown; // Strategy-specific config
}

/**
 * Main orchestrator configuration
 */
export interface OrchestratorConfig {
  providers: ProviderConfig[];
  strategy: StrategyConfig;
  defaultOptions?: ChatOptions;
  healthCheckInterval?: number; // milliseconds
  enableHealthChecks?: boolean;
}

