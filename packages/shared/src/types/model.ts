export interface Model {
  id: string;
  providerId: string;
  name: string;
  maxTokens: number;
  contextWindow: number;
  pricingInput: number;   // USD per 1M tokens
  pricingOutput: number;  // USD per 1M tokens
  capabilities: ModelCapability[];
}

export type ModelCapability = 'chat' | 'code' | 'vision' | 'reasoning' | 'tool-use';

export interface ModelBenchmark {
  modelId: string;
  prompt: string;
  response: string;
  latencyMs: number;
  tokensUsed: number;
  cost: number;
  timestamp: string;
}
