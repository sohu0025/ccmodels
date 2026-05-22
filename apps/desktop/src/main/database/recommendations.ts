import { getDb } from './index';
import { randomUUID } from 'node:crypto';
import { enqueueSync } from './sync-queue';

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

export function saveRecommendation(taskType: string, model: string, reason: string, usageCount = 0): void {
  const now = new Date().toISOString();
  const id = `rec-${randomUUID()}`;
  getDb().prepare(`
    INSERT INTO recommendations (id, task_type, recommended_model, reason, usage_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, taskType, model, reason, usageCount, now);

  enqueueSync('recommendations', id, 'INSERT', {
    id,
    taskType,
    recommendedModel: model,
    reason,
    usageCount,
    updatedAt: now,
  });
}

/**
 * Generate recommendations based on usage history.
 * Analyzes which models have the best cost/performance ratio per task type.
 */
export function generateRecommendations(): void {
  // Clear previous recommendations
  getDb().prepare('DELETE FROM recommendations').run();

  // Analyze usage records to find best models by usage frequency
  const topModels = getDb().prepare(`
    SELECT model_id, COUNT(*) as usage_count, AVG(cost) as avg_cost
    FROM usage_records
    WHERE model_id != 'unknown' AND model_id != '' AND model_id IS NOT NULL
    GROUP BY model_id
    ORDER BY usage_count DESC
    LIMIT 10
  `).all() as { model_id: string; usage_count: number; avg_cost: number }[];

  if (topModels.length === 0) return;

  // Sort by cost ascending for budget picks, by usage descending for popular picks, by avg_cost*usage for balanced
  const byUsage = [...topModels].sort((a, b) => b.usage_count - a.usage_count);
  const byCost = [...topModels].sort((a, b) => a.avg_cost - b.avg_cost);
  const byBalanced = [...topModels].sort((a, b) => {
    const scoreA = a.usage_count / (a.avg_cost || 0.001);
    const scoreB = b.usage_count / (b.avg_cost || 0.001);
    return scoreB - scoreA;
  });

  const cheapest = byCost[0];
  const mostUsed = byUsage[0];
  const bestValue = byBalanced[0];

  // Pick different models for each task type
  const picks = [
    { taskType: '代码生成', model: mostUsed.model_id, usageCount: mostUsed.usage_count, reason: `最常用模型，使用 ${mostUsed.usage_count} 次，平均 $${mostUsed.avg_cost.toFixed(6)}/次` },
    { taskType: '代码审查', model: (byUsage[1] || cheapest).model_id, usageCount: (byUsage[1] || cheapest).usage_count, reason: `高使用量，适合快速分析代码` },
    { taskType: '对话问答', model: bestValue.model_id, usageCount: bestValue.usage_count, reason: `性价比最优，综合评分最高` },
    { taskType: '文本总结', model: cheapest.model_id, usageCount: cheapest.usage_count, reason: `成本最低，平均 $${cheapest.avg_cost.toFixed(6)}/次，适合大批量处理` },
    { taskType: '翻译', model: (byCost[1] || cheapest).model_id, usageCount: (byCost[1] || cheapest).usage_count, reason: `低延迟低成本，适合翻译任务` },
  ];

  for (const pick of picks) {
    saveRecommendation(pick.taskType, pick.model, pick.reason, pick.usageCount);
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
