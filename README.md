# AI Orchestration Framework

A modular and extensible framework for orchestrating multiple AI/LLM providers consistently and configurable.

**📦 This is an npm package**: API keys must be configured in the project that uses this package (using environment variables or `.env` files in that project), not in the package itself.

## Features

- 🔌 **Plugin-based architecture**: Add new providers or strategies without modifying the core
- 🎯 **Multiple selection strategies**: Round-robin, priority, fallback, weighted, health-aware
- 🌊 **Native streaming**: Full support for streaming responses using ReadableStream
- 🔄 **Automatic fallback**: Automatically tries multiple providers if one fails
- 💚 **Health checks**: Provider health monitoring with latency metrics
- 📦 **Runtime agnostic**: Compatible with Node.js and Bun
- 🎨 **Declarative API**: Simple configuration via JSON/JS objects
- 🔒 **Type-safe**: Fully typed with TypeScript

## Installation

```bash
npm install @ai-orchestration/core
```

## Quick Start

### Basic Usage

```typescript
import { createOrchestrator } from '@ai-orchestration/core';

// API keys should come from environment variables configured in YOUR project
// Example: export GROQ_API_KEY="your-key" or using dotenv in your project
const orchestrator = createOrchestrator({
  providers: [
    {
      id: 'groq-1',
      type: 'groq',
      apiKey: process.env.GROQ_API_KEY!, // Configure this variable in your project
      model: 'llama-3.3-70b-versatile',
    },
    {
      id: 'openrouter-1',
      type: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY!,
      model: 'openai/gpt-3.5-turbo',
    },
  ],
  strategy: {
    type: 'round-robin',
  },
});

// Simple chat
const response = await orchestrator.chat([
  { role: 'user', content: 'Hello, world!' },
]);

console.log(response.content);

// Streaming chat
const stream = await orchestrator.chatStream([
  { role: 'user', content: 'Tell me a story' },
]);

const reader = stream.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  process.stdout.write(value.content);
}
```

### Programmatic Usage

```typescript
import {
  Orchestrator,
  RoundRobinStrategy,
  GroqProvider,
  OpenRouterProvider,
} from '@ai-orchestration/core';

// Create strategy
const strategy = new RoundRobinStrategy();

// Create orchestrator
const orchestrator = new Orchestrator(strategy);

// Register providers
// API keys should come from environment variables configured in YOUR project
orchestrator.registerProvider(
  new GroqProvider({
    id: 'groq-1',
    apiKey: process.env.GROQ_API_KEY!,
  })
);

orchestrator.registerProvider(
  new OpenRouterProvider({
    id: 'openrouter-1',
    apiKey: process.env.OPENROUTER_API_KEY!,
  })
);

// Use
const response = await orchestrator.chat([
  { role: 'user', content: 'Hello!' },
]);
```

## Selection Strategies

### Round-Robin

Cycles through providers in order:

```typescript
{
  strategy: {
    type: 'round-robin',
  },
}
```

### Priority

Selects providers based on priority (lower number = higher priority):

```typescript
{
  strategy: {
    type: 'priority',
    priorities: {
      'groq-1': 1,
      'openrouter-1': 2,
      'gemini-1': 3,
    },
  },
}
```

### Fallback

Tries providers in order until one works:

```typescript
{
  strategy: {
    type: 'fallback',
    order: ['groq-1', 'openrouter-1', 'gemini-1'],
  },
}
```

### Weighted

Selection based on weights (useful for load balancing):

```typescript
{
  strategy: {
    type: 'weighted',
    weights: {
      'groq-1': 0.7,
      'openrouter-1': 0.3,
    },
  },
}
```

### Weighted Cost-Aware

Considers cost per token:

```typescript
{
  strategy: {
    type: 'weighted',
    costAware: true,
    weights: {
      'groq-1': 1.0,
      'openrouter-1': 1.0,
    },
  },
}
```

### Health-Aware

Selects based on health metrics (latency, success rate):

```typescript
{
  strategy: {
    type: 'health-aware',
    preferLowLatency: true,
    minHealthScore: 0.5,
  },
}
```

## Supported Providers

### Groq

```typescript
{
  id: 'groq-1',
  type: 'groq',
  apiKey: 'your-api-key',
  model: 'llama-3.3-70b-versatile', // optional, default
  baseURL: 'https://api.groq.com/openai/v1', // optional
}
```

### OpenRouter

```typescript
{
  id: 'openrouter-1',
  type: 'openrouter',
  apiKey: 'your-api-key',
  model: 'openai/gpt-3.5-turbo', // optional
  baseURL: 'https://openrouter.ai/api/v1', // optional
}
```

### Google Gemini

```typescript
{
  id: 'gemini-1',
  type: 'gemini',
  apiKey: 'your-api-key',
  model: 'gemini-pro', // optional
  baseURL: 'https://generativelanguage.googleapis.com/v1beta', // optional
}
```

### Cerebras

