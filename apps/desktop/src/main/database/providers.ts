import { randomUUID } from 'node:crypto';
import { getDb } from './index';
import { encrypt, decrypt } from '../crypto';
import { enqueueSync } from './sync-queue';
import type { Provider, ProviderFormData } from '@ccswitch/shared';

interface ProviderRow {
  id: string;
  name: string;
  type: string;
  api_base: string;
  api_key: string;
  cli_urls: string;
  headers: string;
  models: string;
  is_active: number;
  sort: number;
  created_at: string;
  updated_at: string;
}

export function getAllProviders(): Provider[] {
  const rows = getDb().prepare('SELECT * FROM providers ORDER BY sort, created_at').all() as ProviderRow[];
  return rows.map(mapRow);
}

export function getProviderById(id: string): Provider | null {
  const row = getDb().prepare('SELECT * FROM providers WHERE id = ?').get(id) as ProviderRow | undefined;
  return row ? mapRow(row) : null;
}

export function getActiveProvider(): Provider | null {
  const row = getDb().prepare('SELECT * FROM providers WHERE is_active = 1').get() as ProviderRow | undefined;
  return row ? mapRow(row) : null;
}

export function createProvider(data: ProviderFormData): Provider {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO providers (id, name, type, api_base, api_key, cli_urls, headers, models, is_active, sort, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
  `).run(
    id, data.name, data.type, data.apiBase, encrypt(data.apiKey),
    JSON.stringify(data.cliUrls), JSON.stringify(data.headers),
    JSON.stringify(data.models), now, now,
  );

  const provider = getProviderById(id)!;
  // Sync metadata only — NEVER include apiKey
  enqueueSync('providers', id, 'create', {
    id,
    name: provider.name,
    type: provider.type,
    apiBase: provider.apiBase,
    models: provider.models,
    isActive: provider.isActive,
    sort: provider.sort,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  });

  return provider;
}

export function updateProvider(id: string, data: Partial<ProviderFormData>): Provider | null {
  const existing = getProviderById(id);
  if (!existing) return null;

  const name = data.name ?? existing.name;
  const type = data.type ?? existing.type;
  const apiBase = data.apiBase ?? existing.apiBase;
  const existingRow = getDb().prepare('SELECT api_key FROM providers WHERE id = ?').get(id) as { api_key: string } | undefined;
  const apiKey = data.apiKey !== undefined ? encrypt(data.apiKey) : (existingRow?.api_key ?? '');
  const cliUrls = data.cliUrls !== undefined ? JSON.stringify(data.cliUrls) : JSON.stringify(existing.cliUrls);
  const headers = data.headers !== undefined ? JSON.stringify(data.headers) : JSON.stringify(existing.headers);
  const models = data.models !== undefined ? JSON.stringify(data.models) : JSON.stringify(existing.models);
  const now = new Date().toISOString();

  getDb().prepare(`
    UPDATE providers SET name=?, type=?, api_base=?, api_key=?, cli_urls=?, headers=?, models=?, updated_at=?
    WHERE id=?
  `).run(name, type, apiBase, apiKey, cliUrls, headers, models, now, id);

  const updated = getProviderById(id)!;
  // Sync metadata only — NEVER include apiKey
  enqueueSync('providers', id, 'update', {
    id,
    name: updated.name,
    type: updated.type,
    apiBase: updated.apiBase,
    models: updated.models,
    isActive: updated.isActive,
    sort: updated.sort,
    createdAt: updated.createdAt,
    updatedAt: now,
  });

  return updated;
}

export function deleteProvider(id: string): void {
  getDb().prepare('DELETE FROM providers WHERE id = ?').run(id);
  enqueueSync('providers', id, 'delete', { id });
}

export function getFallbackProvider(failedProviderId: string): Provider | null {
  const rows = getDb().prepare(
    'SELECT * FROM providers WHERE is_active = 1 AND id != ? ORDER BY sort ASC LIMIT 1'
  ).all(failedProviderId) as ProviderRow[];
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export function setActiveProvider(id: string): void {
  const db = getDb();
  db.prepare('UPDATE providers SET is_active = 0').run();
  db.prepare('UPDATE providers SET is_active = 1 WHERE id = ?').run(id);

  // Sync the activated provider
  const provider = getProviderById(id);
  if (provider) {
    enqueueSync('providers', id, 'update', {
      id,
      name: provider.name,
      type: provider.type,
      apiBase: provider.apiBase,
      models: provider.models,
      isActive: true,
      sort: provider.sort,
      createdAt: provider.createdAt,
      updatedAt: new Date().toISOString(),
    });
  }
}

function mapRow(row: ProviderRow): Provider {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Provider['type'],
    apiBase: row.api_base,
    apiKey: decrypt(row.api_key),
    cliUrls: JSON.parse(row.cli_urls),
    headers: JSON.parse(row.headers),
    models: JSON.parse(row.models),
    isActive: row.is_active === 1,
    sort: row.sort,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
