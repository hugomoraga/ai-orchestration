/**
 * Health-aware strategy: selects providers based on health metrics (latency, success rate)
 */

import { BaseStrategy } from './base.js';
import type {
  AIService,
  SelectionContext,
} from '../core/interfaces.js';
import type { ProviderHealth } from '../core/types.js';

export interface HealthAwareStrategyConfig {
  preferLowLatency?: boolean;
  minHealthScore?: number; // 0-1, minimum health score to consider
}

interface ProviderStats {
  provider: AIService;
  health: ProviderHealth;
  successCount: number;
  failureCount: number;
  avgLatency?: number;
}

export class HealthAwareStrategy extends BaseStrategy {
  private stats: Map<string, ProviderStats> = new Map();
  private preferLowLatency: boolean;
  private minHealthScore: number;

  constructor(config?: HealthAwareStrategyConfig) {
    super();
    this.preferLowLatency = config?.preferLowLatency ?? true;
    this.minHealthScore = config?.minHealthScore ?? 0;
  }

  async select(
    providers: AIService[],
    context?: SelectionContext
  ): Promise<AIService | null> {
    const available = this.filterAttempted(providers, context);
    if (available.length === 0) {
      return null;
    }

    // Fetch health for all providers
    const healthChecks = await Promise.allSettled(
      available.map(async (p) => {
        const health = await p.checkHealth();
        return { provider: p, health };
      })
    );

    // Build stats with health information
    const candidates: ProviderStats[] = [];
    for (const result of healthChecks) {
      if (result.status === 'fulfilled') {
        const { provider, health } = result.value;
        if (!health.healthy) continue;

        const stats = this.getOrCreateStats(provider);
        stats.health = health;

        const healthScore = this.calculateHealthScore(stats);
        if (healthScore >= this.minHealthScore) {
          candidates.push(stats);
        }
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    // Sort by health score (and latency if preferred)
    candidates.sort((a, b) => {
      const scoreA = this.calculateHealthScore(a);
      const scoreB = this.calculateHealthScore(b);

      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Higher score first
      }

      // If scores are equal and prefer low latency, sort by latency
      if (this.preferLowLatency) {
        const latencyA = a.health.latency ?? Infinity;
        const latencyB = b.health.latency ?? Infinity;
        return latencyA - latencyB;
      }

      return 0;
    });

    return candidates[0].provider;
  }

  update(provider: AIService, success: boolean, metadata?: unknown): void {
    const stats = this.getOrCreateStats(provider);

    if (success) {
      stats.successCount++;
      // Update latency if available
      if (metadata && typeof metadata === 'object' && 'latency' in metadata) {
        const latency = Number(metadata.latency);
        if (!isNaN(latency)) {
          stats.avgLatency =
            stats.avgLatency === undefined
              ? latency
              : (stats.avgLatency + latency) / 2;
        }
      }
    } else {
      stats.failureCount++;
    }
  }

  private getOrCreateStats(provider: AIService): ProviderStats {
    let stats = this.stats.get(provider.id);
    if (!stats) {
      stats = {
        provider,
        health: { healthy: true },
        successCount: 0,
        failureCount: 0,
      };
      this.stats.set(provider.id, stats);
    }
    return stats;
  }

  private calculateHealthScore(stats: ProviderStats): number {
    const total = stats.successCount + stats.failureCount;
    if (total === 0) {
      return 1.0; // No data, assume healthy
    }

    const successRate = stats.successCount / total;

    // Factor in latency if available
    let latencyFactor = 1.0;
    if (stats.avgLatency !== undefined) {
      // Normalize latency (assume < 1000ms is good, > 5000ms is bad)
      latencyFactor = Math.max(0, 1 - (stats.avgLatency - 1000) / 4000);
    }

    return successRate * latencyFactor;
  }
}

