export interface Recommendation {
  id: string;
  taskType: string;
  recommendedModel: string;
  reason: string;
  usageCount: number;
  updatedAt: string;
}
