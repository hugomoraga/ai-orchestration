/**
 * Basic tests for the framework
 * These tests verify the core functionality without requiring API keys
 * 
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  Orchestrator,
  RoundRobinStrategy,
  PriorityStrategy,
  FallbackStrategy,
  createOrchestrator,
  isValidOrchestratorConfig,
  ConfigurationError,
} from '../src/index.js';

test('Orchestrator should create with a strategy', () => {
  const strategy = new RoundRobinStrategy();
  const orchestrator = new Orchestrator(strategy);
  assert.ok(orchestrator instanceof Orchestrator);
});

test('Orchestrator should register and retrieve providers', () => {
  const strategy = new RoundRobinStrategy();
  const orchestrator = new Orchestrator(strategy);
  
  // Mock provider
  const mockProvider = {
    id: 'test-provider',
    metadata: { id: 'test-provider', name: 'Test' },
    checkHealth: async () => ({ healthy: true, lastChecked: new Date() }),
    chat: async () => ({ content: 'test', model: 'test', usage: undefined }),
    chatStream: async () => new ReadableStream(),
  };

  orchestrator.registerProvider(mockProvider as any);
  assert.strictEqual(orchestrator.getProvider('test-provider'), mockProvider);
  assert.strictEqual(orchestrator.getAllProviders().length, 1);
});

test('Orchestrator should unregister providers', () => {
  const strategy = new RoundRobinStrategy();
  const orchestrator = new Orchestrator(strategy);
  
  const mockProvider = {
    id: 'test-provider',
    metadata: { id: 'test-provider', name: 'Test' },
    checkHealth: async () => ({ healthy: true, lastChecked: new Date() }),
    chat: async () => ({ content: 'test', model: 'test', usage: undefined }),
    chatStream: async () => new ReadableStream(),
  };

  orchestrator.registerProvider(mockProvider as any);
  orchestrator.unregisterProvider('test-provider');
  assert.strictEqual(orchestrator.getProvider('test-provider'), undefined);
});

test('Should create RoundRobinStrategy', () => {
  const strategy = new RoundRobinStrategy();
  assert.ok(strategy instanceof RoundRobinStrategy);
});

test('Should create PriorityStrategy', () => {
  const strategy = new PriorityStrategy({
    priorities: { 'provider-1': 1, 'provider-2': 2 },
  });
  assert.ok(strategy instanceof PriorityStrategy);
});

test('Should create FallbackStrategy', () => {
  const strategy = new FallbackStrategy({
    order: ['provider-1', 'provider-2'],
  });
  assert.ok(strategy instanceof FallbackStrategy);
});

test('Factory should validate orchestrator config', () => {
  const validConfig = {
    providers: [
      {
        id: 'test',
        type: 'groq',
        apiKey: 'test-key',
      },
    ],
    strategy: {
      type: 'round-robin',
    },
  };

  assert.strictEqual(isValidOrchestratorConfig(validConfig), true);
  assert.strictEqual(isValidOrchestratorConfig(null), false);
  assert.strictEqual(isValidOrchestratorConfig({}), false);
});

test('Factory should throw error for invalid config', () => {
  assert.throws(() => {
    createOrchestrator({
      providers: [],
      strategy: { type: 'round-robin' },
    });
  }, ConfigurationError);
});

test('Factory should throw error for missing provider apiKey', () => {
  assert.throws(() => {
    createOrchestrator({
      providers: [
        {
          id: 'test',
          type: 'groq',
          // Missing apiKey
        },
      ],
      strategy: { type: 'round-robin' },
    });
  }, ConfigurationError);
});
