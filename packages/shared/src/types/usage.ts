export interface UsageStats {
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  cacheHitRate: number;
  periodStart: string;
  periodEnd: string;
}

export interface DailyUsage {
  date: string;
  promptTokens: number;
  completionTokens: number;
  cacheHitTokens: number;
  cost: number;
  requests: number;
}

export interface ProviderUsageSummary {
  providerId: string;
  providerName: string;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
}

export interface ModelUsageSummary {
  modelId: string;
  providerName: string;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
}
