/**
 * Core types and interfaces for the AI Orchestration Framework
 */

/**
 * Represents a chat message in a conversation
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
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
}

