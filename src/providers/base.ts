/**
 * Base provider implementation with common utilities
 */

import type { AIService } from '../core/interfaces.js';
import type {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ChatChunk,
  ProviderHealth,
  ProviderMetadata,
} from '../core/types.js';

export abstract class BaseProvider implements AIService {
  abstract readonly id: string;
  abstract readonly metadata: ProviderMetadata;

  abstract checkHealth(): Promise<ProviderHealth>;
  abstract chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  abstract chatStream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ReadableStream<ChatChunk>>;

  /**
   * Convert messages to provider-specific format
   */
  protected abstract formatMessages(messages: ChatMessage[]): unknown;

  /**
   * Convert provider response to standard format
   */
  protected abstract parseResponse(response: unknown): ChatResponse;

  /**
   * Convert provider stream to standard format
   */
  protected abstract parseStream(
    stream: ReadableStream<unknown>
  ): ReadableStream<ChatChunk>;

  /**
   * Default health check implementation
   * Uses a minimal chat request to verify the provider is working
   */
  protected async defaultHealthCheck(): Promise<ProviderHealth> {
    try {
      const start = Date.now();
      // Try a minimal chat request with minimal options
      // Note: Some providers may not support all options, so we use minimal ones
      await this.chat(
        [{ role: 'user', content: 'ping' }],
        { maxTokens: 5, temperature: 0 }
      );
      const latency = Date.now() - start;

      return {
        healthy: true,
        latency,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

