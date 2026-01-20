/**
 * Tests for image generation functionality
 * These tests verify image generation without requiring API keys
 * 
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  Orchestrator,
  RoundRobinStrategy,
  OpenAIProvider,
  OpenRouterProvider,
} from '../src/index.js';
import type {
  AIService,
  ChatMessage,
  ChatResponse,
  ChatChunk,
  ProviderHealth,
  ImageGenerationOptions,
  ImageGenerationResponse,
} from '../src/index.js';

/**
 * Mock provider that supports image generation
 */
class MockImageProvider implements AIService {
  readonly id: string;
  readonly metadata = {
    id: '',
    name: 'Mock Image Provider',
    supportsImageGeneration: true,
    capabilities: ['chat', 'image-generation'],
  };

  constructor(id: string) {
    this.id = id;
    this.metadata.id = id;
  }

  async checkHealth(): Promise<ProviderHealth> {
    return {
      healthy: true,
      latency: 100,
      lastChecked: new Date(),
    };
  }

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    return {
      content: 'test',
      model: 'test',
      usage: undefined,
    };
  }

  async chatStream(messages: ChatMessage[]): Promise<ReadableStream<ChatChunk>> {
    return new ReadableStream();
  }

  async generateImage(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageGenerationResponse> {
    const n = options?.n ?? 1;
    const images = Array.from({ length: n }, (_, i) => ({
      url: `https://example.com/image-${i + 1}.png`,
      b64Json: undefined,
      revisedPrompt: `Revised: ${prompt}`,
    }));

    return {
      images,
      model: 'mock-image-model',
      usage: {
        imagesGenerated: n,
      },
      metadata: {
        prompt,
        options,
      },
    };
  }
}

/**
 * Mock provider that does NOT support image generation
 */
class MockNoImageProvider implements AIService {
  readonly id: string;
  readonly metadata = {
    id: '',
    name: 'Mock No Image Provider',
    supportsImageGeneration: false,
    capabilities: ['chat'],
  };

  constructor(id: string) {
    this.id = id;
    this.metadata.id = id;
  }

  async checkHealth(): Promise<ProviderHealth> {
    return {
      healthy: true,
      latency: 100,
      lastChecked: new Date(),
    };
  }

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    return {
      content: 'test',
      model: 'test',
      usage: undefined,
    };
  }

  async chatStream(messages: ChatMessage[]): Promise<ReadableStream<ChatChunk>> {
    return new ReadableStream();
  }
}

test('OpenAIProvider should have supportsImageGeneration: true', () => {
  const provider = new OpenAIProvider({
    id: 'test-openai',
    apiKey: 'test-key',
  });

  assert.strictEqual(provider.metadata.supportsImageGeneration, true);
  assert.ok(provider.metadata.capabilities?.includes('image-generation'));
});

test('OpenRouterProvider should have supportsImageGeneration: false', () => {
  const provider = new OpenRouterProvider({
    id: 'test-openrouter',
    apiKey: 'test-key',
  });

  assert.strictEqual(provider.metadata.supportsImageGeneration, false);
  assert.ok(!provider.metadata.capabilities?.includes('image-generation'));
});

test('Orchestrator should filter providers with image generation support', () => {
  const strategy = new RoundRobinStrategy();
  const orchestrator = new Orchestrator(strategy);

  const imageProvider = new MockImageProvider('image-provider');
  const noImageProvider = new MockNoImageProvider('no-image-provider');

  orchestrator.registerProvider(imageProvider);
  orchestrator.registerProvider(noImageProvider);

  const allProviders = orchestrator.getAllProviders();
  assert.strictEqual(allProviders.length, 2);

  // Check that we can identify which providers support image generation
  const imageProviders = allProviders.filter(
    (p) => p.metadata.supportsImageGeneration && p.generateImage
  );
  assert.strictEqual(imageProviders.length, 1);
  assert.strictEqual(imageProviders[0].id, 'image-provider');
});

