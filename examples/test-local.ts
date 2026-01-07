/**
 * Local test script
 * Run with: npm run test:local
 * or: tsx examples/test-local.ts
 */

import { createOrchestrator } from '../src/index.js';

async function main() {
  console.log('🚀 Iniciando prueba del framework...\n');

  // Verificar variables de entorno
  const hasGroq = !!process.env.GROQ_API_KEY;
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;

  console.log('📋 Estado de API Keys:');
  console.log(`  Groq: ${hasGroq ? '✅' : '❌'}`);
  console.log(`  OpenRouter: ${hasOpenRouter ? '✅' : '❌'}`);
  console.log(`  Gemini: ${hasGemini ? '✅' : '❌'}\n`);

  if (!hasGroq && !hasOpenRouter && !hasGemini) {
    console.log('⚠️  No se encontraron API keys.');
    console.log('   Configura las variables de entorno:');
    console.log('   export GROQ_API_KEY="tu-key"');
    console.log('   export OPENROUTER_API_KEY="tu-key"');
    console.log('   export GEMINI_API_KEY="tu-key"\n');
    console.log('   O crea un archivo .env con:');
    console.log('   GROQ_API_KEY=tu-key');
    console.log('   OPENROUTER_API_KEY=tu-key');
    console.log('   GEMINI_API_KEY=tu-key\n');
    return;
  }

  // Crear configuración dinámica basada en las keys disponibles
  const providers: any[] = [];

  if (hasGroq) {
    providers.push(      {
        id: 'groq-1',
        type: 'groq',
        apiKey: process.env.GROQ_API_KEY,
        model: 'llama-3.3-70b-versatile',
      });
  }

  if (hasOpenRouter) {
    providers.push({
      id: 'openrouter-1',
      type: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY,
      model: 'openai/gpt-3.5-turbo',
    });
  }

  if (hasGemini) {
    providers.push({
      id: 'gemini-1',
      type: 'gemini',
      apiKey: process.env.GEMINI_API_KEY,
      model: 'gemini-pro',
    });
  }

  try {
    console.log('🔧 Creando orchestrator...');
    const orchestrator = createOrchestrator({
      providers,
      strategy: {
        type: 'round-robin',
      },
    });

    console.log(`✅ Orchestrator creado con ${providers.length} proveedor(es)\n`);

    // Test 1: Chat simple
    console.log('📝 Test 1: Chat simple');
    console.log('─────────────────────────────────');
    const messages = [
      { role: 'user' as const, content: 'Di "Hola" en una sola palabra' },
    ];

    const startTime = Date.now();
    const response = await orchestrator.chat(messages, {
      temperature: 0.7,
      maxTokens: 50,
    });
    const duration = Date.now() - startTime;

    console.log(`Respuesta: ${response.content}`);
    console.log(`Modelo: ${response.model || 'N/A'}`);
    console.log(`Tiempo: ${duration}ms`);
    if (response.usage) {
      console.log(`Tokens: ${response.usage.totalTokens} (prompt: ${response.usage.promptTokens}, completion: ${response.usage.completionTokens})`);
    }
    console.log('');

    // Test 2: Verificar salud de proveedores
    console.log('🏥 Test 2: Health checks');
    console.log('─────────────────────────────────');
    const allProviders = orchestrator.getAllProviders();
    for (const provider of allProviders) {
      try {
        const health = await provider.checkHealth();
        console.log(`${provider.id}: ${health.healthy ? '✅' : '❌'} ${health.latency ? `(${health.latency}ms)` : ''}`);
      } catch (error) {
        console.log(`${provider.id}: ❌ Error - ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    console.log('');

    // Test 3: Streaming (opcional, comentado por defecto)
    if (process.env.TEST_STREAMING === 'true') {
      console.log('🌊 Test 3: Streaming');
      console.log('─────────────────────────────────');
      const stream = await orchestrator.chatStream([
        { role: 'user' as const, content: 'Cuenta del 1 al 5, un número por línea' },
      ]);

      const reader = stream.getReader();
      let fullContent = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullContent += value.content;
        process.stdout.write(value.content);
      }
      console.log('\n✅ Streaming completado\n');
    }

    // Cleanup
    orchestrator.dispose();
    console.log('✅ Pruebas completadas exitosamente!');

  } catch (error) {
    console.error('\n❌ Error durante las pruebas:');
    if (error instanceof Error) {
      console.error(`   ${error.name}: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack: ${error.stack}`);
      }
    } else {
      console.error(`   ${String(error)}`);
    }
    process.exit(1);
  }
}

main().catch(console.error);

