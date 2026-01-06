/**
 * Factory for creating orchestrators from configuration
 */

import { Orchestrator } from '../core/orchestrator.js';
import { ConfigurationError, ProviderError } from '../core/errors.js';
import type {
  OrchestratorConfig,
  ProviderConfig,
  StrategyConfig,
  AIService,
  SelectionStrategy,
} from '../core/interfaces.js';

import {
  RoundRobinStrategy,
  PriorityStrategy,
  FallbackStrategy,
  WeightedStrategy,
  HealthAwareStrategy,
  type PriorityStrategyConfig,
  type FallbackStrategyConfig,
  type WeightedStrategyConfig,
  type HealthAwareStrategyConfig,
} from '../strategies/index.js';

import {
  GroqProvider,
  OpenRouterProvider,
  GeminiProvider,
  CerebrasProvider,
  LocalProvider,
  type GroqProviderConfig,
  type OpenRouterProviderConfig,
  type GeminiProviderConfig,
  type CerebrasProviderConfig,
  type LocalProviderConfig,
} from '../providers/index.js';

/**
 * Create a provider instance from configuration
 */
function createProvider(config: ProviderConfig): AIService {
  const { type, id, enabled = true, apiKey, baseURL, model, ...rest } = config;

  if (!id || typeof id !== 'string') {
    throw new ConfigurationError(`Provider must have a valid id`);
  }

  if (!type || typeof type !== 'string') {
    throw new ConfigurationError(`Provider ${id} must have a type`);
  }

  if (!enabled) {
    throw new ConfigurationError(`Provider ${id} is disabled`);
  }

  try {
    switch (type.toLowerCase()) {
      case 'groq':
        if (!apiKey) {
          throw new ConfigurationError(`Provider ${id} (groq) requires apiKey`);
        }
        return new GroqProvider({
          id,
          apiKey,
          model,
          baseURL,
          ...rest,
        } as GroqProviderConfig);

      case 'openrouter':
        if (!apiKey) {
          throw new ConfigurationError(
            `Provider ${id} (openrouter) requires apiKey`
          );
        }
        return new OpenRouterProvider({
          id,
          apiKey,
          model,
          baseURL,
          ...rest,
        } as OpenRouterProviderConfig);

      case 'gemini':
        if (!apiKey) {
          throw new ConfigurationError(`Provider ${id} (gemini) requires apiKey`);
        }
        return new GeminiProvider({
          id,
          apiKey,
          model,
          baseURL,
          ...rest,
        } as GeminiProviderConfig);

      case 'cerebras':
        if (!apiKey) {
          throw new ConfigurationError(`Provider ${id} (cerebras) requires apiKey`);
        }
        return new CerebrasProvider({
          id,
          apiKey,
          model,
          baseURL,
          ...rest,
        } as CerebrasProviderConfig);

      case 'local':
        if (!baseURL) {
          throw new ConfigurationError(
            `Provider ${id} (local) requires baseURL`
          );
        }
        return new LocalProvider({
          id,
          baseURL,
          model,
          apiKey,
          ...rest,
        } as LocalProviderConfig);

      default:
        throw new ConfigurationError(`Unknown provider type: ${type}`);
    }
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    throw new ProviderError(
      `Failed to create provider ${id}`,
      id,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Create a strategy instance from configuration
 */
function createStrategy(config: StrategyConfig): SelectionStrategy {
  const { type, ...rest } = config;

  if (!type || typeof type !== 'string') {
    throw new ConfigurationError('Strategy must have a type');
  }

  try {
    switch (type.toLowerCase()) {
      case 'round-robin':
      case 'roundrobin':
        return new RoundRobinStrategy();

      case 'priority':
        return new PriorityStrategy(rest as PriorityStrategyConfig);

      case 'fallback':
        return new FallbackStrategy(rest as FallbackStrategyConfig);

      case 'weighted':
        return new WeightedStrategy(rest as WeightedStrategyConfig);

      case 'health-aware':
      case 'healthaware':
        return new HealthAwareStrategy(rest as HealthAwareStrategyConfig);

      default:
        throw new ConfigurationError(`Unknown strategy type: ${type}`);
    }
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    throw new ConfigurationError(
      `Failed to create strategy: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Create an orchestrator from configuration
 */
export function createOrchestrator(config: OrchestratorConfig): Orchestrator {
  // Validate configuration
  if (!isValidOrchestratorConfig(config)) {
    throw new ConfigurationError('Invalid orchestrator configuration');
  }

  if (config.providers.length === 0) {
    throw new ConfigurationError('At least one provider is required');
  }

  // Create strategy
  const strategy = createStrategy(config.strategy);

  // Create orchestrator
  const orchestrator = new Orchestrator(strategy);

  // Register providers
  const registeredProviders: string[] = [];
  for (const providerConfig of config.providers) {
    if (providerConfig.enabled !== false) {
      try {
        const provider = createProvider(providerConfig);
        orchestrator.registerProvider(provider);
        registeredProviders.push(providerConfig.id);
      } catch (error) {
        console.warn(
          `Failed to create provider ${providerConfig.id}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  if (registeredProviders.length === 0) {
    throw new ConfigurationError(
      'No providers could be created. Check your configuration.'
    );
  }

  // Start health checks if enabled
  if (config.enableHealthChecks && config.healthCheckInterval) {
    if (config.healthCheckInterval < 1000) {
      console.warn(
        'Health check interval is very low (< 1000ms). Consider using at least 1000ms.'
      );
    }
    orchestrator.startHealthChecks(config.healthCheckInterval);
  }

  return orchestrator;
}

/**
 * Type guard to check if a config is valid
 */
export function isValidOrchestratorConfig(
  config: unknown
): config is OrchestratorConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const c = config as Record<string, unknown>;

  if (!Array.isArray(c.providers) || c.providers.length === 0) {
    return false;
  }

  if (!c.strategy || typeof c.strategy !== 'object') {
    return false;
  }

  const strategy = c.strategy as Record<string, unknown>;
  if (typeof strategy.type !== 'string') {
    return false;
  }

  return true;
}

