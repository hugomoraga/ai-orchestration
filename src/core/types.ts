/**
 * Core types and interfaces for the AI Orchestration Framework
 */

/**
 * Image content for multimodal messages
 */
export interface ImageContent {
  type: 'image';
  /**
   * Image data as base64 string (with or without data URI prefix)
   * or a URL to the image
   */
  image: string;
  /**
   * MIME type of the image (e.g., 'image/jpeg', 'image/png', 'image/webp')
   * If not provided, will be inferred from the image data or default to 'image/jpeg'
   */
  mimeType?: string;
}

/**
 * Text content for multimodal messages
 */
export interface TextContent {
  type: 'text';
  text: string;
}

/**
 * Content part for multimodal messages
 */
export type ContentPart = TextContent | ImageContent;

/**
 * Represents a chat message in a conversation
 * 
 * For backward compatibility, content can be a string.
 * For multimodal messages (text + images), content can be an array of ContentPart.
 * 
 * Provider Support for Images (Vision - analyzing images):
 * - ✅ Gemini: Full support (gemini-pro-vision, gemini-1.5-pro, gemini-2.0-flash)
 * - ✅ OpenRouter: Full support (gpt-4o, claude-3-5-sonnet, llama-3.2-90b-vision)
 * - ✅ Groq: Supported with Llama 3.2 Vision models (llama-3.2-11b-vision-preview, llama-3.2-90b-vision-preview)
 * - ❌ Cerebras: NOT supported (text-only models: Llama 3.1/3.3)
 * - ❌ DeepSeek: NOT supported via official API (DeepSeek-V3/R1 are text-only; DeepSeek-VL is open-source only)
 * - ⚠️  Local: Depends on the loaded model (e.g., llava models support images)
 * 
 * Provider Support for Image Generation (creating images):
 * - ✅ OpenAI: Full support (dall-e-3, dall-e-2)
 * - ❌ OpenRouter: NOT supported (use OpenAI provider directly)
 * - ❌ Gemini: NOT supported via this framework (requires Vertex AI Imagen API)
 * - ❌ Groq, Cerebras, DeepSeek: NOT supported
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

/**
 * Options for chat completion requests
 */
export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stream?: boolean;
  stopSequences?: string[];
  /**
   * Force the response language. When set, automatically prepends a system message
   * instructing the model to respond in the specified language.
   * 
   * Supported values: ISO 639-1 language codes (e.g., 'es', 'en', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'ru')
   * or full language names (e.g., 'spanish', 'english', 'french').
   * 
   * @example
   * ```typescript
   * await orchestrator.chat(messages, { responseLanguage: 'es' });
   * await orchestrator.chat(messages, { responseLanguage: 'spanish' });
   * ```
   */
  responseLanguage?: string;
  /**
   * Number between -2.0 and 2.0. Positive values penalize new tokens based on their
   * existing frequency in the text so far, decreasing the model's likelihood to
   * repeat the same line verbatim.
   */
  frequencyPenalty?: number;
  /**
   * Number between -2.0 and 2.0. Positive values penalize new tokens based on whether
   * they appear in the text so far, increasing the model's likelihood to talk about
   * new topics.
   */
  presencePenalty?: number;
  /**
   * If specified, the system will make a best effort to sample deterministically,
   * such that repeated requests with the same seed and parameters should return the same result.
   */
  seed?: number | null;
  /**
   * Request timeout in milliseconds. If not specified, uses the orchestrator's default timeout.
   */
  timeout?: number;
  /**
   * A unique identifier representing your end-user, which can help to monitor and detect abuse.
   */
  user?: string;
  [key: string]: unknown; // Allow provider-specific options
}

/**
 * Response from a chat completion (non-streaming)
 */
export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  finishReason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Streaming chunk from a chat completion
 */
export interface ChatChunk {
  content: string;
  done: boolean;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  finishReason?: string;
}

/**
 * Health status of a provider
 */
export interface ProviderHealth {
  healthy: boolean;
  latency?: number; // in milliseconds
  lastChecked?: Date;
  error?: string;
}

/**
 * Options for image generation requests
 */
export interface ImageGenerationOptions {
  /**
   * Number of images to generate (default: 1)
   */
  n?: number;
  /**
   * Size of the generated image (e.g., '1024x1024', '512x512')
   * Default depends on provider
   */
  size?: string;
  /**
   * Quality of the image
   * - 'standard': Standard quality (faster, lower cost)
   * - 'hd': High definition quality (slower, higher cost)
   * Default: 'standard'
   */
  quality?: 'standard' | 'hd';
  /**
   * Style of the image (DALL-E 3 only)
   * - 'vivid': More hyper-real and dramatic images
   * - 'natural': More natural, less hyper-real images
   * Default: 'vivid'
   */
  style?: 'vivid' | 'natural';
  /**
   * Response format (e.g., 'url', 'b64_json')
   * Default: 'url'
   */
  responseFormat?: 'url' | 'b64_json';
  /**
   * Request timeout in milliseconds
   */
  timeout?: number;
  [key: string]: unknown; // Allow provider-specific options
}

/**
 * Generated image result
 */
export interface GeneratedImage {
  /**
   * URL of the generated image (if responseFormat is 'url')
   */
  url?: string;
  /**
   * Base64-encoded image data (if responseFormat is 'b64_json')
   */
  b64Json?: string;
  /**
   * Revision/prompt used for generation (provider-specific)
   */
  revisedPrompt?: string;
}

/**
 * Response from an image generation request
 */
export interface ImageGenerationResponse {
  /**
   * Array of generated images
   */
  images: GeneratedImage[];
  /**
   * Model used for generation
   */
  model?: string;
  /**
   * Usage information (if available)
   */
  usage?: {
    imagesGenerated: number;
    [key: string]: unknown;
  };
  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Provider metadata
 */
export interface ProviderMetadata {
  id: string;
  name: string;
  model?: string;
  costPerToken?: {
    prompt: number;
    completion: number;
  };
  capabilities?: string[];
  /**
   * Whether this provider supports image generation
   */
  supportsImageGeneration?: boolean;
}

