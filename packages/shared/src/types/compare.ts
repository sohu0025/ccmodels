export interface CompareTest {
  id: string;
  prompt: string;
  models: string[];
  responses: CompareResponse[];
  createdAt: string;
  status: 'pending' | 'completed';
}

export interface CompareResponse {
  modelId: string;
  providerId: string;
  content: string;
  latencyMs: number;
  tokens: number;
  cost: number;
  error?: string;
}

export interface CompareResult {
  test: CompareTest;
  bestModel?: { modelId: string; reason: string };
}