Cerebras Inference API - OpenAI compatible. Documentation: [inference-docs.cerebras.ai](https://inference-docs.cerebras.ai/quickstart)

```typescript
{
  id: 'cerebras-1',
  type: 'cerebras',
  apiKey: 'your-api-key', // Get at: https://inference-docs.cerebras.ai
  model: 'llama-3.3-70b', // optional, default
  baseURL: 'https://api.cerebras.ai/v1', // optional
}
```

**Note**: Cerebras API requires the `User-Agent` header to avoid CloudFront blocking. This is included automatically.

### Local (Local Models)

For local models that expose an OpenAI-compatible API:

```typescript
{
  id: 'local-1',
  type: 'local',
  baseURL: 'http://localhost:8000',
  model: 'local-model', // optional
  apiKey: 'optional-key', // optional
}
```

## Health Checks

Enable periodic health monitoring:

```typescript
const orchestrator = createOrchestrator({
  providers: [...],
  strategy: {...},
  enableHealthChecks: true,
  healthCheckInterval: 60000, // every 60 seconds
});
```

Or manually:

```typescript
const health = await provider.checkHealth();
console.log(health.healthy, health.latency);
```

## Chat Options

```typescript
const response = await orchestrator.chat(messages, {
  temperature: 0.7,
  maxTokens: 1000,
  topP: 0.9,
  topK: 40,
  stopSequences: ['\n\n'],
});
```

## Extensibility

### Adding a New Provider

```typescript
import { BaseProvider } from '@ai-orchestration/core';
import type {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ChatChunk,
  ProviderHealth,
  ProviderMetadata,
} from '@ai-orchestration/core';

export class CustomProvider extends BaseProvider {
  readonly id: string;
  readonly metadata: ProviderMetadata;
  
  constructor(config: CustomConfig) {
    super();
    this.id = config.id;
    this.metadata = {
      id: this.id,
      name: 'Custom Provider',
    };
  }
  
  async checkHealth(): Promise<ProviderHealth> {
    // Implement health check
  }
  
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    // Implement chat
  }
  
  async chatStream(messages: ChatMessage[], options?: ChatOptions): Promise<ReadableStream<ChatChunk>> {
    // Implement streaming
  }
  
  protected formatMessages(messages: ChatMessage[]): unknown {
    // Convert standard format to provider format
  }
  
  protected parseResponse(response: unknown): ChatResponse {
    // Convert provider response to standard format
  }
  
  protected parseStream(stream: ReadableStream<unknown>): ReadableStream<ChatChunk> {
    // Convert provider stream to standard format
  }
}
```

### Adding a New Strategy

```typescript
import { BaseStrategy } from '@ai-orchestration/core';
import type { AIService, SelectionContext } from '@ai-orchestration/core';

export class CustomStrategy extends BaseStrategy {
  async select(
    providers: AIService[],
    context?: SelectionContext
  ): Promise<AIService | null> {
    // Implement selection logic
    return providers[0];
  }
  
  update?(provider: AIService, success: boolean, metadata?: unknown): void {
    // Optional: update internal state
  }
}
```

## Architecture

```
src/
├── core/
│   ├── interfaces.ts      # Main interfaces
│   ├── types.ts           # Shared types
│   ├── orchestrator.ts    # Orchestrator core
│   └── errors.ts          # Custom error classes
├── providers/
│   ├── base.ts            # Base class for providers
│   ├── groq.ts
│   ├── openrouter.ts
│   ├── gemini.ts
│   ├── cerebras.ts
│   └── local.ts
├── strategies/
│   ├── base.ts            # Base class for strategies
│   ├── round-robin.ts
│   ├── priority.ts
│   ├── fallback.ts
│   ├── weighted.ts
│   └── health-aware.ts
├── factory/
│   └── index.ts           # Factory for declarative creation
└── index.ts               # Main entry point
```

## Design Principles

- **Single Responsibility**: Each class has a single responsibility
- **Open/Closed Principle**: Extensible without modifying the core
- **Plugin-based Architecture**: Providers and strategies are plugins
- **Composition over Inheritance**: Preference for composition
- **Configuration over Hard-coding**: Declarative configuration
- **Declarative APIs**: Simple and expressive APIs

## Development

### Setup

```bash
# Install dependencies
npm install

# Build
npm run build

# Development with watch
npm run dev

# Type checking
npm run typecheck

# Tests
npm test
```

### Testing

#### Quick Test (No API Keys Required)

Test the framework with mock providers without needing API keys:

```bash
npm run test:mock
```

#### Test with Real Providers

**Note**: The `@ai-orchestration/core` package does not include `.env` files. Environment variables must be configured in your project or in the examples.

1. **Set environment variables:**

```bash
export GROQ_API_KEY="your-key"
export OPENROUTER_API_KEY="your-key"
export GEMINI_API_KEY="your-key"
export CEREBRAS_API_KEY="your-key"
```

2. **Run tests:**

```bash
npm run test:local
```

### Local Development in Other Projects

#### Method 1: npm link (Recommended)

```bash
# In this directory (ai-orchestration)
npm run link

# In your other project
npm link @ai-orchestration/core
```

Now you can import normally:
```typescript
import { createOrchestrator } from '@ai-orchestration/core';
```

#### Method 2: npm pack

```bash
# In this directory
npm run pack:local

# In your other project
npm install ./@ai-orchestration-core-0.1.0.tgz
```

## Requirements

- **Node.js**: >= 18.0.0 (for native ReadableStream and test runner)
- **TypeScript**: 5.3+ (already included in devDependencies)

## Examples

See the `examples/` directory for more code examples:
- `basic.ts` - Basic usage example
- `strategies.ts` - Strategy examples
- `test-local.ts` - Testing with real providers
- `test-mock.ts` - Testing with mock providers
- `chat-app/` - Full chat application example

## License

MIT

## Contributing

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines on contributing to this project.

## Related Documentation

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Detailed architecture documentation
- [CHANGELOG.md](./docs/CHANGELOG.md) - Version history and changes