test('Orchestrator should throw error when no providers support image generation', async () => {
  const strategy = new RoundRobinStrategy();
  const orchestrator = new Orchestrator(strategy);

  const noImageProvider = new MockNoImageProvider('no-image-provider');
  orchestrator.registerProvider(noImageProvider);

  await assert.rejects(
    async () => {
      await orchestrator.generateImage('test prompt');
    },
    {
      name: 'Error',
      message: /No providers with image generation support available/,
    }
  );

  orchestrator.dispose();
});

test('Orchestrator should generate image when provider supports it', async () => {
  const strategy = new RoundRobinStrategy();
  const orchestrator = new Orchestrator(strategy);

  const imageProvider = new MockImageProvider('image-provider');
  orchestrator.registerProvider(imageProvider);

  const result = await orchestrator.generateImage('a beautiful sunset', {
    n: 1,
    size: '1024x1024',
  });

  assert.ok(result);
  assert.strictEqual(result.images.length, 1);
  assert.ok(result.images[0].url);
  assert.strictEqual(result.model, 'mock-image-model');
  assert.strictEqual(result.usage?.imagesGenerated, 1);

  orchestrator.dispose();
});

test('Orchestrator should generate multiple images when requested', async () => {
  const strategy = new RoundRobinStrategy();
  const orchestrator = new Orchestrator(strategy);

  const imageProvider = new MockImageProvider('image-provider');
  orchestrator.registerProvider(imageProvider);

  const result = await orchestrator.generateImage('test prompt', {
    n: 3,
  });

  assert.ok(result);
  assert.strictEqual(result.images.length, 3);
  assert.strictEqual(result.usage?.imagesGenerated, 3);

  orchestrator.dispose();
});

test('MockImageProvider should implement generateImage correctly', async () => {
  const provider = new MockImageProvider('test');

  const result = await provider.generateImage('test prompt', {
    n: 2,
    size: '1024x1024',
    quality: 'hd',
    style: 'vivid',
  });

  assert.ok(result);
  assert.strictEqual(result.images.length, 2);
  assert.ok(result.images[0].url);
  assert.ok(result.images[1].url);
  assert.strictEqual(result.model, 'mock-image-model');
});

test('Orchestrator should prefer image generation providers', async () => {
  const strategy = new RoundRobinStrategy();
  const orchestrator = new Orchestrator(strategy);

  const imageProvider = new MockImageProvider('image-provider');
  const noImageProvider = new MockNoImageProvider('no-image-provider');

  orchestrator.registerProvider(noImageProvider);
  orchestrator.registerProvider(imageProvider);

  // Should use the image provider even if registered second
  const result = await orchestrator.generateImage('test');
  assert.ok(result);
  assert.strictEqual(result.images.length, 1);

  orchestrator.dispose();
});

test('ImageGenerationOptions should accept valid quality values', () => {
  const options1: ImageGenerationOptions = {
    quality: 'standard',
  };
  const options2: ImageGenerationOptions = {
    quality: 'hd',
  };

  assert.strictEqual(options1.quality, 'standard');
  assert.strictEqual(options2.quality, 'hd');
});

test('ImageGenerationOptions should accept valid style values', () => {
  const options1: ImageGenerationOptions = {
    style: 'vivid',
  };
  const options2: ImageGenerationOptions = {
    style: 'natural',
  };

  assert.strictEqual(options1.style, 'vivid');
  assert.strictEqual(options2.style, 'natural');
});

test('ImageGenerationOptions should accept valid responseFormat values', () => {
  const options1: ImageGenerationOptions = {
    responseFormat: 'url',
  };
  const options2: ImageGenerationOptions = {
    responseFormat: 'b64_json',
  };

  assert.strictEqual(options1.responseFormat, 'url');
  assert.strictEqual(options2.responseFormat, 'b64_json');
});

