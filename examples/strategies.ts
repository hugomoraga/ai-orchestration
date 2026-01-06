/**
 * Examples of different strategies
 */

import { createOrchestrator } from '../src/index.js';

// Example 1: Priority Strategy
export function createPriorityOrchestrator() {
  return createOrchestrator({
    providers: [
      {
        id: 'groq-1',
        type: 'groq',
        apiKey: process.env.GROQ_API_KEY || '',
        priority: 1,
      },
      {
        id: 'openrouter-1',
        type: 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY || '',
        priority: 2,
      },
    ],
    strategy: {
      type: 'priority',
      priorities: {
        'groq-1': 1,
        'openrouter-1': 2,
      },
    },
  });
}

// Example 2: Fallback Strategy
export function createFallbackOrchestrator() {
  return createOrchestrator({
    providers: [
      {
        id: 'groq-1',
        type: 'groq',
        apiKey: process.env.GROQ_API_KEY || '',
      },
      {
        id: 'openrouter-1',
        type: 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY || '',
      },
      {
        id: 'gemini-1',
        type: 'gemini',
        apiKey: process.env.GEMINI_API_KEY || '',
      },
    ],
    strategy: {
      type: 'fallback',
      order: ['groq-1', 'openrouter-1', 'gemini-1'],
    },
  });
}

// Example 3: Weighted Strategy (Load Balancing)
export function createWeightedOrchestrator() {
  return createOrchestrator({
    providers: [
      {
        id: 'groq-1',
        type: 'groq',
        apiKey: process.env.GROQ_API_KEY || '',
        weight: 0.7,
      },
      {
        id: 'openrouter-1',
        type: 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY || '',
        weight: 0.3,
      },
    ],
    strategy: {
      type: 'weighted',
      weights: {
        'groq-1': 0.7,
        'openrouter-1': 0.3,
      },
    },
  });
}

// Example 4: Health-Aware Strategy
export function createHealthAwareOrchestrator() {
  return createOrchestrator({
    providers: [
      {
        id: 'groq-1',
        type: 'groq',
        apiKey: process.env.GROQ_API_KEY || '',
      },
      {
        id: 'openrouter-1',
        type: 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY || '',
      },
    ],
    strategy: {
      type: 'health-aware',
      preferLowLatency: true,
      minHealthScore: 0.5,
    },
    enableHealthChecks: true,
    healthCheckInterval: 30000, // 30 seconds
  });
}

