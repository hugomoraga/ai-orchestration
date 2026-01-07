/**
 * Metrics and analytics system for the AI Orchestration Framework
 */

import type { AIService, ChatResponse } from './interfaces.js';
import type { ProviderHealth } from './types.js';

/**
 * Metrics for a single provider
 */
export interface ProviderMetrics {
  providerId: string;
  providerName: string;
  model?: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  totalCost: number;
  averageLatency: number;
  lastUsed?: Date;
  lastSuccess?: Date;
  lastFailure?: Date;
  healthHistory: Array<{
    timestamp: Date;
    healthy: boolean;
    latency?: number;
  }>;
}

/**
 * Strategy selection metrics
 */
export interface StrategyMetrics {
  totalSelections: number;
  selectionsByProvider: Map<string, number>;
  selectionsByStrategy: Map<string, number>;
  averageSelectionTime: number;
}

/**
 * Overall orchestrator metrics
 */
export interface OrchestratorMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalCost: number;
  providerMetrics: Map<string, ProviderMetrics>;
  strategyMetrics: StrategyMetrics;
  averageRequestLatency: number;
  requestsPerMinute: number;
  errorRate: number;
}

/**
 * Event types for metrics tracking
 */
export type MetricsEvent =
  | {
      type: 'provider_selected';
      providerId: string;
      strategy: string;
      timestamp: Date;
      selectionTime?: number;
    }
  | {
      type: 'request_started';
      providerId: string;
      timestamp: Date;
    }
  | {
      type: 'request_success';
      providerId: string;
      response: ChatResponse;
      latency: number;
      timestamp: Date;
    }
  | {
      type: 'request_failure';
      providerId: string;
      error: Error;
      latency?: number;
      timestamp: Date;
    }
  | {
      type: 'health_check';
      providerId: string;
      health: ProviderHealth;
      timestamp: Date;
    };

/**
 * Callback function for metrics events
 */
export type MetricsCallback = (event: MetricsEvent) => void;

/**
 * Metrics collector for tracking orchestrator usage
 */
export class MetricsCollector {
  private providerMetrics: Map<string, ProviderMetrics> = new Map();
  private strategyMetrics: StrategyMetrics = {
    totalSelections: 0,
    selectionsByProvider: new Map(),
    selectionsByStrategy: new Map(),
    averageSelectionTime: 0,
  };
  private requestHistory: Array<{
    timestamp: Date;
    providerId: string;
    success: boolean;
    latency: number;
    tokens?: { prompt: number; completion: number; total: number };
    cost?: number;
  }> = [];
  private callbacks: Set<MetricsCallback> = new Set();
  private selectionTimes: number[] = [];

  /**
   * Register a callback for metrics events
   */
  onEvent(callback: MetricsCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Emit a metrics event
   */
  private emit(event: MetricsEvent): void {
    for (const callback of this.callbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in metrics callback:', error);
      }
    }
  }

  /**
   * Record provider selection
   */
  recordSelection(
    provider: AIService,
    strategy: string,
    selectionTime?: number
  ): void {
    this.getOrCreateProviderMetrics(provider);

    this.strategyMetrics.totalSelections++;
    this.strategyMetrics.selectionsByProvider.set(
      provider.id,
      (this.strategyMetrics.selectionsByProvider.get(provider.id) || 0) + 1
    );
    this.strategyMetrics.selectionsByStrategy.set(
      strategy,
      (this.strategyMetrics.selectionsByStrategy.get(strategy) || 0) + 1
    );

    if (selectionTime !== undefined) {
      this.selectionTimes.push(selectionTime);
      const total = this.selectionTimes.reduce((a, b) => a + b, 0);
      this.strategyMetrics.averageSelectionTime =
        total / this.selectionTimes.length;
    }

    this.emit({
      type: 'provider_selected',
      providerId: provider.id,
      strategy,
      timestamp: new Date(),
      selectionTime,
    });
  }

  /**
   * Record request start
   */
  recordRequestStart(provider: AIService): void {
    const metrics = this.getOrCreateProviderMetrics(provider);
    metrics.totalRequests++;
    metrics.lastUsed = new Date();

    this.emit({
      type: 'request_started',
      providerId: provider.id,
      timestamp: new Date(),
    });
  }

