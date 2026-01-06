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
} from './interfaces.js';

export class Orchestrator {
  private providers: Map<string, AIService> = new Map();
  private strategy: SelectionStrategy;
  private healthCheckInterval?: ReturnType<typeof setInterval>;

  constructor(strategy: SelectionStrategy) {
    this.strategy = strategy;
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
   * Get enabled providers (those that pass basic checks)
   */
  async getAvailableProviders(): Promise<AIService[]> {
    const providers = this.getAllProviders();
    const available: AIService[] = [];

    for (const provider of providers) {
      try {
        const health = await provider.checkHealth();
        if (health.healthy) {
          available.push(provider);
        }
      } catch {
        // Skip unhealthy providers
      }
    }

    return available;
  }

  /**
   * Select a provider using the configured strategy
   */
  async selectProvider(context?: SelectionContext): Promise<AIService | null> {
    const available = await this.getAvailableProviders();
    if (available.length === 0) {
      return null;
    }
    return this.strategy.select(available, context);
  }

  /**
   * Perform a chat completion with automatic provider selection and fallback
   */
  async chat(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    const context: SelectionContext = {
      messages,
      options,
      previousAttempts: [],
    };

    const maxAttempts = this.providers.size || 1;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
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
        const response = await provider.chat(messages, options);
        this.strategy.update?.(provider, true, { response });
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        context.previousAttempts?.push(provider.id);
        this.strategy.update?.(provider, false, { error });
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
    const context: SelectionContext = {
      messages,
      options: { ...options, stream: true },
      previousAttempts: [],
    };

    const provider = await this.selectProvider(context);

    if (!provider) {
      throw new Error(
        'No available providers. All providers are unhealthy or unavailable.'
      );
    }

    try {
      const stream = await provider.chatStream(messages, options);
      this.strategy.update?.(provider, true);
      return stream;
    } catch (error) {
      this.strategy.update?.(provider, false, { error });
      throw error;
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(intervalMs: number): void {
    this.stopHealthChecks();
    this.healthCheckInterval = setInterval(async () => {
      const providers = this.getAllProviders();
      await Promise.allSettled(
        providers.map((p) => p.checkHealth().catch(() => null))
      );
    }, intervalMs);
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
   * Cleanup resources
   */
  dispose(): void {
    this.stopHealthChecks();
    this.providers.clear();
  }
}

