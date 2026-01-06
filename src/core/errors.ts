/**
 * Custom error classes for the framework
 */

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly providerId: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class StrategyError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'StrategyError';
  }
}

export class OrchestratorError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'OrchestratorError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

