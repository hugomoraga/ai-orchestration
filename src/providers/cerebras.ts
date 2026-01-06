/**
 * Cerebras provider implementation
 */

import { BaseProvider } from './base.js';
import type {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ChatChunk,
  ProviderHealth,
  ProviderMetadata,
} from '../core/types.js';

export interface CerebrasProviderConfig {
  id: string;
  apiKey: string;
  model?: string;
  baseURL?: string;
}

export class CerebrasProvider extends BaseProvider {
  readonly id: string;
  readonly metadata: ProviderMetadata;
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(config: CerebrasProviderConfig) {
    super();
    this.id = config.id;
    this.apiKey = config.apiKey;
    // Default model based on Cerebras documentation
    this.model = config.model || 'llama-3.3-70b';
    // Cerebras Inference API endpoint (OpenAI-compatible)
    this.baseURL = config.baseURL || 'https://api.cerebras.ai/v1';

    this.metadata = {
      id: this.id,
      name: 'Cerebras',
      model: this.model,
    };
  }

  async checkHealth(): Promise<ProviderHealth> {
    return this.defaultHealthCheck();
  }

  async chat(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    // Build request body, converting camelCase to snake_case for Cerebras API
    const requestBody: Record<string, unknown> = {
      model: this.model,
      messages: this.formatMessages(messages),
    };

    // Add options, converting camelCase to snake_case
    if (options?.temperature !== undefined) requestBody.temperature = options.temperature;
    if (options?.maxTokens !== undefined) requestBody.max_tokens = options.maxTokens;
    if (options?.topP !== undefined) requestBody.top_p = options.topP;
    if (options?.stopSequences !== undefined) requestBody.stop = options.stopSequences;

    // Add any additional options (excluding camelCase ones we've already converted)
    const { maxTokens, topP, stopSequences, ...restOptions } = options || {};
    Object.assign(requestBody, restOptions);

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'User-Agent': '@ai-orchestration/core/0.1.0', // Required by Cerebras to avoid CloudFront blocking
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cerebras API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return this.parseResponse(data);
  }

  async chatStream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ReadableStream<ChatChunk>> {
    // Build request body, converting camelCase to snake_case for Cerebras API
    const requestBody: Record<string, unknown> = {
      model: this.model,
      messages: this.formatMessages(messages),
      stream: true,
    };

    // Add options, converting camelCase to snake_case
    if (options?.temperature !== undefined) requestBody.temperature = options.temperature;
    if (options?.maxTokens !== undefined) requestBody.max_tokens = options.maxTokens;
    if (options?.topP !== undefined) requestBody.top_p = options.topP;
    if (options?.stopSequences !== undefined) requestBody.stop = options.stopSequences;

    // Add any additional options (excluding camelCase ones we've already converted)
    const { maxTokens, topP, stopSequences, ...restOptions } = options || {};
    Object.assign(requestBody, restOptions);

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'User-Agent': '@ai-orchestration/core/0.1.0', // Required by Cerebras to avoid CloudFront blocking
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cerebras API error: ${response.status} ${error}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    return this.parseStream(response.body);
  }

  protected formatMessages(messages: ChatMessage[]): unknown {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  protected parseResponse(response: unknown): ChatResponse {
    const data = response as {
      choices?: Array<{
        message?: { content?: string };
        finish_reason?: string;
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
      model?: string;
    };

    const choice = data.choices?.[0];
    if (!choice?.message?.content) {
      throw new Error('Invalid response format from Cerebras');
    }

    return {
      content: choice.message.content,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens ?? 0,
            completionTokens: data.usage.completion_tokens ?? 0,
            totalTokens: data.usage.total_tokens ?? 0,
          }
        : undefined,
      model: data.model,
      finishReason: choice.finish_reason,
    };
  }

  protected parseStream(
    stream: ReadableStream<unknown>
  ): ReadableStream<ChatChunk> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream<ChatChunk>({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }

            const chunk = decoder.decode(value as Uint8Array);
            const lines = chunk.split('\n').filter((line) => line.trim());

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const choice = parsed.choices?.[0];
                  const delta = choice?.delta;

                  if (delta?.content) {
                    controller.enqueue({
                      content: delta.content,
                      done: false,
                      finishReason: choice?.finish_reason,
                    });
                  }

                  if (choice?.finish_reason) {
                    controller.enqueue({
                      content: '',
                      done: true,
                      finishReason: choice.finish_reason,
                      usage: parsed.usage
                        ? {
                            promptTokens: parsed.usage.prompt_tokens,
                            completionTokens: parsed.usage.completion_tokens,
                            totalTokens: parsed.usage.total_tokens,
                          }
                        : undefined,
                    });
                    controller.close();
                    return;
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      },
    });
  }
}

