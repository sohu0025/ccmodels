import { getDb } from './index';
import { randomUUID } from 'node:crypto';
import type { Skill, SkillFormData } from '@ccswitch/shared';

export function getAllSkills(): Skill[] {
  return getDb().prepare('SELECT * FROM skills ORDER BY installed_at DESC').all().map(mapSkillRow);
}

export function getSkillById(id: string): Skill | null {
  const row = getDb().prepare('SELECT * FROM skills WHERE id = ?').get(id);
  return row ? mapSkillRow(row as any) : null;
}

export function createSkill(data: SkillFormData): Skill {
  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO skills (id, name, source_url, config)
    VALUES (?, ?, ?, ?)
  `).run(id, data.name, data.sourceUrl, JSON.stringify(data.config ?? {}));
  return getSkillById(id)!;
}

export function updateSkill(id: string, data: Partial<SkillFormData>): Skill | null {
  const existing = getSkillById(id);
  if (!existing) return null;
  const name = data.name ?? existing.name;
  const sourceUrl = data.sourceUrl ?? existing.sourceUrl;
  const config = JSON.stringify(data.config ?? existing.config);
  getDb().prepare("UPDATE skills SET name=?, source_url=?, config=?, updated_at=datetime('now') WHERE id=?").run(name, sourceUrl, config, id);
  return getSkillById(id);
}

export function deleteSkill(id: string): void {
  getDb().prepare('DELETE FROM skills WHERE id = ?').run(id);
}

export function setSkillActive(id: string, active: boolean): void {
  getDb().prepare("UPDATE skills SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(active ? 1 : 0, id);
}

export function checkSkillConflict(name: string, excludeId?: string): Skill | null {
  const row = excludeId
    ? getDb().prepare('SELECT * FROM skills WHERE name = ? AND id != ?').get(name, excludeId)
    : getDb().prepare('SELECT * FROM skills WHERE name = ?').get(name);
  return row ? mapSkillRow(row as any) : null;
}

function mapSkillRow(row: any): Skill {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    description: row.description,
    author: row.author,
    sourceUrl: row.source_url,
    installPath: row.install_path,
    isActive: !!row.is_active,
    config: JSON.parse(row.config || '{}'),
    installedAt: row.installed_at,
    updatedAt: row.updated_at,
  };
}
