#!/usr/bin/env node
/**
 * Chat App - Ejemplo de uso de @ai-orchestration/core
 * 
 * Setup:
 * 1. npm link @ai-orchestration/core (desde este directorio)
 * 2. Configurar .env con tus API keys
 * 3. npm start
 */

// Cargar variables de entorno desde .env
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Cargar .env desde el directorio actual
config({ path: resolve(process.cwd(), '.env') });

import { createOrchestrator, type Orchestrator } from '@ai-orchestration/core';
import type { ProviderConfig } from '@ai-orchestration/core';
import * as readline from 'readline';

// Cargar configuración desde JSON
interface ProviderConfigJson {
  id: string;
  type: string;
  envKey: string;
  model?: string;
  baseURL?: string;
}

interface AppConfig {
  providers: ProviderConfigJson[];
  defaultStrategy: string;
  chatOptions?: {
    temperature?: number;
    maxTokens?: number;
  };
}

const configPath = resolve(process.cwd(), 'config.json');
const appConfig: AppConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

// Convertir configuración JSON a ProviderConfig, filtrando solo los que tienen API key
const providers = appConfig.providers
  .map((providerConfig) => {
    const apiKey = process.env[providerConfig.envKey];
    if (!apiKey || apiKey.trim().length === 0) {
      return null;
    }

    return {
      id: providerConfig.id,
      type: providerConfig.type,
      apiKey,
      model: providerConfig.model,
      baseURL: providerConfig.baseURL,
    } as ProviderConfig;
  })
  .filter((p): p is ProviderConfig => p !== null);

if (providers.length === 0) {
  console.error('❌ No hay proveedores configurados.');
  console.error('');
  console.error('   📝 Configura al menos una API key en el archivo .env:');
  console.error('');
  appConfig.providers.forEach((providerConfig) => {
    console.error(`   ${providerConfig.envKey}=tu-key-aqui`);
  });
  console.error('');
  console.error('   💡 Puedes copiar .env.example a .env y editarlo:');
  console.error('   cp .env.example .env');
  console.error('');
  process.exit(1);
}

// Estado de la aplicación
let orchestrator: Orchestrator;
let currentStrategy = appConfig.defaultStrategy || 'round-robin';
let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
const defaultChatOptions = appConfig.chatOptions || { temperature: 0.7, maxTokens: 1000 };

// Crear interfaz de línea de comandos
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Inicializar orchestrator
async function initOrchestrator() {
  try {
    orchestrator = createOrchestrator({
      providers,
      strategy: {
        type: currentStrategy,
        ...(currentStrategy === 'priority' && {
          priorities: Object.fromEntries(
            providers.map((p, index) => [p.id, index + 1])
          ),
        }),
        ...(currentStrategy === 'fallback' && {
          order: providers.map((p) => p.id),
        }),
      },
    });
    
    const totalProviders = orchestrator.getAllProviders();
    const availableProviders = await orchestrator.getAvailableProviders();
    
    console.log(`✅ Orchestrator inicializado con estrategia: ${currentStrategy}`);
    console.log(`✅ Proveedores configurados: ${totalProviders.length}`);
    
    // Mostrar estado de cada proveedor
    if (totalProviders.length > 0) {
      console.log('\n📋 Estado de proveedores:');
      for (const provider of totalProviders) {
        const isAvailable = availableProviders.some(p => p.id === provider.id);
        const status = isAvailable ? '✅' : '⚠️';
        console.log(`  ${status} ${provider.id} (${provider.metadata.name})`);
      }
    }
    
    if (availableProviders.length === 0) {
      console.log(`\n⚠️  Advertencia: Ningún proveedor está saludable actualmente.`);
      console.log(`   Ejecuta /health para más detalles.\n`);
    } else if (availableProviders.length < totalProviders.length) {
      console.log(`\n⚠️  Advertencia: ${totalProviders.length - availableProviders.length} proveedor(es) no están saludables.`);
      console.log(`   Ejecuta /health para más detalles.`);
      console.log(`   Los proveedores saludables seguirán funcionando normalmente.\n`);
    } else {
      console.log(`\n✅ Todos los proveedores están disponibles.\n`);
    }
  } catch (error) {
    console.error('❌ Error al inicializar orchestrator:', error);
    process.exit(1);
  }
}

// Mostrar ayuda
function showHelp() {
  console.log('\n📖 Comandos disponibles:');
  console.log('  /help              - Muestra esta ayuda');
  console.log('  /strategy <tipo>   - Cambia la estrategia (round-robin, priority, fallback)');
  console.log('  /providers         - Lista los proveedores disponibles');
  console.log('  /health            - Verifica la salud de los proveedores');
  console.log('  /clear             - Limpia el historial de conversación');
  console.log('  /exit o /quit      - Sale de la aplicación');
  console.log('  <mensaje>          - Envía un mensaje al asistente\n');
}

