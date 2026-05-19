import { getDb } from './index';
import { randomUUID } from 'node:crypto';
import { enqueueSync } from './sync-queue';
import type { CompareTest, CompareResponse } from '@ccswitch/shared';

interface CompareTestRow {
  id: string;
  prompt: string;
  models: string;
  responses: string;
  status: string;
  created_at: string;
}

export function getAllCompareTests(): CompareTest[] {
  return (getDb().prepare('SELECT * FROM compare_tests ORDER BY created_at DESC').all() as CompareTestRow[]).map(mapRow);
}

export function getCompareTestById(id: string): CompareTest | null {
  const row = getDb().prepare('SELECT * FROM compare_tests WHERE id = ?').get(id) as CompareTestRow | undefined;
  return row ? mapRow(row) : null;
}

export function createCompareTest(prompt: string, models: string[]): CompareTest {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO compare_tests (id, prompt, models, status, created_at) VALUES (?, ?, ?, 'pending', ?)
  `).run(id, prompt, JSON.stringify(models), now);

  const test = getCompareTestById(id)!;
  enqueueSync('compare_tests', id, 'create', {
    id,
    prompt: test.prompt,
    models: JSON.stringify(test.models),
    responses: '[]',
    status: test.status,
    createdAt: now,
  });

  return test;
}

export function updateCompareResponse(testId: string, response: CompareResponse): void {
  const test = getCompareTestById(testId);
  if (!test) return;
  test.responses.push(response);

  const allResponded = test.models.every((m) =>
    test.responses.some((r) => r.modelId === m)
  );
  const status = allResponded ? 'completed' : 'running';

  getDb().prepare(`
    UPDATE compare_tests SET responses = ?, status = ? WHERE id = ?
  `).run(JSON.stringify(test.responses), status, testId);

  // Sync the updated compare test
  enqueueSync('compare_tests', testId, 'update', {
    id: testId,
    prompt: test.prompt,
    models: JSON.stringify(test.models),
    responses: JSON.stringify(test.responses),
    status,
    createdAt: test.createdAt,
  });
}

function mapRow(row: CompareTestRow): CompareTest {
  return {
    id: row.id,
    prompt: row.prompt,
    models: JSON.parse(row.models),
    responses: JSON.parse(row.responses),
    status: row.status as CompareTest['status'],
    createdAt: row.created_at,
  };
}
