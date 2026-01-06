/**
 * Fallback strategy: tries providers in order until one succeeds
 */

import { BaseStrategy } from './base.js';
import type { AIService, SelectionContext } from '../core/interfaces.js';

export interface FallbackStrategyConfig {
  order?: string[]; // Provider IDs in fallback order
}

export class FallbackStrategy extends BaseStrategy {
  private order: string[];

  constructor(config?: FallbackStrategyConfig) {
    super();
    this.order = config?.order ?? [];
  }

  async select(
    providers: AIService[],
    context?: SelectionContext
  ): Promise<AIService | null> {
    const available = this.filterAttempted(providers, context);
    if (available.length === 0) {
      return null;
    }

    // If order is specified, use it
    if (this.order.length > 0) {
      for (const id of this.order) {
        const provider = available.find((p) => p.id === id);
        if (provider) {
          return provider;
        }
      }
    }

    // Otherwise, return first available
    return available[0];
  }
}

