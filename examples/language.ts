/**
 * Example: Forcing response language
 * 
 * This example demonstrates how to force the AI to respond in a specific language
 * using the responseLanguage option.
 */

import { createOrchestrator, type ProviderConfig } from '../src/index.js';

async function main() {
  // Check for API keys
  const hasGroq = !!process.env.GROQ_API_KEY;
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasCerebras = !!process.env.CEREBRAS_API_KEY;

  if (!hasGroq && !hasOpenRouter && !hasGemini && !hasCerebras) {
    console.error('❌ Error: No API keys found!\n');
    console.error('   Please set at least one of the following environment variables:');
    console.error('   - GROQ_API_KEY (recommended)');
    console.error('   - OPENROUTER_API_KEY');
    console.error('   - GEMINI_API_KEY');
    console.error('   - CEREBRAS_API_KEY\n');
    console.error('   Example:');
    console.error('   export GROQ_API_KEY="your-key"');
    console.error('   npm run example:language\n');
    process.exit(1);
  }

  // Use first available provider
  const providers: ProviderConfig[] = [];
  if (hasGroq) {
    providers.push({
      id: 'groq-1',
      type: 'groq',
      apiKey: process.env.GROQ_API_KEY!,
    });
  } else if (hasOpenRouter) {
    providers.push({
      id: 'openrouter-1',
      type: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY!,
    });
  } else if (hasGemini) {
    providers.push({
      id: 'gemini-1',
      type: 'gemini',
      apiKey: process.env.GEMINI_API_KEY!,
    });
  } else if (hasCerebras) {
    providers.push({
      id: 'cerebras-1',
      type: 'cerebras',
      apiKey: process.env.CEREBRAS_API_KEY!,
    });
  }

  console.log(`✅ Using provider: ${providers[0].id}\n`);

  // Create orchestrator with a simple configuration
  const orchestrator = createOrchestrator({
    providers,
    strategy: {
      type: 'round-robin',
    },
  });

  const messages = [
    {
      role: 'user' as const,
      content: 'Tell me a joke',
    },
  ];

  console.log('=== Example 1: Force Spanish ===\n');
  try {
    const response1 = await orchestrator.chat(messages, {
      responseLanguage: 'es', // Force Spanish response
      temperature: 0.7,
    });
    console.log('Response:', response1.content);
    console.log('');
  } catch (error) {
    console.error('Error:', error);
  }

  console.log('=== Example 2: Force English ===\n');
  try {
    const response2 = await orchestrator.chat(messages, {
      responseLanguage: 'en', // Force English response
      temperature: 0.7,
    });
    console.log('Response:', response2.content);
    console.log('');
  } catch (error) {
    console.error('Error:', error);
  }

  console.log('=== Example 3: Force French ===\n');
  try {
    const response3 = await orchestrator.chat(messages, {
      responseLanguage: 'french', // Can also use full language name
      temperature: 0.7,
    });
    console.log('Response:', response3.content);
    console.log('');
  } catch (error) {
    console.error('Error:', error);
  }

  console.log('=== Example 4: With existing system message ===\n');
  try {
    // If you already have a system message, the language instruction will be prepended
    const messagesWithSystem = [
      {
        role: 'system' as const,
        content: 'You are a helpful assistant.',
      },
      {
        role: 'user' as const,
        content: 'What is the capital of France?',
      },
    ];

    const response4 = await orchestrator.chat(messagesWithSystem, {
      responseLanguage: 'es', // Will prepend Spanish instruction to system message
      temperature: 0.7,
    });
    console.log('Response:', response4.content);
    console.log('');
  } catch (error) {
    console.error('Error:', error);
  }

  console.log('=== Example 5: Streaming with language ===\n');
  try {
    const stream = await orchestrator.chatStream(messages, {
      responseLanguage: 'es',
      temperature: 0.7,
    });

    const reader = stream.getReader();
    const decoder = new TextDecoder();

    console.log('Streaming response: ');
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      process.stdout.write(value.content);
    }
    console.log('\n');
  } catch (error) {
    console.error('Error:', error);
  }

  orchestrator.dispose();
}

main().catch(console.error);

