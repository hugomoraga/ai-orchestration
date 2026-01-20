/**
 * AI Orchestration Framework
 * Main entry point
 */

// Core exports
export { Orchestrator } from './core/orchestrator.js';
export { MetricsCollector } from './core/metrics.js';
export type {
  AIService,
  SelectionStrategy,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ChatChunk,
  ProviderHealth,
  ProviderMetadata,
  SelectionContext,
  ProviderConfig,
  StrategyConfig,
  OrchestratorConfig,
  CircuitBreakerConfig,
  HealthCheckConfig,
} from './core/interfaces.js';
export type {
  ProviderMetrics,
  StrategyMetrics,
  OrchestratorMetrics,
  MetricsEvent,
  MetricsCallback,
} from './core/metrics.js';
// Also export from types for direct access
export type {
  ChatMessage as ChatMessageType,
  ChatOptions as ChatOptionsType,
  ChatResponse as ChatResponseType,
  ChatChunk as ChatChunkType,
  ProviderHealth as ProviderHealthType,
  ProviderMetadata as ProviderMetadataType,
  ImageContent,
  TextContent,
  ContentPart,
  ImageGenerationOptions,
  ImageGenerationResponse,
  GeneratedImage,
} from './core/types.js';

// Error exports
export {
  ProviderError,
  StrategyError,
  OrchestratorError,
  ConfigurationError,
} from './core/errors.js';

// Strategy exports
export {
  RoundRobinStrategy,
  PriorityStrategy,
  FallbackStrategy,
  WeightedStrategy,
  HealthAwareStrategy,
} from './strategies/index.js';
export type {
  PriorityStrategyConfig,
  FallbackStrategyConfig,
  WeightedStrategyConfig,
  HealthAwareStrategyConfig,
} from './strategies/index.js';

// Provider exports
export {
  GroqProvider,
  OpenRouterProvider,
  OpenAIProvider,
  GeminiProvider,
  CerebrasProvider,
  LocalProvider,
} from './providers/index.js';
export type {
  GroqProviderConfig,
  OpenRouterProviderConfig,
  OpenAIProviderConfig,
  GeminiProviderConfig,
  CerebrasProviderConfig,
  LocalProviderConfig,
} from './providers/index.js';

// Factory exports
export {
  createOrchestrator,
  isValidOrchestratorConfig,
} from './factory/index.js';

