# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2025-01-XX

### Added
- **Image Generation Support**: Generate images from text prompts using DALL-E models
  - New `OpenAIProvider` for OpenAI API integration (chat and image generation)
  - `generateImage()` method in orchestrator and providers
  - `ImageGenerationOptions` interface with support for quality, style, size, and response format
  - `ImageGenerationResponse` interface with generated images metadata
  - Example: `examples/image-generation.ts` demonstrating image generation usage
- **Multimodal Content Support**: Enhanced message handling for text and images
  - `ContentPart` union type for multimodal messages (`TextContent` and `ImageContent`)
  - `ChatMessage.content` now supports both string and `ContentPart[]`
  - All providers updated to handle multimodal input (vision models)
  - Example: `examples/images.ts` demonstrating image analysis
- **Comprehensive Test Suite**:
  - `tests/image-generation.test.ts`: 10 tests for image generation functionality
  - `tests/multimodal.test.ts`: 9 tests for multimodal content handling
  - All 28 tests passing
- **Improved Documentation**:
  - JSDoc comments for all public methods
  - Enhanced type definitions with union types for better type safety
  - Clear separation between vision (analyzing images) and image generation capabilities

### Changed
- `ImageGenerationOptions.quality` and `style` now use union types instead of generic strings
- Provider metadata now includes `supportsImageGeneration` flag
- Error messages updated to guide users to correct providers for image generation

### Fixed
- Removed non-functional image generation code from `OpenRouterProvider`
- Fixed test script to use `--import` instead of deprecated `--loader` flag
- Improved code organization and clean architecture principles

## [0.2.0] - 2025-12-05

### Added
- **Metrics and Analytics System**: Track provider usage, costs, and strategy effectiveness
  - `MetricsCollector` class for comprehensive metrics tracking
  - Provider metrics: requests, success/failure rates, latency, token usage, costs
  - Strategy metrics: selection counts, distribution, selection time
  - Overall metrics: total requests, costs, error rates, requests per minute
  - Real-time event callbacks (`onMetricsEvent`)
  - Request history with filtering options
- **Advanced Configuration Options**:
  - `maxRetries`: Configurable retry attempts
  - `requestTimeout`: Global and per-request timeouts
  - `retryDelay`: Configurable delay with exponential backoff support
  - `circuitBreaker`: Automatic provider disabling after failures
  - Enhanced `healthCheck` config with timeout, max failures, latency threshold
- **Enhanced Chat Options**:
  - `frequencyPenalty` and `presencePenalty` for controlling repetition
  - `seed` for reproducible outputs
  - `user` identifier for tracking/rate limiting
  - `timeout` for per-request timeouts
- **Language Forcing**: `responseLanguage` option to force responses in specific languages
- **Provider Improvements**:
  - Fixed API parameter handling (exclude framework-specific options)
  - Better error messages and validation
- **Documentation**: Complete examples and usage guides

### Changed
- Health check configuration now uses `healthCheck` object (backward compatible)
- Improved error handling and provider parameter filtering

### Fixed
- Fixed `responseLanguage` and other framework options being sent to provider APIs
- Fixed TypeScript compilation output location (now only in `dist/`)
- Improved type safety and error messages

## [0.1.0] - 2025-12-05

### Added
- Complete AI orchestration framework
- Support for multiple providers: Groq, OpenRouter, Gemini, Cerebras, Local
- 5 selection strategies: Round-Robin, Priority, Fallback, Weighted, Health-Aware
- Native streaming with ReadableStream
- Automatic health checks with latency metrics
- Factory for declarative creation
- Custom error handling
- Configuration validation
- Complete documentation (README, ARCHITECTURE, CONTRIBUTING)
- Usage examples
- Basic tests
- Node.js compatibility

### Main Features
- Plugin-based architecture (extensible without modifying core)
- Declarative and programmatic API
- Type-safe with TypeScript
- Automatic fallback between providers
- Support for cost-aware selection
- Health-aware selection with real-time metrics
