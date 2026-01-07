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
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /**
   * Enable circuit breaker functionality
   */
  enabled?: boolean;
  /**
   * Number of consecutive failures before opening the circuit
   */
  failureThreshold?: number;
  /**
   * Time in milliseconds before attempting to reset the circuit
   */
  resetTimeout?: number;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  /**
   * Interval between health checks in milliseconds
   */
  interval?: number;
  /**
   * Timeout for individual health checks in milliseconds
   */
  timeout?: number;
  /**
   * Maximum consecutive failures before marking provider as unhealthy
   */
  maxConsecutiveFailures?: number;
  /**
   * Maximum latency threshold in milliseconds. Providers exceeding this will be marked unhealthy.
   */
  latencyThreshold?: number;
  /**
   * Enable periodic health checks
   */
  enabled?: boolean;
}

/**
 * Main orchestrator configuration
 */
export interface OrchestratorConfig {
  providers: ProviderConfig[];
  strategy: StrategyConfig;
  defaultOptions?: ChatOptions;
  /**
   * Maximum number of retry attempts before giving up.
   * Defaults to the number of providers if not specified.
   */
  maxRetries?: number;
  /**
   * Global timeout for all requests in milliseconds.
   * Defaults to 30000 (30 seconds) if not specified.
   */
  requestTimeout?: number;
  /**
   * Delay between retries in milliseconds, or 'exponential' for exponential backoff.
   * Defaults to 1000 (1 second) if not specified.
   */
  retryDelay?: number | 'exponential';
  /**
   * Circuit breaker configuration
   */
  circuitBreaker?: CircuitBreakerConfig;
  /**
   * Health check configuration
   */
  healthCheck?: HealthCheckConfig;
  /**
   * Enable metrics collection (default: true)
   */
  enableMetrics?: boolean;
  /**
   * Callback for metrics events
   */
  onMetricsEvent?: import('./metrics.js').MetricsCallback;
  /**
   * @deprecated Use healthCheck.enabled instead
   */
  enableHealthChecks?: boolean;
  /**
   * @deprecated Use healthCheck.interval instead
   */
  healthCheckInterval?: number;
}