// Listar proveedores
function listProviders() {
  const allProviders = orchestrator.getAllProviders();
  console.log('\n📋 Proveedores configurados:');
  allProviders.forEach((provider, index) => {
    console.log(`  ${index + 1}. ${provider.id} (${provider.metadata.name})`);
    if (provider.metadata.model) {
      console.log(`     Modelo: ${provider.metadata.model}`);
    }
  });
  console.log('');
}

// Verificar salud
async function checkHealth() {
  console.log('\n🏥 Verificando salud de proveedores...');
  const allProviders = orchestrator.getAllProviders();
  
  if (allProviders.length === 0) {
    console.log('  ⚠️  No hay proveedores configurados.\n');
    return;
  }
  
  for (const provider of allProviders) {
    try {
      const health = await provider.checkHealth();
      const status = health.healthy ? '✅' : '❌';
      const latency = health.latency ? ` (${health.latency}ms)` : '';
      const error = health.error ? ` - ${health.error.substring(0, 80)}${health.error.length > 80 ? '...' : ''}` : '';
      console.log(`  ${status} ${provider.id}${latency}${error}`);
    } catch (error) {
      console.log(`  ❌ ${provider.id} - Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  const available = await orchestrator.getAvailableProviders();
  console.log(`\n  📊 Total: ${allProviders.length} configurados, ${available.length} disponibles\n`);
}

// Cambiar estrategia
async function changeStrategy(strategy: string) {
  const validStrategies = ['round-robin', 'priority', 'fallback'];
  if (!validStrategies.includes(strategy)) {
    console.log(`❌ Estrategia inválida. Opciones: ${validStrategies.join(', ')}\n`);
    return;
  }
  
  currentStrategy = strategy;
  await initOrchestrator();
  console.log(`✅ Estrategia cambiada a: ${currentStrategy}\n`);
}

// Enviar mensaje
async function sendMessage(message: string) {
  if (!message.trim()) return;

  conversationHistory.push({ role: 'user', content: message });
  
  // Formatear mensajes para el API
  const messages = [
    ...conversationHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: msg.content,
    })),
  ];

  try {
    // Verificar proveedores disponibles antes de intentar
    const availableProviders = await orchestrator.getAvailableProviders();
    if (availableProviders.length === 0) {
      console.log('⚠️  No hay proveedores saludables disponibles.');
      console.log('   Ejecuta /health para ver el estado de los proveedores.');
      console.log('   Ejecuta /providers para ver los proveedores configurados.\n');
      return;
    }

    process.stdout.write('🤔 Pensando... ');
    
    const startTime = Date.now();
    const response = await orchestrator.chat(messages, {
      temperature: 0.7,
      maxTokens: 1000,
    });
    const duration = Date.now() - startTime;

    console.log(`\r✅ Respuesta (${duration}ms):\n`);
    console.log(`   ${response.content}\n`);
    
    if (response.model) {
      console.log(`   📊 Modelo: ${response.model}`);
    }
    if (response.usage) {
      console.log(`   📊 Tokens: ${response.usage.totalTokens} (prompt: ${response.usage.promptTokens}, completion: ${response.usage.completionTokens})`);
    }
    console.log('');

    conversationHistory.push({ role: 'assistant', content: response.content });
  } catch (error) {
    console.log(`\r❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    
    // Diagnóstico adicional
    if (error instanceof Error && error.message.includes('No available providers')) {
      console.log('💡 Sugerencias:');
      console.log('   1. Ejecuta /health para ver el estado de los proveedores');
      console.log('   2. Verifica que tus API keys son válidas en el archivo .env');
      console.log('   3. Verifica tu conexión a internet');
      console.log('   4. Algunos proveedores pueden tener rate limits\n');
    }
  }
}

// Procesar comando
async function processCommand(input: string) {
  const [command, ...args] = input.trim().split(' ');

  switch (command.toLowerCase()) {
    case '/help':
      showHelp();
      break;
    case '/strategy':
      if (args.length === 0) {
        console.log('❌ Especifica una estrategia: /strategy <tipo>\n');
      } else {
        await changeStrategy(args[0]);
      }
      break;
    case '/providers':
      listProviders();
      break;
    case '/health':
      await checkHealth();
      break;
    case '/clear':
      conversationHistory = [];
      console.log('✅ Historial limpiado\n');
      break;
    case '/exit':
    case '/quit':
      console.log('\n👋 ¡Hasta luego!\n');
      orchestrator.dispose();
      rl.close();
      process.exit(0);
      break;
    default:
      // No es un comando, enviar como mensaje
      await sendMessage(input);
      break;
  }
}

// Función principal
async function main() {
  console.log('🚀 Chat App - Ejemplo con @ai-orchestration/core\n');
  console.log('💡 Escribe /help para ver los comandos disponibles\n');
  
  await initOrchestrator();
  
  rl.setPrompt('💬 Tú: ');
  rl.prompt();

  rl.on('line', async (input) => {
    await processCommand(input);
    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n👋 ¡Hasta luego!\n');
    orchestrator.dispose();
    process.exit(0);
  });
}

// Manejar errores no capturados
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Error no manejado:', error);
  rl.close();
  process.exit(1);
});

main().catch(console.error);
