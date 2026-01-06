/**
 * Priority strategy: selects providers based on priority order
 */

import { BaseStrategy } from './base.js';
import type { AIService, SelectionContext } from '../core/interfaces.js';

export interface PriorityStrategyConfig {
  priorities?: Record<string, number>; // providerId -> priority (lower = higher priority)
}

export class PriorityStrategy extends BaseStrategy {
  private priorities: Map<string, number> = new Map();

  constructor(config?: PriorityStrategyConfig) {
    super();
    if (config?.priorities) {
      Object.entries(config.priorities).forEach(([id, priority]) => {
        this.priorities.set(id, priority);
      });
    }
  }

  async select(
    providers: AIService[],
    context?: SelectionContext
  ): Promise<AIService | null> {
    const available = this.filterAttempted(providers, context);
    if (available.length === 0) {
      return null;
    }

    // Sort by priority (lower number = higher priority)
    const sorted = [...available].sort((a, b) => {
      const priorityA = this.priorities.get(a.id) ?? 999;
      const priorityB = this.priorities.get(b.id) ?? 999;
      return priorityA - priorityB;
    });

    return sorted[0];
  }

  /**
   * Set priority for a provider
   */
  setPriority(providerId: string, priority: number): void {
    this.priorities.set(providerId, priority);
  }
}

