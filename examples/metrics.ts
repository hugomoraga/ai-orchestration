/**
 * Example: Using Metrics and Analytics
 * 
 * This example demonstrates how to track provider usage, costs, and strategy effectiveness
 */

import { createOrchestrator, type MetricsEvent } from '../src/index.js';

async function main() {
  // Check for API keys
  const hasGroq = !!process.env.GROQ_API_KEY;
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;

  if (!hasGroq && !hasOpenRouter) {
    console.error('❌ Error: No API keys found!\n');
    console.error('   Please set at least one API key:');
    console.error('   export GROQ_API_KEY="your-key"\n');
    process.exit(1);
  }

  const providers = [];
  if (hasGroq) {
    providers.push({
      id: 'groq-1',
      type: 'groq',
      apiKey: process.env.GROQ_API_KEY!,
      model: 'llama-3.3-70b-versatile',
      // Optional: Add cost per token for cost tracking
      metadata: {
        costPerToken: {
          prompt: 0.0000002, // $0.20 per 1M tokens
          completion: 0.0000002,
        },
      },
    });
  }

  if (hasOpenRouter) {
    providers.push({
      id: 'openrouter-1',
      type: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY!,
      model: 'openai/gpt-3.5-turbo',
      metadata: {
        costPerToken: {
          prompt: 0.0000015, // $1.50 per 1M tokens
          completion: 0.000002, // $2.00 per 1M tokens
        },
      },
    });
  }

  console.log(`✅ Using ${providers.length} provider(s)\n`);

  // Create orchestrator with metrics enabled
  const orchestrator = createOrchestrator({
    providers,
    strategy: {
      type: 'round-robin',
    },
    enableMetrics: true, // Enable metrics (default: true)
    onMetricsEvent: (event: MetricsEvent) => {
      // Optional: Log events in real-time
      // console.log('📊 Event:', event.type, event.providerId);
    },
  });

  // Make some requests
  console.log('📝 Making requests...\n');
  
  for (let i = 0; i < 3; i++) {
    try {
      const response = await orchestrator.chat([
        { role: 'user', content: `Say "Request ${i + 1}" in one word` },
      ]);
      console.log(`✅ Request ${i + 1}: ${response.content.substring(0, 20)}...`);
    } catch (error) {
      console.error(`❌ Request ${i + 1} failed:`, error);
    }
  }

  console.log('\n📊 ===== METRICS REPORT =====\n');

  // Get overall metrics
  const overallMetrics = orchestrator.getMetrics().getOrchestratorMetrics();
  
  console.log('📈 Overall Statistics:');
  console.log(`   Total Requests: ${overallMetrics.totalRequests}`);
  console.log(`   Successful: ${overallMetrics.successfulRequests}`);
  console.log(`   Failed: ${overallMetrics.failedRequests}`);
  console.log(`   Error Rate: ${(overallMetrics.errorRate * 100).toFixed(2)}%`);
  console.log(`   Average Latency: ${overallMetrics.averageRequestLatency.toFixed(2)}ms`);
  console.log(`   Requests/Minute: ${overallMetrics.requestsPerMinute}`);
  console.log(`   Total Cost: $${overallMetrics.totalCost.toFixed(6)}\n`);

  // Get provider-specific metrics
  console.log('🔌 Provider Metrics:\n');
  const providerMetrics = orchestrator.getMetrics().getAllProviderMetrics();
  
  for (const [providerId, metrics] of providerMetrics) {
    console.log(`   ${metrics.providerName} (${providerId}):`);
    console.log(`     Model: ${metrics.model || 'N/A'}`);
    console.log(`     Total Requests: ${metrics.totalRequests}`);
    console.log(`     Successful: ${metrics.successfulRequests}`);
    console.log(`     Failed: ${metrics.failedRequests}`);
    console.log(`     Success Rate: ${metrics.totalRequests > 0 ? ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2) : 0}%`);
    console.log(`     Average Latency: ${metrics.averageLatency.toFixed(2)}ms`);
    console.log(`     Total Tokens: ${metrics.totalTokens.total.toLocaleString()}`);
    console.log(`       - Prompt: ${metrics.totalTokens.prompt.toLocaleString()}`);
    console.log(`       - Completion: ${metrics.totalTokens.completion.toLocaleString()}`);
    console.log(`     Total Cost: $${metrics.totalCost.toFixed(6)}`);
    if (metrics.lastUsed) {
      console.log(`     Last Used: ${metrics.lastUsed.toLocaleString()}`);
    }
    console.log('');
  }

  // Get strategy metrics
  console.log('🎯 Strategy Metrics:\n');
  const strategyMetrics = orchestrator.getMetrics().getStrategyMetrics();
  
  console.log(`   Total Selections: ${strategyMetrics.totalSelections}`);
  console.log(`   Average Selection Time: ${strategyMetrics.averageSelectionTime.toFixed(2)}ms`);
  console.log(`   Selections by Provider:`);
  for (const [providerId, count] of strategyMetrics.selectionsByProvider) {
    const percentage = strategyMetrics.totalSelections > 0 
      ? ((count / strategyMetrics.totalSelections) * 100).toFixed(1)
      : '0';
    console.log(`     ${providerId}: ${count} (${percentage}%)`);
  }
  console.log('');

  // Get request history
  console.log('📜 Recent Request History:\n');
  const history = orchestrator.getMetrics().getRequestHistory({ limit: 5 });
  for (const request of history) {
    const status = request.success ? '✅' : '❌';
    const tokens = request.tokens ? ` (${request.tokens.total} tokens)` : '';
    const cost = request.cost ? ` - $${request.cost.toFixed(6)}` : '';
    console.log(`   ${status} ${request.providerId} - ${request.latency}ms${tokens}${cost}`);
  }

  console.log('\n💡 Tip: Use orchestrator.getMetrics() to access all metrics programmatically');
  console.log('   You can also register callbacks with onMetricsEvent() for real-time tracking\n');

  orchestrator.dispose();
}

main().catch(console.error);

