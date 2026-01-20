/**
 * Example: Image Generation
 * 
 * This example demonstrates how to generate images from text prompts
 * using AI providers that support image generation (OpenAI with DALL-E).
 * 
 * IMPORTANT: Only OpenAI provider supports image generation.
 * OpenRouter does NOT support image generation - use OpenAI directly.
 */

import { createOrchestrator, type ProviderConfig } from '../src/index.js';

async function main() {
  // Check for API keys
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (!hasOpenAI) {
    console.error('❌ Error: No API keys found!\n');
    console.error('   Image generation requires OpenAI API key.');
    console.error('   Please set the following environment variable:');
    console.error('   - OPENAI_API_KEY\n');
    console.error('   Example:');
    console.error('   export OPENAI_API_KEY="your-key"');
    console.error('   npm run example:image-generation\n');
    console.error('   Get your API key at: https://platform.openai.com/api-keys\n');
    console.error('   Supported models:');
    console.error('   - dall-e-3 (recommended, default)');
    console.error('   - dall-e-2\n');
    process.exit(1);
  }

  // Configure OpenAI provider for image generation
  const providers: ProviderConfig[] = [
    {
      id: 'openai-images',
      type: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      // Use DALL-E 3 for image generation (default)
      model: 'dall-e-3',
    },
  ];

  console.log(`✅ Using provider: ${providers[0].id} with model: ${providers[0].model}`);
  console.log(`   Note: OpenAI is the only provider that supports image generation.\n`);

  // Create orchestrator
  const orchestrator = createOrchestrator({
    providers,
    strategy: {
      type: 'round-robin',
    },
  });

  // Example 1: Basic image generation
  console.log('=== Example 1: Basic Image Generation ===\n');
  try {
    const response = await orchestrator.generateImage(
      'A futuristic cityscape at sunset with flying cars and neon lights',
      {
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      }
    );

    console.log(`✅ Generated ${response.images.length} image(s)`);
    console.log(`   Model: ${response.model}`);
    
    if (response.images[0]?.url) {
      console.log(`   Image URL: ${response.images[0].url}`);
    }
    
    if (response.images[0]?.revisedPrompt) {
      console.log(`   Revised Prompt: ${response.images[0].revisedPrompt}`);
    }
    console.log('');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    console.log('');
  }

  // Example 2: High quality image
  console.log('=== Example 2: High Quality Image ===\n');
  try {
    const response = await orchestrator.generateImage(
      'A serene Japanese garden with cherry blossoms, koi pond, and traditional architecture',
      {
        n: 1,
        size: '1024x1024',
        quality: 'hd', // High quality
        style: 'vivid', // Vivid style
      }
    );

    console.log(`✅ Generated ${response.images.length} image(s)`);
    if (response.images[0]?.url) {
      console.log(`   Image URL: ${response.images[0].url}`);
    }
    console.log('');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    console.log('');
  }

  // Example 3: Multiple images
  console.log('=== Example 3: Generate Multiple Images ===\n');
  try {
    const response = await orchestrator.generateImage(
      'A cute robot reading a book in a library',
      {
        n: 2, // Generate 2 images
        size: '1024x1024',
      }
    );

    console.log(`✅ Generated ${response.images.length} image(s)`);
    response.images.forEach((img, index) => {
      if (img.url) {
        console.log(`   Image ${index + 1}: ${img.url}`);
      }
    });
    console.log('');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    console.log('');
  }

  // Example 4: Base64 response format
  console.log('=== Example 4: Base64 Response Format ===\n');
  try {
    const response = await orchestrator.generateImage(
      'An abstract painting with vibrant colors and geometric shapes',
      {
        n: 1,
        size: '1024x1024',
        responseFormat: 'b64_json', // Get base64 instead of URL
      }
    );

    console.log(`✅ Generated ${response.images.length} image(s)`);
    if (response.images[0]?.b64Json) {
      const base64Length = response.images[0].b64Json.length;
      console.log(`   Base64 data length: ${base64Length} characters`);
      console.log(`   (Image data is ${Math.round(base64Length / 1024)} KB in base64)`);
      console.log(`   You can decode this to display the image directly.`);
    }
    console.log('');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    console.log('');
  }

  // Example 5: Different aspect ratios
  console.log('=== Example 5: Different Aspect Ratios ===\n');
  try {
    const sizes = ['1024x1024', '1792x1024', '1024x1792'];
    
    for (const size of sizes) {
      console.log(`   Generating image with size: ${size}...`);
      const response = await orchestrator.generateImage(
        'A majestic mountain landscape with snow-capped peaks',
        {
          n: 1,
          size,
        }
      );

      if (response.images[0]?.url) {
        console.log(`   ✅ ${size}: ${response.images[0].url}`);
      }
    }
    console.log('');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    console.log('');
  }

  orchestrator.dispose();
}

main().catch(console.error);

