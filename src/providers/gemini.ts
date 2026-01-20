/**
 * Google Gemini provider implementation
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

export interface GeminiProviderConfig {
  id: string;
  apiKey: string;
  model?: string;
  baseURL?: string;
}

export class GeminiProvider extends BaseProvider {
  readonly id: string;
  readonly metadata: ProviderMetadata;
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(config: GeminiProviderConfig) {
    super();
    this.id = config.id;
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-pro';
    this.baseURL =
      config.baseURL || 'https://generativelanguage.googleapis.com/v1beta';

    this.metadata = {
      id: this.id,
      name: 'Google Gemini',
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
    const formatted = this.formatMessages(messages);
    const url = `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: formatted,
        generationConfig: {
          temperature: options?.temperature,
          maxOutputTokens: options?.maxTokens,
          topP: options?.topP,
          topK: options?.topK,
          stopSequences: options?.stopSequences,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return this.parseResponse(data);
  }

  async chatStream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ReadableStream<ChatChunk>> {
    const formatted = this.formatMessages(messages);
    const url = `${this.baseURL}/models/${this.model}:streamGenerateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: formatted,
        generationConfig: {
          temperature: options?.temperature,
          maxOutputTokens: options?.maxTokens,
          topP: options?.topP,
          topK: options?.topK,
          stopSequences: options?.stopSequences,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${error}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    return this.parseStream(response.body);
  }

  protected formatMessages(messages: ChatMessage[]): unknown {
    // Gemini uses a different format
    return messages.map((msg) => {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      
      // Handle multimodal content (array of ContentPart)
      if (Array.isArray(msg.content)) {
        const parts = msg.content.map((part) => {
          if (part.type === 'text') {
            return { text: part.text };
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
            } else if (imageData.startsWith('http')) {
              // For URLs, Gemini requires fetching the image
              // For now, we'll throw an error suggesting to use base64
              throw new Error(
                'Gemini provider requires base64-encoded images. Please convert the image URL to base64 format.'
              );
            }
            
            return {
              inline_data: {
                mime_type: mimeType,
                data: imageData,
              },
            };
          }
          return null;
        }).filter(Boolean);
        
        return {
          role,
          parts,
        };
      }
      
      // Handle simple string content (backward compatibility)
      return {
        role,
        parts: [{ text: msg.content }],
      };
    });
  }

  protected parseResponse(response: unknown): ChatResponse {
    const data = response as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
        finishReason?: string;
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };

    const candidate = data.candidates?.[0];
    const text =
      candidate?.content?.parts?.map((p) => p.text || '').join('') || '';

    if (!text) {
      throw new Error('Invalid response format from Gemini');
    }

    return {
      content: text,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount ?? 0,
            completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
            totalTokens: data.usageMetadata.totalTokenCount ?? 0,
          }
        : undefined,
      finishReason: candidate?.finishReason,
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
                  const candidate = parsed.candidates?.[0];
                  const content = candidate?.content;

                  if (content?.parts) {
                    const text = content.parts
                      .map((p: { text?: string }) => p.text || '')
                      .join('');
                    if (text) {
                      controller.enqueue({
                        content: text,
                        done: false,
                        finishReason: candidate?.finishReason,
                      });
                    }
                  }

                  if (candidate?.finishReason) {
                    controller.enqueue({
                      content: '',
                      done: true,
                      finishReason: candidate.finishReason,
                      usage: parsed.usageMetadata
                        ? {
                            promptTokens: parsed.usageMetadata.promptTokenCount,
                            completionTokens:
                              parsed.usageMetadata.candidatesTokenCount,
                            totalTokens: parsed.usageMetadata.totalTokenCount,
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

