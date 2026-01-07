/**
 * Basic usage example
 * 
 * Run with: npm run example:basic
 * Or: npx tsx examples/basic.ts
 * 
 * Requires at least one API key:
 * - GROQ_API_KEY (recommended)
 * - OPENROUTER_API_KEY
 */

import { createOrchestrator, type ProviderConfig } from '../src/index.js';

async function main() {
  // Check for API keys
  const hasGroq = !!process.env.GROQ_API_KEY;
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;

  if (!hasGroq && !hasOpenRouter) {
    console.error('❌ Error: No API keys found!\n');
    console.error('   Please set at least one of the following environment variables:');
    console.error('   - GROQ_API_KEY');
    console.error('   - OPENROUTER_API_KEY\n');
    console.error('   Example:');
    console.error('   export GROQ_API_KEY="your-key"');
    console.error('   npm run example:basic\n');
    process.exit(1);
  }

  // Build providers list based on available API keys
  const providers: ProviderConfig[] = [];
  
  if (hasGroq) {
    providers.push({
      id: 'groq-1',
      type: 'groq',
      apiKey: process.env.GROQ_API_KEY!,
      model: 'llama-3.3-70b-versatile',
    });
  }

  if (hasOpenRouter) {
    providers.push({
      id: 'openrouter-1',
      type: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY!,
      model: 'openai/gpt-3.5-turbo',
    });
  }

  console.log(`✅ Using ${providers.length} provider(s): ${providers.map(p => p.id).join(', ')}\n`);

  // Create orchestrator with declarative config
  const orchestrator = createOrchestrator({
    providers,
    strategy: {
      type: 'round-robin',
    },
    healthCheck: {
      enabled: true,
      interval: 60000, // 60 seconds
    },
  });

  // Simple chat
  console.log('=== Simple Chat ===');
  const response = await orchestrator.chat([
    { role: 'user', content: 'Say hello in one sentence' },
  ]);
  console.log('Response:', response.content);
  console.log('Usage:', response.usage);

  // Streaming chat
  console.log('\n=== Streaming Chat ===');
  const stream = await orchestrator.chatStream([
    { role: 'user', content: 'Count from 1 to 5' },
  ]);

  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    process.stdout.write(value.content);
  }
  console.log('\n');

  // Cleanup
  orchestrator.dispose();
}

main().catch(console.error);

