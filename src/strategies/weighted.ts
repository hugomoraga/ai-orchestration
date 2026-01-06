/**
 * Weighted strategy: selects providers based on weights (for load balancing or cost-aware selection)
 */

import { BaseStrategy } from './base.js';
import type { AIService, SelectionContext } from '../core/interfaces.js';

export interface WeightedStrategyConfig {
  weights?: Record<string, number>; // providerId -> weight
  costAware?: boolean; // If true, considers cost per token
}

export class WeightedStrategy extends BaseStrategy {
  private weights: Map<string, number> = new Map();
  private costAware: boolean;

  constructor(config?: WeightedStrategyConfig) {
    super();
    this.costAware = config?.costAware ?? false;

    if (config?.weights) {
      Object.entries(config.weights).forEach(([id, weight]) => {
        this.weights.set(id, weight);
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

    // Calculate effective weights
    const weightedProviders = available.map((provider) => {
      let weight = this.weights.get(provider.id) ?? 1.0;

      // Adjust weight based on cost if cost-aware
      if (this.costAware && provider.metadata.costPerToken) {
        const avgCost =
          (provider.metadata.costPerToken.prompt +
            provider.metadata.costPerToken.completion) /
          2;
        // Lower cost = higher weight (inverse relationship)
        weight = weight / (avgCost + 0.0001); // Add small epsilon to avoid division by zero
      }

      return { provider, weight };
    });

    // Calculate total weight
    const totalWeight = weightedProviders.reduce(
      (sum, wp) => sum + wp.weight,
      0
    );

    if (totalWeight === 0) {
      return available[0]; // Fallback to first available
    }

    // Select using weighted random
    let random = Math.random() * totalWeight;
    for (const { provider, weight } of weightedProviders) {
      random -= weight;
      if (random <= 0) {
        return provider;
      }
    }

    // Fallback (shouldn't reach here)
    return available[0];
  }

  /**
   * Set weight for a provider
   */
  setWeight(providerId: string, weight: number): void {
    this.weights.set(providerId, weight);
  }
}

