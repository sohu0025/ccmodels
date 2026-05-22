import { getDb } from './index';
import { randomUUID } from 'node:crypto';
import { enqueueSync } from './sync-queue';
import type { Skill, SkillFormData } from '@ccmodels/shared';

interface SkillRow {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  source_url: string;
  install_path: string;
  is_active: number;
  config: string;
  installed_at: string;
  updated_at: string;
}

export function getAllSkills(): Skill[] {
  const rows = getDb().prepare('SELECT * FROM skills ORDER BY installed_at DESC').all() as SkillRow[];
  return rows.map(mapSkillRow);
}

export function getSkillById(id: string): Skill | null {
  const row = getDb().prepare('SELECT * FROM skills WHERE id = ?').get(id) as SkillRow | undefined;
  return row ? mapSkillRow(row) : null;
}

export function createSkill(data: SkillFormData): Skill {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO skills (id, name, source_url, config, installed_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.sourceUrl, JSON.stringify(data.config ?? {}), now, now);

  const skill = getSkillById(id)!;
  enqueueSync('skills', id, 'INSERT', {
    id,
    name: skill.name,
    version: skill.version,
    description: skill.description,
    author: skill.author,
    sourceUrl: skill.sourceUrl,
    installPath: skill.installPath,
    isActive: skill.isActive,
    installedAt: now,
  });

  return skill;
}

export function updateSkill(id: string, data: Partial<SkillFormData>): Skill | null {
  const existing = getSkillById(id);
  if (!existing) return null;
  const name = data.name ?? existing.name;
  const sourceUrl = data.sourceUrl ?? existing.sourceUrl;
  const config = JSON.stringify(data.config ?? existing.config);
  const now = new Date().toISOString();
  getDb().prepare("UPDATE skills SET name=?, source_url=?, config=?, updated_at=? WHERE id=?").run(name, sourceUrl, config, now, id);
  return getSkillById(id);
}

export function deleteSkill(id: string): void {
  getDb().prepare('DELETE FROM skills WHERE id = ?').run(id);
  enqueueSync('skills', id, 'DELETE', { id });
}

export function setSkillActive(id: string, active: boolean): void {
  const now = new Date().toISOString();
  getDb().prepare("UPDATE skills SET is_active = ?, updated_at = ? WHERE id = ?").run(active ? 1 : 0, now, id);

  const skill = getSkillById(id);
  if (skill) {
    enqueueSync('skills', id, 'UPDATE', {
      id,
      name: skill.name,
      isActive: skill.isActive,
      updatedAt: now,
    });
  }
}

export function checkSkillConflict(name: string, excludeId?: string): Skill | null {
  const row = (excludeId
    ? getDb().prepare('SELECT * FROM skills WHERE name = ? AND id != ?').get(name, excludeId)
    : getDb().prepare('SELECT * FROM skills WHERE name = ?').get(name)) as SkillRow | undefined;
  return row ? mapSkillRow(row) : null;
}

function mapSkillRow(row: SkillRow): Skill {
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
