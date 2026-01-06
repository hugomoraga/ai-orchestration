# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
