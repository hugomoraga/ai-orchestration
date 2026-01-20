/**
 * Example: Using images with AI providers
 * 
 * This example demonstrates how to send images along with text messages
 * to AI providers that support multimodal input (vision models).
 * 
 * Provider Support for Image Analysis (Vision):
 * - ✅ Gemini: Full support (gemini-pro-vision, gemini-1.5-pro, gemini-2.0-flash)
 * - ✅ OpenRouter: Full support (gpt-4o, claude-3-5-sonnet, llama-3.2-90b-vision)
 * - ✅ Groq: Supported with Llama 3.2 Vision models (llama-3.2-11b-vision-preview, llama-3.2-90b-vision-preview)
 * - ❌ Cerebras: NOT supported (text-only models: Llama 3.1/3.3)
 * - ❌ DeepSeek: NOT supported via official API (DeepSeek-V3/R1 are text-only; DeepSeek-VL is open-source only)
 * - ⚠️  Local: Depends on the loaded model (e.g., llava models support images)
 * 
 * Note: This example is for analyzing/understanding images, not generating them.
 * For image generation, see examples/image-generation.ts
 */

import { createOrchestrator, type ProviderConfig } from '../src/index.js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
  // Check for API keys
  const hasGroq = !!process.env.GROQ_API_KEY;
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasCerebras = !!process.env.CEREBRAS_API_KEY;

  if (!hasGroq && !hasOpenRouter && !hasGemini) {
    console.error('❌ Error: No API keys found!\n');
    console.error('   Please set at least one of the following environment variables:');
    console.error('   - GROQ_API_KEY (requires Llama 3.2 Vision models)');
    console.error('   - OPENROUTER_API_KEY (use vision-capable models like gpt-4o)');
    console.error('   - GEMINI_API_KEY (gemini-pro-vision, gemini-1.5-pro)\n');
    console.error('   ⚠️  Note: Cerebras does NOT support images (text-only models)\n');
    process.exit(1);
  }

  // Use first available provider
  const providers: ProviderConfig[] = [];
  if (hasGroq) {
    providers.push({
      id: 'groq-1',
      type: 'groq',
      apiKey: process.env.GROQ_API_KEY!,
      // IMPORTANT: Groq requires Llama 3.2 Vision models for image support
      // Use: llama-3.2-11b-vision-preview or llama-3.2-90b-vision-preview
      model: 'llama-3.2-11b-vision-preview',
    });
  } else if (hasOpenRouter) {
    providers.push({
      id: 'openrouter-1',
      type: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY!,
      // Use a vision-capable model like GPT-4 Vision or Claude
      model: 'openai/gpt-4-vision-preview',
    });
  } else if (hasGemini) {
    providers.push({
      id: 'gemini-1',
      type: 'gemini',
      apiKey: process.env.GEMINI_API_KEY!,
      // Gemini Pro Vision supports images
      model: 'gemini-pro-vision',
    });
  }

  console.log(`✅ Using provider: ${providers[0].id}\n`);

  // Create orchestrator
  const orchestrator = createOrchestrator({
    providers,
    strategy: {
      type: 'round-robin',
    },
  });

  // Example 1: Using base64-encoded image from file
  console.log('=== Example 1: Image from file (base64) ===\n');
  try {
    // Read an image file and convert to base64
    // Note: In a real application, you would read an actual image file
    // For this example, we'll create a simple example
    const exampleImagePath = join(process.cwd(), 'examples', 'test-image.png');
    let imageBase64: string;
    
    try {
      const imageBuffer = readFileSync(exampleImagePath);
      imageBase64 = imageBuffer.toString('base64');
    } catch {
      // If file doesn't exist, create a minimal example
      // In production, you would handle this properly
      console.log('⚠️  Note: test-image.png not found. Using placeholder.\n');
      // For demonstration, we'll use a data URI format
      imageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }

    const messages = [
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: 'What is in this image? Describe it in detail.',
          },
          {
            type: 'image' as const,
            image: imageBase64,
            mimeType: 'image/png',
          },
        ],
      },
    ];

    const response = await orchestrator.chat(messages, {
      temperature: 0.7,
      maxTokens: 500,
    });
    console.log('Response:', response.content);
    console.log('');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    console.log('');
  }

  // Example 2: Using data URI format
  console.log('=== Example 2: Image with data URI ===\n');
  try {
    const messages = [
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: 'Analyze this image and tell me what you see.',
          },
          {
            type: 'image' as const,
            // Data URI format: data:image/png;base64,...
            image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          },
        ],
      },
    ];

    const response = await orchestrator.chat(messages, {
      temperature: 0.7,
      maxTokens: 500,
    });
    console.log('Response:', response.content);
    console.log('');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    console.log('');
  }

  // Example 3: Multiple images
  console.log('=== Example 3: Multiple images ===\n');
  try {
    const messages = [
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: 'Compare these two images and tell me the differences.',
          },
          {
            type: 'image' as const,
            image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            mimeType: 'image/png',
          },
          {
            type: 'image' as const,
            image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            mimeType: 'image/png',
          },
        ],
      },
    ];

    const response = await orchestrator.chat(messages, {
      temperature: 0.7,
      maxTokens: 500,
    });
    console.log('Response:', response.content);
    console.log('');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    console.log('');
  }

  // Example 4: Image URL (for providers that support it)
  console.log('=== Example 4: Image from URL ===\n');
  try {
    const messages = [
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: 'What is in this image?',
          },
          {
            type: 'image' as const,
            image: 'https://example.com/image.jpg',
            mimeType: 'image/jpeg',
          },
        ],
      },
    ];

    const response = await orchestrator.chat(messages, {
      temperature: 0.7,
      maxTokens: 500,
    });
    console.log('Response:', response.content);
    console.log('');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    console.log('');
  }

  // Example 5: Mixed text and images with language preference
  console.log('=== Example 5: Image with language preference ===\n');
  try {
    const messages = [
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: 'Describe this image in Spanish.',
          },
          {
            type: 'image' as const,
            image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            mimeType: 'image/png',
          },
        ],
      },
    ];

    const response = await orchestrator.chat(messages, {
      responseLanguage: 'es',
      temperature: 0.7,
      maxTokens: 500,
    });
    console.log('Response:', response.content);
    console.log('');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    console.log('');
  }

  orchestrator.dispose();
}

main().catch(console.error);

