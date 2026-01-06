# Contributing Guide

## Project Structure

```
src/
├── core/           # Framework core (interfaces, types, orchestrator)
├── providers/      # Provider implementations
├── strategies/     # Selection strategies
├── factory/        # Factory for declarative creation
└── index.ts        # Main entry point
```

## Adding a New Provider

1. **Create the provider file** in `src/providers/`:

```typescript
import { BaseProvider } from './base.js';
import type {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ChatChunk,
  ProviderHealth,
  ProviderMetadata,
} from '../core/types.js';

export interface CustomProviderConfig {
  id: string;
  apiKey: string;
  // ... other provider-specific fields
}

export class CustomProvider extends BaseProvider {
  readonly id: string;
  readonly metadata: ProviderMetadata;
  
  constructor(config: CustomProviderConfig) {
    super();
    // Initialization
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
    // Convert response to standard format
  }
  
  protected parseStream(stream: ReadableStream<unknown>): ReadableStream<ChatChunk> {
    // Convert stream to standard format
  }
}
```

2. **Export in `src/providers/index.ts`**:

```typescript
export { CustomProvider } from './custom.js';
export type { CustomProviderConfig } from './custom.js';
```

3. **Register in `src/factory/index.ts`**:

```typescript
import { CustomProvider, type CustomProviderConfig } from '../providers/index.js';

// In the createProvider function:
case 'custom':
  return new CustomProvider({
    id,
    ...(rest as CustomProviderConfig),
  } as CustomProviderConfig);
```

## Adding a New Strategy

1. **Create the strategy file** in `src/strategies/`:

```typescript
import { BaseStrategy } from './base.js';
import type { AIService, SelectionContext } from '../core/interfaces.js';

export interface CustomStrategyConfig {
  // Strategy-specific configuration
}

export class CustomStrategy extends BaseStrategy {
  constructor(config?: CustomStrategyConfig) {
    super();
    // Initialization
  }
  
  async select(
    providers: AIService[],
    context?: SelectionContext
  ): Promise<AIService | null> {
    // Implement selection logic
  }
  
  update?(provider: AIService, success: boolean, metadata?: unknown): void {
    // Optional: update internal state
  }
}
```

2. **Export in `src/strategies/index.ts`**

3. **Register in `src/factory/index.ts`**

## Code Conventions

- **Strict TypeScript**: Use explicit types
- **Descriptive names**: Variables and functions with clear names
- **Documentation**: JSDoc for public functions
- **Error handling**: Use custom error classes
- **Tests**: Add tests for new functionality

## Testing

Tests are in `tests/`. Use Node.js test runner:

```bash
npm test
```

For local testing with mock providers:

```bash
npm run test:mock
```

For testing with real providers:

```bash
npm run test:local
```

## Versioning

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Incompatible API changes
- **MINOR**: New backward-compatible functionality
- **PATCH**: Backward-compatible bug fixes

## Pull Requests

1. Create a branch from `main`
2. Implement changes
3. Add tests
4. Update documentation if necessary
5. Ensure all tests pass
6. Create PR with clear description

## Development Setup

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Build the project**:
   ```bash
   npm run build
   ```
4. **Run tests**:
   ```bash
   npm test
   ```

## Code Style

- Use TypeScript strict mode
- Follow existing code style
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small

## Commit Messages

Use clear, descriptive commit messages:
- Use imperative mood ("Add feature" not "Added feature")
- Reference issues when applicable
- Keep messages concise but informative