  /**
   * Record successful request
   */
  recordSuccess(
    provider: AIService,
    response: ChatResponse,
    latency: number
  ): void {
    const metrics = this.getOrCreateProviderMetrics(provider);
    metrics.successfulRequests++;
    metrics.lastSuccess = new Date();

    // Update latency (moving average)
    if (metrics.averageLatency === 0) {
      metrics.averageLatency = latency;
    } else {
      metrics.averageLatency =
        metrics.averageLatency * 0.9 + latency * 0.1; // Exponential moving average
    }

    // Update token counts
    if (response.usage) {
      metrics.totalTokens.prompt += response.usage.promptTokens;
      metrics.totalTokens.completion += response.usage.completionTokens;
      metrics.totalTokens.total += response.usage.totalTokens;

      // Calculate cost if costPerToken is available
      if (provider.metadata.costPerToken) {
        const cost =
          response.usage.promptTokens *
            provider.metadata.costPerToken.prompt +
          response.usage.completionTokens *
            provider.metadata.costPerToken.completion;
        metrics.totalCost += cost;
      }
    }

    // Record in history
    this.requestHistory.push({
      timestamp: new Date(),
      providerId: provider.id,
      success: true,
      latency,
      tokens: response.usage
        ? {
            prompt: response.usage.promptTokens,
            completion: response.usage.completionTokens,
            total: response.usage.totalTokens,
          }
        : undefined,
      cost:
        provider.metadata.costPerToken && response.usage
          ? response.usage.promptTokens *
              provider.metadata.costPerToken.prompt +
            response.usage.completionTokens *
              provider.metadata.costPerToken.completion
          : undefined,
    });

    this.emit({
      type: 'request_success',
      providerId: provider.id,
      response,
      latency,
      timestamp: new Date(),
    });
  }

  /**
   * Record failed request
   */
  recordFailure(provider: AIService, error: Error, latency?: number): void {
    const metrics = this.getOrCreateProviderMetrics(provider);
    metrics.failedRequests++;
    metrics.lastFailure = new Date();

    // Record in history
    this.requestHistory.push({
      timestamp: new Date(),
      providerId: provider.id,
      success: false,
      latency: latency || 0,
    });

    this.emit({
      type: 'request_failure',
      providerId: provider.id,
      error,
      latency,
      timestamp: new Date(),
    });
  }

  /**
   * Record health check
   */
  recordHealthCheck(provider: AIService, health: ProviderHealth): void {
    const providerMetrics = this.getOrCreateProviderMetrics(provider);
    providerMetrics.healthHistory.push({
      timestamp: new Date(),
      healthy: health.healthy,
      latency: health.latency,
    });

    // Keep only last 100 health checks
    if (providerMetrics.healthHistory.length > 100) {
      providerMetrics.healthHistory.shift();
    }

    this.emit({
      type: 'health_check',
      providerId: provider.id,
      health,
      timestamp: new Date(),
    });
  }

  /**
   * Get or create provider metrics
   */
  private getOrCreateProviderMetrics(provider: AIService): ProviderMetrics {
    let metrics = this.providerMetrics.get(provider.id);
    if (!metrics) {
      metrics = {
        providerId: provider.id,
        providerName: provider.metadata.name,
        model: provider.metadata.model,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalTokens: {
          prompt: 0,
          completion: 0,
          total: 0,
        },
        totalCost: 0,
        averageLatency: 0,
        healthHistory: [],
      };
      this.providerMetrics.set(provider.id, metrics);
    }
    return metrics;
  }

  /**
   * Get metrics for a specific provider
   */
  getProviderMetrics(providerId: string): ProviderMetrics | undefined {
    return this.providerMetrics.get(providerId);
  }

  /**
   * Get all provider metrics
   */
  getAllProviderMetrics(): Map<string, ProviderMetrics> {
    return new Map(this.providerMetrics);
  }

  /**
   * Get strategy metrics
   */
  getStrategyMetrics(): StrategyMetrics {
    return { ...this.strategyMetrics };
  }

  /**
   * Get overall orchestrator metrics
   */
  getOrchestratorMetrics(): OrchestratorMetrics {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    const recentRequests = this.requestHistory.filter(
      (r) => r.timestamp.getTime() > oneMinuteAgo
    );

    const totalRequests = this.requestHistory.length;
    const successfulRequests = this.requestHistory.filter(
      (r) => r.success
    ).length;
    const failedRequests = totalRequests - successfulRequests;

    const totalCost = Array.from(this.providerMetrics.values()).reduce(
      (sum, m) => sum + m.totalCost,
      0
    );

    const totalLatency = this.requestHistory.reduce(
      (sum, r) => sum + r.latency,
      0
    );
    const averageRequestLatency =
      totalRequests > 0 ? totalLatency / totalRequests : 0;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      totalCost,
      providerMetrics: new Map(this.providerMetrics),
      strategyMetrics: { ...this.strategyMetrics },
      averageRequestLatency,
      requestsPerMinute: recentRequests.length,
      errorRate: totalRequests > 0 ? failedRequests / totalRequests : 0,
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.providerMetrics.clear();
    this.strategyMetrics = {
      totalSelections: 0,
      selectionsByProvider: new Map(),
      selectionsByStrategy: new Map(),
      averageSelectionTime: 0,
    };
    this.requestHistory = [];
    this.selectionTimes = [];
  }

  /**
   * Get request history (optionally filtered)
   */
  getRequestHistory(options?: {
    providerId?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): typeof this.requestHistory {
    let filtered = [...this.requestHistory];

    if (options?.providerId) {
      filtered = filtered.filter((r) => r.providerId === options.providerId);
    }

    if (options?.startTime) {
      filtered = filtered.filter(
        (r) => r.timestamp >= options.startTime!
      );
    }

    if (options?.endTime) {
      filtered = filtered.filter((r) => r.timestamp <= options.endTime!);
    }

    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }
}

