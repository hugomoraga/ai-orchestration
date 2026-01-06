/**
 * Test with mock provider (no API keys required)
 * Run with: npm run test:mock
 * or: tsx examples/test-mock.ts
 */

import {
  Orchestrator,
  RoundRobinStrategy,
  PriorityStrategy,
  FallbackStrategy,
} from '../src/index.js';
import type { AIService, ChatMessage, ChatResponse, ChatChunk, ProviderHealth } from '../src/index.js';

// Mock provider para pruebas sin API keys
class MockProvider implements AIService {
  readonly id: string;
  readonly metadata = {
    id: '',
    name: 'Mock Provider',
  };

  constructor(id: string) {
    this.id = id;
    this.metadata.id = id;
  }

  async checkHealth(): Promise<ProviderHealth> {
    return {
      healthy: true,
      latency: Math.random() * 100,
      lastChecked: new Date(),
    };
  }

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    const lastMessage = messages[messages.length - 1]?.content || '';
    return {
      content: `[Mock ${this.id}] Respuesta a: "${lastMessage}"`,
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
      model: 'mock-model',
      finishReason: 'stop',
    };
  }

  async chatStream(messages: ChatMessage[]): Promise<ReadableStream<ChatChunk>> {
    const lastMessage = messages[messages.length - 1]?.content || '';
    const words = `[Mock ${this.id}] Respuesta a: "${lastMessage}"`.split(' ');

    return new ReadableStream({
      async start(controller) {
        for (const word of words) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          controller.enqueue({
            content: word + ' ',
            done: false,
          });
        }
        controller.enqueue({
          content: '',
          done: true,
          finishReason: 'stop',
        });
        controller.close();
      },
    });
  }
}

async function main() {
  console.log('🧪 Prueba con proveedores Mock\n');

  // Test 1: Round-Robin Strategy
  console.log('📋 Test 1: Round-Robin Strategy');
  console.log('─────────────────────────────────');
  const roundRobinStrategy = new RoundRobinStrategy();
  const orchestrator1 = new Orchestrator(roundRobinStrategy);

  orchestrator1.registerProvider(new MockProvider('mock-1'));
  orchestrator1.registerProvider(new MockProvider('mock-2'));
  orchestrator1.registerProvider(new MockProvider('mock-3'));

  for (let i = 0; i < 5; i++) {
    const provider = await orchestrator1.selectProvider();
    console.log(`  Request ${i + 1}: ${provider?.id}`);
  }
  console.log('');

  // Test 2: Priority Strategy
  console.log('📋 Test 2: Priority Strategy');
  console.log('─────────────────────────────────');
  const priorityStrategy = new PriorityStrategy({
    priorities: {
      'mock-1': 1,
      'mock-2': 2,
      'mock-3': 3,
    },
  });
  const orchestrator2 = new Orchestrator(priorityStrategy);

  orchestrator2.registerProvider(new MockProvider('mock-1'));
  orchestrator2.registerProvider(new MockProvider('mock-2'));
  orchestrator2.registerProvider(new MockProvider('mock-3'));

  for (let i = 0; i < 3; i++) {
    const provider = await orchestrator2.selectProvider();
    console.log(`  Request ${i + 1}: ${provider?.id} (siempre el mismo por prioridad)`);
  }
  console.log('');

  // Test 3: Fallback Strategy
  console.log('📋 Test 3: Fallback Strategy');
  console.log('─────────────────────────────────');
  const fallbackStrategy = new FallbackStrategy({
    order: ['mock-1', 'mock-2', 'mock-3'],
  });
  const orchestrator3 = new Orchestrator(fallbackStrategy);

  orchestrator3.registerProvider(new MockProvider('mock-1'));
  orchestrator3.registerProvider(new MockProvider('mock-2'));
  orchestrator3.registerProvider(new MockProvider('mock-3'));

  const provider = await orchestrator3.selectProvider();
  console.log(`  Seleccionado: ${provider?.id} (siempre el primero de la lista)`);
  console.log('');

  // Test 4: Chat real con mock
  console.log('📋 Test 4: Chat con Mock Provider');
  console.log('─────────────────────────────────');
  const orchestrator4 = new Orchestrator(new RoundRobinStrategy());
  orchestrator4.registerProvider(new MockProvider('mock-1'));
  orchestrator4.registerProvider(new MockProvider('mock-2'));

  const response = await orchestrator4.chat([
    { role: 'user', content: 'Hola, ¿cómo estás?' },
  ]);

  console.log(`  Respuesta: ${response.content}`);
  console.log(`  Tokens: ${response.usage?.totalTokens}`);
  console.log('');

  // Test 5: Streaming con mock
  console.log('📋 Test 5: Streaming con Mock Provider');
  console.log('─────────────────────────────────');
  const stream = await orchestrator4.chatStream([
    { role: 'user', content: 'Cuenta hasta 3' },
  ]);

  const reader = stream.getReader();
  process.stdout.write('  Stream: ');
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    process.stdout.write(value.content);
  }
  console.log('\n');

  // Cleanup
  orchestrator1.dispose();
  orchestrator2.dispose();
  orchestrator3.dispose();
  orchestrator4.dispose();

  console.log('✅ Todas las pruebas completadas!');
}

main().catch(console.error);

