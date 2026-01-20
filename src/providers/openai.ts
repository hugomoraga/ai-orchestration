/**
 * OpenAI provider implementation
 * Supports both chat completions and image generation (DALL-E)
 */

import { BaseProvider } from './base.js';
import type {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ChatChunk,
  ProviderHealth,
  ProviderMetadata,
  ImageGenerationOptions,
  ImageGenerationResponse,
  GeneratedImage,
} from '../core/types.js';

export interface OpenAIProviderConfig {
  /** Unique identifier for this provider instance */
  id: string;
  /** OpenAI API key */
  apiKey: string;
  /**
   * Model to use for chat completions (default: 'gpt-3.5-turbo')
   * For image generation, DALL-E 3 is used by default regardless of this setting
   */
  model?: string;
  /** Custom base URL (default: 'https://api.openai.com/v1') */
  baseURL?: string;
}

export class OpenAIProvider extends BaseProvider {
  readonly id: string;
  readonly metadata: ProviderMetadata;
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(config: OpenAIProviderConfig) {
    super();
    this.id = config.id;
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-3.5-turbo';
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';

    this.metadata = {
      id: this.id,
      name: 'OpenAI',
      model: this.model,
      supportsImageGeneration: true,
      capabilities: ['chat', 'image-generation'],
    };
  }

  async checkHealth(): Promise<ProviderHealth> {
    return this.defaultHealthCheck();
  }

  /**
   * Perform a chat completion using OpenAI's API
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
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return this.parseResponse(data);
  }

  /**
   * Perform a streaming chat completion using OpenAI's API
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
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    return this.parseStream(response.body);
  }

  /**
   * Generate images from a text prompt using DALL-E models
   */
  async generateImage(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageGenerationResponse> {
    // Determine the image generation model to use
    // Default to DALL-E 3, or use configured model if it's a DALL-E model
    let imageModel = 'dall-e-3';
    
    if (this.model.includes('dall-e-2')) {
      imageModel = 'dall-e-2';
    } else if (this.model.includes('dall-e-3')) {
      imageModel = 'dall-e-3';
    }

    // Build request body
    const requestBody: Record<string, unknown> = {
      model: imageModel,
      prompt,
      n: options?.n ?? 1,
      size: options?.size || '1024x1024',
      quality: options?.quality || 'standard',
      response_format: options?.responseFormat || 'url',
    };

    // Add style parameter (only supported by DALL-E 3)
    if (options?.style && imageModel === 'dall-e-3') {
      requestBody.style = options.style;
    }

    const timeoutMs = options?.timeout ?? 60000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseURL}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `OpenAI image generation error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage += ` - ${errorJson.error?.message || errorText}`;
        } catch {
          errorMessage += ` - ${errorText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json() as {
        data?: Array<{
          url?: string;
          b64_json?: string;
          revised_prompt?: string;
        }>;
        created?: number;
      };

      const images: GeneratedImage[] = [];
      if (Array.isArray(data.data)) {
        for (const item of data.data) {
          images.push({
            url: item.url,
            b64Json: item.b64_json,
            revisedPrompt: item.revised_prompt,
          });
        }
      }

      return {
        images,
        model: imageModel,
        usage: {
          imagesGenerated: images.length,
        },
        metadata: {
          created: data.created,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Image generation timeout');
      }
      throw error;
    }
  }

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
   * Parse OpenAI API response into ChatResponse format
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
      throw new Error('Invalid response format from OpenAI');
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
   * Parse OpenAI streaming response into ChatChunk stream
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

