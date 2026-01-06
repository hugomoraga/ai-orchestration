/**
 * Basic usage example
 */

import { createOrchestrator } from '../src/index.js';

async function main() {
  // Create orchestrator with declarative config
  const orchestrator = createOrchestrator({
    providers: [
      {
        id: 'groq-1',
        type: 'groq',
        apiKey: process.env.GROQ_API_KEY || '',
        model: 'llama-3.3-70b-versatile', // Updated: llama-3.1-70b-versatile was decommissioned
      },
      {
        id: 'openrouter-1',
        type: 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY || '',
        model: 'openai/gpt-3.5-turbo',
      },
    ],
    strategy: {
      type: 'round-robin',
    },
    enableHealthChecks: true,
    healthCheckInterval: 60000, // 60 seconds
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

