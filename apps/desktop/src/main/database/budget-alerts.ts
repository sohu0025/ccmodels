import { getDb } from './index';
import { randomUUID } from 'node:crypto';
import { getSettings } from './settings';

export interface BudgetStatus {
  month: string;
  totalCost: number;
  limitAmount: number;
  thresholdPct: number;
  notified: boolean;
  usagePct: number;
}

export function getBudgetStatus(): BudgetStatus {
  const settings = getSettings();
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const limitAmount = settings.monthlyBudgetLimit;

  const costRow = getDb().prepare(`
    SELECT COALESCE(SUM(cost), 0) as total FROM usage_records
    WHERE timestamp LIKE ?
  `).get(`${month}%`) as any;
  const totalCost = costRow.total;

  let alert = getDb().prepare('SELECT * FROM budget_alerts WHERE month = ?').get(month) as any;
  if (!alert) {
    const id = randomUUID();
    getDb().prepare(`
      INSERT INTO budget_alerts (id, month, total_cost, limit_amount, threshold_pct)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, month, totalCost, limitAmount, settings.budgetNotifyThreshold);
  }

  return {
    month,
    totalCost,
    limitAmount,
    thresholdPct: settings.budgetNotifyThreshold,
    notified: !!(alert?.notified),
    usagePct: limitAmount > 0 ? (totalCost / limitAmount) * 100 : 0,
  };
}

export function checkBudgetThreshold(): { exceeded: boolean; pct: number; message: string } | null {
  const status = getBudgetStatus();
  if (status.limitAmount <= 0) return null;

  const pct = status.usagePct;
  if (pct >= 100) {
    return {
      exceeded: true,
      pct,
      message: `Monthly budget of $${status.limitAmount} has been exceeded! Current: $${status.totalCost.toFixed(2)}`,
    };
  }
  if (pct >= status.thresholdPct && !status.notified) {
    return {
      exceeded: true,
      pct,
      message: `Budget usage reached ${Math.round(pct)}% of $${status.limitAmount} monthly limit`,
    };
  }
  return null;
}

export function markBudgetNotified(): void {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  getDb().prepare("UPDATE budget_alerts SET notified = 1, updated_at = datetime('now') WHERE month = ?").run(month);
}
