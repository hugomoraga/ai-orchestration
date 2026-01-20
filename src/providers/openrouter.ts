/**
 * OpenRouter provider implementation
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

export interface OpenRouterProviderConfig {
  /** Unique identifier for this provider instance */
  id: string;
  /** OpenRouter API key */
  apiKey: string;
  /** Model to use (default: 'openai/gpt-3.5-turbo') */
  model?: string;
  /** Custom base URL (default: 'https://openrouter.ai/api/v1') */
  baseURL?: string;
}

export class OpenRouterProvider extends BaseProvider {
  readonly id: string;
  readonly metadata: ProviderMetadata;
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(config: OpenRouterProviderConfig) {
    super();
    this.id = config.id;
    this.apiKey = config.apiKey;
    this.model = config.model || 'openai/gpt-3.5-turbo';
    this.baseURL = config.baseURL || 'https://openrouter.ai/api/v1';

    this.metadata = {
      id: this.id,
      name: 'OpenRouter',
      model: this.model,
      supportsImageGeneration: false,
      capabilities: ['chat', 'vision'], // Chat and vision (analyzing images), but not image generation
    };
  }

  /**
   * Check the health status of the OpenRouter provider
   */
  async checkHealth(): Promise<ProviderHealth> {
    return this.defaultHealthCheck();
  }

  /**
   * Perform a chat completion using OpenRouter's API
   */
  async chat(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://github.com/ia-orchestration/core',
        'X-Title': 'AI Orchestration Framework',
      },
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
      throw new Error(`OpenRouter API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return this.parseResponse(data);
  }

  /**
   * Perform a streaming chat completion using OpenRouter's API
   */
  async chatStream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ReadableStream<ChatChunk>> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://github.com/ia-orchestration/core',
        'X-Title': 'AI Orchestration Framework',
      },
      body: JSON.stringify({
        model: this.model,
        messages: this.formatMessages(messages),
        stream: true,
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
      throw new Error(`OpenRouter API error: ${response.status} ${error}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    return this.parseStream(response.body);
  }

  /**
   * Format messages for OpenRouter API (supports multimodal content)
   */
  protected formatMessages(messages: ChatMessage[]): unknown {
    return messages.map((msg) => {
      // Handle multimodal content (array of ContentPart)
      if (Array.isArray(msg.content)) {
        const content = msg.content.map((part) => {
          if (part.type === 'text') {
            return { type: 'text', text: part.text };
          } else if (part.type === 'image') {
            // Extract base64 data and mime type
            let imageData = part.image;
            let mimeType = part.mimeType || 'image/jpeg';
            
            // Handle data URI format (data:image/jpeg;base64,...)
            if (imageData.startsWith('data:')) {
              const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
              if (match) {
                mimeType = match[1];
                imageData = match[2];
              } else {
                // Fallback: try to extract base64 part
                const base64Index = imageData.indexOf('base64,');
                if (base64Index !== -1) {
                  imageData = imageData.slice(base64Index + 7);
                }
              }
            }
            
            return {
              type: 'image_url',
              image_url: {
                url: imageData.startsWith('http') 
                  ? imageData 
                  : `data:${mimeType};base64,${imageData}`,
              },
            };
          }
          return null;
        }).filter(Boolean);
        
        return {
          role: msg.role,
          content,
        };
      }
      
      // Handle simple string content (backward compatibility)
      return {
        role: msg.role,
        content: msg.content,
      };
    });
  }

  /**
   * Parse OpenRouter API response into ChatResponse format
   */
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
      throw new Error('Invalid response format from OpenRouter');
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

  /**
   * Parse OpenRouter streaming response into ChatChunk stream
   */
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

