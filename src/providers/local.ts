/**
 * Local provider implementation (for local models via HTTP API)
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

export interface LocalProviderConfig {
  id: string;
  baseURL: string;
  model?: string;
  apiKey?: string;
}

export class LocalProvider extends BaseProvider {
  readonly id: string;
  readonly metadata: ProviderMetadata;
  private baseURL: string;
  private model?: string;
  private apiKey?: string;

  constructor(config: LocalProviderConfig) {
    super();
    this.id = config.id;
    this.baseURL = config.baseURL;
    this.model = config.model;
    this.apiKey = config.apiKey;

    this.metadata = {
      id: this.id,
      name: 'Local Model',
      model: this.model,
    };
  }

  async checkHealth(): Promise<ProviderHealth> {
    try {
      const start = Date.now();
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      const latency = Date.now() - start;

      if (response.ok) {
        return {
          healthy: true,
          latency,
          lastChecked: new Date(),
        };
      }

      return {
        healthy: false,
        latency,
        lastChecked: new Date(),
        error: `Health check returned ${response.status}`,
      };
    } catch (error) {
      return {
        healthy: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async chat(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages: this.formatMessages(messages),
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        top_p: options?.topP,
        stop: options?.stopSequences,
        frequency_penalty: options?.frequencyPenalty,
        presence_penalty: options?.presencePenalty,
        seed: options?.seed !== undefined && options.seed !== null ? options.seed : undefined,
        user: options?.user,
        // Exclude framework-specific options
        ...(() => {
          const { responseLanguage, timeout, ...rest } = options || {};
          return rest;
        })(),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Local API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return this.parseResponse(data);
  }

  async chatStream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ReadableStream<ChatChunk>> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages: this.formatMessages(messages),
        stream: true,
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        top_p: options?.topP,
        stop: options?.stopSequences,
        ...options,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Local API error: ${response.status} ${error}`);
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
      throw new Error('Invalid response format from local provider');
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

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    return headers;
  }
}

