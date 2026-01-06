/**
 * Round-robin strategy: cycles through providers in order
 */

import { BaseStrategy } from './base.js';
import type { AIService, SelectionContext } from '../core/interfaces.js';

export class RoundRobinStrategy extends BaseStrategy {
  private currentIndex = 0;

  async select(
    providers: AIService[],
    context?: SelectionContext
  ): Promise<AIService | null> {
    const available = this.filterAttempted(providers, context);
    if (available.length === 0) {
      return null;
    }

    // Reset index if it's out of bounds
    if (this.currentIndex >= available.length) {
      this.currentIndex = 0;
    }

    const selected = available[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % available.length;

    return selected;
  }
}

