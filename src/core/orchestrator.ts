/**
 * Core orchestrator that manages providers and strategies
 */

import type {
  AIService,
  SelectionStrategy,
  SelectionContext,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ChatChunk,
  CircuitBreakerConfig,
  HealthCheckConfig,
  ImageGenerationOptions,
  ImageGenerationResponse,
} from './interfaces.js';
import { MetricsCollector, type MetricsCallback } from './metrics.js';

/**
 * Language instruction mapping
 */
const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  // ISO 639-1 codes
  es: 'Responde siempre en español.',
  en: 'Respond always in English.',
  fr: 'Répondez toujours en français.',
  de: 'Antworte immer auf Deutsch.',
  it: 'Rispondi sempre in italiano.',
  pt: 'Responda sempre em português.',
  ja: '常に日本語で回答してください。',
  zh: '请始终用中文回答。',
  ru: 'Всегда отвечайте на русском языке.',
  ko: '항상 한국어로 답변하세요.',
  ar: 'أجب دائماً بالعربية.',
  hi: 'हमेशा हिंदी में उत्तर दें।',
  nl: 'Antwoord altijd in het Nederlands.',
  pl: 'Zawsze odpowiadaj po polsku.',
  sv: 'Svara alltid på svenska.',
  tr: 'Her zaman Türkçe cevap verin.',
  // Full language names
  spanish: 'Responde siempre en español.',
  english: 'Respond always in English.',
  french: 'Répondez toujours en français.',
  german: 'Antworte immer auf Deutsch.',
  italian: 'Rispondi sempre in italiano.',
  portuguese: 'Responda sempre em português.',
  japanese: '常に日本語で回答してください。',
  chinese: '请始终用中文回答。',
  russian: 'Всегда отвечайте на русском языке.',
  korean: '항상 한국어로 답변하세요.',
  arabic: 'أجب دائماً بالعربية.',
  hindi: 'हमेशा हिंदी में उत्तर दें।',
  dutch: 'Antwoord altijd in het Nederlands.',
  polish: 'Zawsze odpowiadaj po polsku.',
  swedish: 'Svara alltid på svenska.',
  turkish: 'Her zaman Türkçe cevap verin.',
};

/**
 * Get language instruction for a given language code or name
 */
function getLanguageInstruction(language: string): string {
  const normalized = language.toLowerCase().trim();
  return LANGUAGE_INSTRUCTIONS[normalized] || `Respond always in ${language}.`;
}

/**
 * Process messages to add language instruction if responseLanguage is specified
 */
function processMessagesWithLanguage(
  messages: ChatMessage[],
  options?: ChatOptions
): ChatMessage[] {
  if (!options?.responseLanguage) {
    return messages;
  }

  // Check if there's already a system message
  const hasSystemMessage = messages.some((msg) => msg.role === 'system');

  // If there's already a system message, prepend the language instruction to it
  if (hasSystemMessage) {
    const languageInstruction = getLanguageInstruction(options.responseLanguage);
    return messages.map((msg) => {
      if (msg.role === 'system') {
        // Handle multimodal content
        if (Array.isArray(msg.content)) {
          return {
            ...msg,
            content: [
              { type: 'text', text: `${languageInstruction}\n\n` },
              ...msg.content,
            ],
          };
        }
        // Handle string content (backward compatibility)
        return {
          ...msg,
          content: `${languageInstruction}\n\n${msg.content}`,
        };
      }
      return msg;
    });
  }

  // Otherwise, add a new system message at the beginning
  const languageInstruction = getLanguageInstruction(options.responseLanguage);
  return [
    { role: 'system', content: languageInstruction },
    ...messages,
  ];
}

/**
 * Circuit breaker state for a provider
 */
interface CircuitBreakerState {
  failures: number;
  lastFailureTime?: number;
  isOpen: boolean;
}

export class Orchestrator {
  private providers: Map<string, AIService> = new Map();
  private strategy: SelectionStrategy;
  private healthCheckInterval?: ReturnType<typeof setInterval>;
  private maxRetries: number;
  private requestTimeout: number;
  private retryDelay: number | 'exponential';
  private circuitBreaker?: CircuitBreakerConfig;
  private circuitBreakerStates: Map<string, CircuitBreakerState> = new Map();
  private healthCheckConfig?: HealthCheckConfig;
  private providerFailureCounts: Map<string, number> = new Map();
  private metrics: MetricsCollector;
  private strategyName: string;

