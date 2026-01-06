/**
 * Base strategy implementations
 */

import type { AIService, SelectionStrategy, SelectionContext } from '../core/interfaces.js';

/**
 * Base class for strategies with common utilities
 */
export abstract class BaseStrategy implements SelectionStrategy {
  abstract select(
    providers: AIService[],
    context?: SelectionContext
  ): Promise<AIService | null>;

  update?(_provider: AIService, _success: boolean, _metadata?: unknown): void {
    // Default: no-op
  }

  /**
   * Filter out providers that were already attempted
   */
  protected filterAttempted(
    providers: AIService[],
    context?: SelectionContext
  ): AIService[] {
    if (!context?.previousAttempts || context.previousAttempts.length === 0) {
      return providers;
    }

    return providers.filter(
      (p) => !context.previousAttempts!.includes(p.id)
    );
  }
}

