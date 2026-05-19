import { getDb } from './index';
import type { CompareTest } from '@ccswitch/shared';

interface RecommendationRow {
  id: string;
  task_type: string;
  recommended_model: string;
  reason: string;
  usage_count: number;
  updated_at: string;
}

export interface Recommendation {
  id: string;
  taskType: string;
  recommendedModel: string;
  reason: string;
  usageCount: number;
  updatedAt: string;
}

export function getAllRecommendations(): Recommendation[] {
  return (getDb().prepare('SELECT * FROM recommendations ORDER BY usage_count DESC').all() as RecommendationRow[]).map(mapRow);
}

export function getRecommendationsByTaskType(taskType: string): Recommendation[] {
  return (getDb().prepare('SELECT * FROM recommendations WHERE task_type = ? ORDER BY usage_count DESC').all(taskType) as RecommendationRow[]).map(mapRow);
}

export function saveRecommendation(taskType: string, model: string, reason: string): void {
  const existing = getDb().prepare('SELECT * FROM recommendations WHERE task_type = ? AND recommended_model = ?').get(taskType, model) as RecommendationRow | undefined;
  if (existing) {
    getDb().prepare(`
      UPDATE recommendations SET reason = ?, usage_count = usage_count + 1, updated_at = datetime('now')
      WHERE task_type = ? AND recommended_model = ?
    `).run(reason, taskType, model);
  } else {
    getDb().prepare(`
      INSERT INTO recommendations (id, task_type, recommended_model, reason)
      VALUES (random(), ?, ?, ?)
    `).run(taskType, model, reason);
  }
}

/**
 * Generate recommendations based on usage history.
 * Analyzes which models have the best cost/performance ratio per task type.
 */
export function generateRecommendations(): void {
  // Analyze usage records to find best models by usage frequency
  const topModels = getDb().prepare(`
    SELECT model_id, COUNT(*) as usage_count, AVG(cost) as avg_cost
    FROM usage_records
    GROUP BY model_id
    ORDER BY usage_count DESC
    LIMIT 10
  `).all() as { model_id: string; usage_count: number; avg_cost: number }[];

  // Map common task types to top models
  const taskTypes = ['coding', 'writing', 'analysis', 'summarization', 'translation'];
  for (const taskType of taskTypes) {
    const best = topModels.find(m => m.avg_cost < 0.01) || topModels[0];
    if (best) {
      saveRecommendation(taskType, best.model_id, `Most used model with avg cost $${best.avg_cost.toFixed(6)}/request`);
    }
  }
}

function mapRow(row: RecommendationRow): Recommendation {
  return {
    id: row.id,
    taskType: row.task_type,
    recommendedModel: row.recommended_model,
    reason: row.reason,
    usageCount: row.usage_count,
    updatedAt: row.updated_at,
  };
}