  constructor(
    strategy: SelectionStrategy,
    options?: {
      maxRetries?: number;
      requestTimeout?: number;
      retryDelay?: number | 'exponential';
      circuitBreaker?: CircuitBreakerConfig;
      healthCheck?: HealthCheckConfig;
      enableMetrics?: boolean;
      onMetricsEvent?: MetricsCallback;
    }
  ) {
    this.strategy = strategy;
    this.maxRetries = options?.maxRetries ?? -1; // -1 means use providers.size
    this.requestTimeout = options?.requestTimeout ?? 30000; // 30 seconds default
    this.retryDelay = options?.retryDelay ?? 1000; // 1 second default
    this.circuitBreaker = options?.circuitBreaker;
    this.healthCheckConfig = options?.healthCheck;
    this.strategyName = strategy.constructor.name.replace('Strategy', '').toLowerCase();
    
    // Initialize metrics collector
    this.metrics = new MetricsCollector();
    if (options?.enableMetrics !== false) {
      // Enable metrics by default
      if (options?.onMetricsEvent) {
        this.metrics.onEvent(options.onMetricsEvent);
      }
    }
  }

  /**
   * Register a provider
   */
  registerProvider(provider: AIService): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Unregister a provider
   */
  unregisterProvider(id: string): void {
    this.providers.delete(id);
  }

  /**
   * Get a provider by ID
   */
  getProvider(id: string): AIService | undefined {
    return this.providers.get(id);
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): AIService[] {
    return Array.from(this.providers.values());
  }

