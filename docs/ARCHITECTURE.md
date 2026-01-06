# Framework Architecture

## Overview

The framework is designed following SOLID principles and plugin-based architecture, allowing extensibility without modifying core code.

## Main Components

### Core (`src/core/`)

#### `interfaces.ts`
Defines fundamental interfaces:
- `AIService`: Contract that all providers must implement
- `SelectionStrategy`: Contract for selection strategies
- `OrchestratorConfig`: Orchestrator configuration
- Configuration types for providers and strategies

#### `types.ts`
Shared types:
- `ChatMessage`: Message in a conversation
- `ChatOptions`: Options for chat completion
- `ChatResponse`: Non-streaming response
- `ChatChunk`: Streaming chunk
- `ProviderHealth`: Provider health status
- `ProviderMetadata`: Provider metadata

#### `orchestrator.ts`
Framework core:
- `Orchestrator`: Main class that manages providers and strategies
- Provider registration and management
- Automatic provider selection
- Automatic fallback on error
- Periodic health checks

### Providers (`src/providers/`)

Each provider extends `BaseProvider` and implements:
- `checkHealth()`: Health verification
- `chat()`: Chat completion (non-streaming)
- `chatStream()`: Chat completion (streaming)
- `formatMessages()`: Conversion from standard format to provider format
- `parseResponse()`: Conversion from provider response to standard format
- `parseStream()`: Conversion from provider stream to standard format

**Implemented providers:**
- `GroqProvider`: Groq API integration
- `OpenRouterProvider`: OpenRouter integration
- `GeminiProvider`: Google Gemini integration
- `CerebrasProvider`: Cerebras Inference API integration
- `LocalProvider`: For local models (OpenAI-compatible API)

### Strategies (`src/strategies/`)

Each strategy extends `BaseStrategy` and implements:
- `select()`: Provider selection logic
- `update()` (optional): Internal state update

**Implemented strategies:**
- `RoundRobinStrategy`: Cycles through providers
- `PriorityStrategy`: Selects by priority
- `FallbackStrategy`: Tries in order until success
- `WeightedStrategy`: Selection based on weights (load balancing)
- `HealthAwareStrategy`: Selection based on health metrics

### Factory (`src/factory/`)

- `createOrchestrator()`: Creates an orchestrator from declarative configuration
- `createProvider()`: Creates provider instances from configuration
- `createStrategy()`: Creates strategy instances from configuration
- `isValidOrchestratorConfig()`: Validates configuration

## Data Flow

```
User
  ↓
Orchestrator.chat() / chatStream()
  ↓
Strategy.select() → Selects provider
  ↓
Provider.chat() / chatStream()
  ↓
Provider formats messages → formatMessages()
  ↓
Provider API call
  ↓
Provider parses response → parseResponse() / parseStream()
  ↓
Standard response to user
```

## Extensibility

### Adding a New Provider

1. Create class extending `BaseProvider`
2. Implement required methods
3. Register in `factory/index.ts` (`createProvider` method)

### Adding a New Strategy

1. Create class extending `BaseStrategy`
2. Implement `select()` method
3. Optionally implement `update()`
4. Register in `factory/index.ts` (`createStrategy` method)

## Applied Design Principles

1. **Single Responsibility**: Each class has a single responsibility
2. **Open/Closed**: Open for extension, closed for modification
3. **Liskov Substitution**: Providers and strategies are interchangeable
4. **Interface Segregation**: Specific and cohesive interfaces
5. **Dependency Inversion**: Dependencies on abstractions, not implementations

## Compatibility

- **Node.js**: >= 18.0.0 (uses native ReadableStream)
- **TypeScript**: 5.3+
- **ES Modules**: Required

## Performance Considerations

- Health checks can run in parallel
- Automatic fallback avoids unnecessary waits
- Native streaming for long responses
- Strategies can cache metrics for better performance
