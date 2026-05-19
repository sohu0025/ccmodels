import { getDb } from './index';
import { randomUUID } from 'node:crypto';
import { enqueueSync } from './sync-queue';
import type { PromptConfig, PromptFormData } from '@ccswitch/shared';

interface PromptRow {
  id: string;
  name: string;
  content: string;
  target: string;
  is_active: number;
  tags: string;
  created_at: string;
  updated_at: string;
}

export function getAllPrompts(): PromptConfig[] {
  const rows = getDb().prepare('SELECT * FROM prompts ORDER BY created_at DESC').all() as PromptRow[];
  return rows.map(mapPromptRow);
}

export function getPromptById(id: string): PromptConfig | null {
  const row = getDb().prepare('SELECT * FROM prompts WHERE id = ?').get(id) as PromptRow | undefined;
  return row ? mapPromptRow(row) : null;
}

export function createPrompt(data: PromptFormData): PromptConfig {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO prompts (id, name, content, target, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.content, data.target, JSON.stringify(data.tags), now, now);

  const prompt = getPromptById(id)!;
  enqueueSync('prompts', id, 'create', {
    id,
    name: prompt.name,
    content: prompt.content,
    target: prompt.target,
    isActive: prompt.isActive,
    tags: prompt.tags,
    createdAt: now,
  });

  return prompt;
}

export function updatePrompt(id: string, data: Partial<PromptFormData>): PromptConfig | null {
  const existing = getPromptById(id);
  if (!existing) return null;
  const name = data.name ?? existing.name;
  const content = data.content ?? existing.content;
  const target = data.target ?? existing.target;
  const tags = JSON.stringify(data.tags ?? existing.tags);
  const now = new Date().toISOString();
  getDb().prepare("UPDATE prompts SET name=?, content=?, target=?, tags=?, updated_at=? WHERE id=?").run(name, content, target, tags, now, id);
  return getPromptById(id);
}

export function deletePrompt(id: string): void {
  getDb().prepare('DELETE FROM prompts WHERE id = ?').run(id);
  enqueueSync('prompts', id, 'delete', { id });
}

export function setPromptActive(id: string, active: boolean): void {
  const now = new Date().toISOString();
  getDb().prepare("UPDATE prompts SET is_active = ?, updated_at = ? WHERE id = ?").run(active ? 1 : 0, now, id);

  const prompt = getPromptById(id);
  if (prompt) {
    enqueueSync('prompts', id, 'update', {
      id,
      name: prompt.name,
      isActive: prompt.isActive,
      updatedAt: now,
    });
  }
}

function mapPromptRow(row: PromptRow): PromptConfig {
  return {
    id: row.id,
    name: row.name,
    content: row.content,
    target: row.target as PromptConfig['target'],
    isActive: !!row.is_active,
    tags: JSON.parse(row.tags || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