  /**
   * Check if a provider's circuit breaker is open
   */
  private isCircuitBreakerOpen(providerId: string): boolean {
    if (!this.circuitBreaker?.enabled) {
      return false;
    }

    const state = this.circuitBreakerStates.get(providerId);
    if (!state || !state.isOpen) {
      return false;
    }

    // Check if reset timeout has passed
    if (state.lastFailureTime) {
      const resetTimeout = this.circuitBreaker.resetTimeout ?? 60000;
      if (Date.now() - state.lastFailureTime >= resetTimeout) {
        // Reset circuit breaker
        this.circuitBreakerStates.set(providerId, {
          failures: 0,
          isOpen: false,
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Record a provider failure for circuit breaker
   */
  private recordFailure(providerId: string): void {
    if (!this.circuitBreaker?.enabled) {
      return;
    }

    const state = this.circuitBreakerStates.get(providerId) || {
      failures: 0,
      isOpen: false,
    };

    state.failures++;
    state.lastFailureTime = Date.now();

    const threshold = this.circuitBreaker.failureThreshold ?? 5;
    if (state.failures >= threshold) {
      state.isOpen = true;
    }

    this.circuitBreakerStates.set(providerId, state);
  }

  /**
   * Record a provider success (reset circuit breaker)
   */
  private recordSuccess(providerId: string): void {
    if (!this.circuitBreaker?.enabled) {
      return;
    }

    this.circuitBreakerStates.set(providerId, {
      failures: 0,
      isOpen: false,
    });
    this.providerFailureCounts.set(providerId, 0);
  }

  /**
   * Get enabled providers (those that pass basic checks)
   */
  async getAvailableProviders(): Promise<AIService[]> {
    const providers = this.getAllProviders();
    const available: AIService[] = [];

    const healthCheckTimeout =
      this.healthCheckConfig?.timeout ?? 5000; // 5 seconds default

    for (const provider of providers) {
      // Check circuit breaker
      if (this.isCircuitBreakerOpen(provider.id)) {
        continue;
      }

      // Check consecutive failures
      const consecutiveFailures =
        this.providerFailureCounts.get(provider.id) ?? 0;
      const maxFailures =
        this.healthCheckConfig?.maxConsecutiveFailures ?? 3;
      if (consecutiveFailures >= maxFailures) {
        continue;
      }

      try {
        // Use Promise.race to implement timeout
        const healthPromise = provider.checkHealth();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Health check timeout')),
            healthCheckTimeout
          )
        );

        const health = await Promise.race([healthPromise, timeoutPromise]);
        
        // Record health check in metrics
        this.metrics.recordHealthCheck(provider, health);

        // Check latency threshold
        const latencyThreshold =
          this.healthCheckConfig?.latencyThreshold ?? 10000; // 10 seconds default
        if (health.healthy) {
          if (!health.latency || health.latency <= latencyThreshold) {
            available.push(provider);
            this.providerFailureCounts.set(provider.id, 0);
          }
        }
      } catch {
        // Skip unhealthy providers
        const currentFailures = this.providerFailureCounts.get(provider.id) ?? 0;
        this.providerFailureCounts.set(provider.id, currentFailures + 1);
      }
    }

    return available;
  }

  /**
   * Select a provider using the configured strategy
   */
  async selectProvider(context?: SelectionContext): Promise<AIService | null> {
    const startTime = Date.now();
    const available = await this.getAvailableProviders();
    if (available.length === 0) {
      return null;
    }
    const provider = await this.strategy.select(available, context);
    if (provider) {
      const selectionTime = Date.now() - startTime;
      this.metrics.recordSelection(provider, this.strategyName, selectionTime);
    }
    return provider;
  }

  /**
   * Calculate retry delay based on attempt number
   */
  private getRetryDelay(attempt: number): number {
    if (this.retryDelay === 'exponential') {
      return Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
    }
    return this.retryDelay;
  }

  /**
   * Perform a chat completion with automatic provider selection and fallback
   */
  async chat(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    // Process messages to add language instruction if responseLanguage is specified
    const processedMessages = processMessagesWithLanguage(messages, options);

    const context: SelectionContext = {
      messages: processedMessages,
      options,
      previousAttempts: [],
    };

    // Determine max attempts
    const maxAttempts =
      this.maxRetries === -1 ? this.providers.size || 1 : this.maxRetries;
    let lastError: Error | null = null;

    // Get timeout (request-level or global)
    const timeout = options?.timeout ?? this.requestTimeout;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Add delay between retries (except first attempt)
      if (attempt > 0) {
        const delay = this.getRetryDelay(attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const provider = await this.selectProvider(context);

      if (!provider) {
        throw new Error(
          'No available providers. All providers are unhealthy or unavailable.'
        );
      }

      // Skip providers we've already tried
      if (context.previousAttempts?.includes(provider.id)) {
        continue;
      }

      try {
        this.metrics.recordRequestStart(provider);
        const requestStart = Date.now();
        
        // Wrap provider call with timeout
        const chatPromise = provider.chat(processedMessages, options);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        );

        const response = await Promise.race([chatPromise, timeoutPromise]);
        const latency = Date.now() - requestStart;

        this.strategy.update?.(provider, true, { response });
        this.recordSuccess(provider.id);
        this.metrics.recordSuccess(provider, response, latency);
        return response;
      } catch (error) {
        const requestStart = Date.now();
        const latency = Date.now() - requestStart;
        lastError = error instanceof Error ? error : new Error(String(error));
        context.previousAttempts?.push(provider.id);
        this.strategy.update?.(provider, false, { error });
        this.recordFailure(provider.id);
        this.metrics.recordFailure(provider, lastError, latency);
      }
    }

    throw lastError || new Error('Failed to get response from any provider');
  }

  /**
   * Perform a streaming chat completion with automatic provider selection
   */
  async chatStream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ReadableStream<ChatChunk>> {
    // Process messages to add language instruction if responseLanguage is specified
    const processedMessages = processMessagesWithLanguage(messages, options);

    const context: SelectionContext = {
      messages: processedMessages,
      options: { ...options, stream: true },
      previousAttempts: [],
    };

    const provider = await this.selectProvider(context);

    if (!provider) {
      throw new Error(
        'No available providers. All providers are unhealthy or unavailable.'
      );
    }

    // Get timeout (request-level or global)
    const timeout = options?.timeout ?? this.requestTimeout;

    try {
      this.metrics.recordRequestStart(provider);
      
      // Wrap provider call with timeout
      const streamPromise = provider.chatStream(processedMessages, options);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      );

      const stream = await Promise.race([streamPromise, timeoutPromise]);
      // Note: For streaming, we can't track success until stream completes
      // This is a limitation - we'd need to wrap the stream to track completion
      // Latency tracking would require wrapping the stream reader
      this.strategy.update?.(provider, true);
      this.recordSuccess(provider.id);
      return stream;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.strategy.update?.(provider, false, { error });
      this.recordFailure(provider.id);
      // For streaming errors, we can't measure latency accurately
      this.metrics.recordFailure(provider, err);
      throw error;
    }
  }

  /**
   * Generate images from a text prompt
   * Automatically selects a provider that supports image generation
   */
  async generateImage(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageGenerationResponse> {
    // Get providers that support image generation
    const availableProviders = this.getAllProviders().filter(
      (p) => p.metadata.supportsImageGeneration && p.generateImage
    );

    if (availableProviders.length === 0) {
      throw new Error(
        'No providers with image generation support available. ' +
        'Make sure at least one provider supports image generation (e.g., OpenAI provider with DALL-E models).'
      );
    }

    // Create context for provider selection
    const context: SelectionContext = {
      prompt,
      options,
      previousAttempts: [],
      taskType: 'image-generation',
    };

    // Determine max attempts
    const maxAttempts =
      this.maxRetries === -1 ? availableProviders.length : this.maxRetries;
    let lastError: Error | null = null;

    // Get timeout (request-level or global)
    const timeout = options?.timeout ?? this.requestTimeout;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Add delay between retries (except first attempt)
      if (attempt > 0) {
        const delay = this.getRetryDelay(attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Filter out providers already tried
      const remainingProviders = availableProviders.filter(
        (p) => !context.previousAttempts?.includes(p.id)
      );

      if (remainingProviders.length === 0) {
        break;
      }

      // Select provider using strategy
      const provider = await this.strategy.select(remainingProviders, context);

      if (!provider || !provider.generateImage) {
        continue;
      }

      try {
        this.metrics.recordRequestStart(provider);
        const startTime = Date.now();

        // Wrap provider call with timeout
        const imagePromise = provider.generateImage(prompt, options);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        );

        const result = await Promise.race([imagePromise, timeoutPromise]);
        const latency = Date.now() - startTime;

        this.strategy.update?.(provider, true);
        this.recordSuccess(provider.id);
        
        // Track success metrics for image generation
        const metrics = this.metrics['getOrCreateProviderMetrics'](provider);
        if (metrics) {
          metrics.totalRequests++;
          metrics.successfulRequests++;
          if (metrics.averageLatency === 0) {
            metrics.averageLatency = latency;
          } else {
            metrics.averageLatency = metrics.averageLatency * 0.9 + latency * 0.1;
          }
          metrics.lastUsed = new Date();
          metrics.lastSuccess = new Date();
        }

        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        lastError = err;
        this.strategy.update?.(provider, false, { error });
        this.recordFailure(provider.id);
        this.metrics.recordFailure(provider, err);

        // Add to previous attempts
        if (!context.previousAttempts) {
          context.previousAttempts = [];
        }
        context.previousAttempts.push(provider.id);
      }
    }

    throw lastError || new Error('Failed to generate image from any provider');
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(intervalMs?: number): void {
    this.stopHealthChecks();
    const interval =
      intervalMs ?? this.healthCheckConfig?.interval ?? 60000; // Default 60 seconds

    if (interval < 1000) {
      console.warn(
        'Health check interval is very low (< 1000ms). Consider using at least 1000ms.'
      );
    }

    this.healthCheckInterval = setInterval(async () => {
      const providers = this.getAllProviders();
      const healthCheckTimeout =
        this.healthCheckConfig?.timeout ?? 5000; // 5 seconds default

      await Promise.allSettled(
        providers.map(async (p) => {
          try {
            const healthPromise = p.checkHealth();
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error('Health check timeout')),
                healthCheckTimeout
              )
            );
            await Promise.race([healthPromise, timeoutPromise]);
            this.providerFailureCounts.set(p.id, 0);
          } catch {
            const currentFailures = this.providerFailureCounts.get(p.id) ?? 0;
            this.providerFailureCounts.set(p.id, currentFailures + 1);
          }
        })
      );
    }, interval);
  }

  /**
   * Stop periodic health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Get metrics collector instance
   */
  getMetrics(): MetricsCollector {
    return this.metrics;
  }

  /**
   * Register a callback for metrics events
   */
  onMetricsEvent(callback: MetricsCallback): () => void {
    return this.metrics.onEvent(callback);
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopHealthChecks();
    this.providers.clear();
  }
}

