import { getDb } from './index';
import { randomUUID } from 'node:crypto';
import type { PromptConfig, PromptFormData } from '@ccswitch/shared';

export function getAllPrompts(): PromptConfig[] {
  return getDb().prepare('SELECT * FROM prompts ORDER BY created_at DESC').all().map(mapPromptRow);
}

export function getPromptById(id: string): PromptConfig | null {
  const row = getDb().prepare('SELECT * FROM prompts WHERE id = ?').get(id);
  return row ? mapPromptRow(row as any) : null;
}

export function createPrompt(data: PromptFormData): PromptConfig {
  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO prompts (id, name, content, target, tags)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, data.name, data.content, data.target, JSON.stringify(data.tags));
  return getPromptById(id)!;
}

export function updatePrompt(id: string, data: Partial<PromptFormData>): PromptConfig | null {
  const existing = getPromptById(id);
  if (!existing) return null;
  const name = data.name ?? existing.name;
  const content = data.content ?? existing.content;
  const target = data.target ?? existing.target;
  const tags = JSON.stringify(data.tags ?? existing.tags);
  getDb().prepare("UPDATE prompts SET name=?, content=?, target=?, tags=?, updated_at=datetime('now') WHERE id=?").run(name, content, target, tags, id);
  return getPromptById(id);
}

export function deletePrompt(id: string): void {
  getDb().prepare('DELETE FROM prompts WHERE id = ?').run(id);
}

export function setPromptActive(id: string, active: boolean): void {
  getDb().prepare("UPDATE prompts SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(active ? 1 : 0, id);
}

function mapPromptRow(row: any): PromptConfig {
  return {
    id: row.id,
    name: row.name,
    content: row.content,
    target: row.target,
    isActive: !!row.is_active,
    tags: JSON.parse(row.tags || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
