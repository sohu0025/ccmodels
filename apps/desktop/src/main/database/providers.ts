import { randomUUID } from 'node:crypto';
import { getDb } from './index';
import { encrypt, decrypt } from '../crypto';
import { enqueueSync } from './sync-queue';
import type { Provider, ProviderFormData } from '@ccmodels/shared';

interface ProviderRow {
  id: string;
  name: string;
  type: string;
  api_type: string;
  api_base: string;
  api_key: string;
  website: string;
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

export function getActiveProviderForModel(modelId: string): Provider | null {
  // 1. Check global active provider first
  const active = getActiveProvider();
  if (active && active.models.includes(modelId)) return active;

  // 2. Search all providers for matching model
  const all = getAllProviders();
  for (const p of all) {
    if (p.models.includes(modelId)) return p;
  }

  // 3. Fallback: return the first active provider even without matching model
  if (active) return active;
  if (all.length > 0) return all[0];
  return null;
}

export function createProvider(data: ProviderFormData): Provider {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO providers (id, name, type, api_type, api_base, api_key, website, cli_urls, headers, models, is_active, sort, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
  `).run(
    id, data.name, data.type, data.apiType ?? 'openai', data.apiBase, encrypt(data.apiKey),
    data.website ?? '', JSON.stringify(data.cliUrls), JSON.stringify(data.headers),
    JSON.stringify(data.models), now, now,
  );

  const provider = getProviderById(id)!;
  // Sync metadata only — NEVER include apiKey
  enqueueSync('providers', id, 'INSERT', {
    id,
    name: provider.name,
    type: provider.type,
    apiType: provider.apiType,
    apiBase: provider.apiBase,
    website: provider.website,
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
  const apiType = data.apiType ?? existing.apiType;
  const apiBase = data.apiBase ?? existing.apiBase;
  const existingRow = getDb().prepare('SELECT api_key FROM providers WHERE id = ?').get(id) as { api_key: string } | undefined;
  const apiKey = data.apiKey !== undefined ? encrypt(data.apiKey) : (existingRow?.api_key ?? '');
  const cliUrls = data.cliUrls !== undefined ? JSON.stringify(data.cliUrls) : JSON.stringify(existing.cliUrls);
  const headers = data.headers !== undefined ? JSON.stringify(data.headers) : JSON.stringify(existing.headers);
  const models = data.models !== undefined ? JSON.stringify(data.models) : JSON.stringify(existing.models);
  const website = data.website ?? existing.website;
  const now = new Date().toISOString();

  getDb().prepare(`
    UPDATE providers SET name=?, type=?, api_type=?, api_base=?, api_key=?, website=?, cli_urls=?, headers=?, models=?, updated_at=?
    WHERE id=?
  `).run(name, type, apiType, apiBase, apiKey, website, cliUrls, headers, models, now, id);

  const updated = getProviderById(id)!;
  // Sync metadata only — NEVER include apiKey
  enqueueSync('providers', id, 'UPDATE', {
    id,
    name: updated.name,
    type: updated.type,
    apiType: updated.apiType,
    apiBase: updated.apiBase,
    website: updated.website,
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
  enqueueSync('providers', id, 'DELETE', { id });

  // Clean up tool→provider lists
  for (const tool of getAllToolsWithProviders()) {
    removeProviderFromTool(tool, id);
  }

  // Clean up active mapping
  const activeMapping = getToolActiveProviders();
  for (const [tool, activeId] of Object.entries(activeMapping)) {
    if (activeId === id) {
      delete activeMapping[tool];
    }
  }
  setToolActiveProviders(activeMapping);
}

function getAllToolsWithProviders(): string[] {
  return Object.keys(getToolProvidersRaw());
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
    enqueueSync('providers', id, 'UPDATE', {
      id,
      name: provider.name,
      type: provider.type,
      apiBase: provider.apiBase,
      website: provider.website,
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
    apiType: row.api_type as Provider['apiType'],
    apiBase: row.api_base,
    apiKey: decrypt(row.api_key),
    website: row.website ?? '',
    cliUrls: JSON.parse(row.cli_urls),
    headers: JSON.parse(row.headers),
    models: JSON.parse(row.models),
    isActive: row.is_active === 1,
    sort: row.sort,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const TOOL_PROVIDERS_KEY = 'tool_providers';
const TOOL_ACTIVE_PROVIDERS_KEY = 'tool_active_providers';

/** Get raw mapping, handling both old (1:1) and new (1:N) formats */
export function getToolProvidersRaw(): Record<string, string | string[]> {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(TOOL_PROVIDERS_KEY) as { value: string } | undefined;
  return row ? JSON.parse(row.value) : {};
}

/** Backward-compat: old format returns Record<string, string> (first provider per tool) */
export function getToolProviders(): Record<string, string> {
  const raw = getToolProvidersRaw();
  const result: Record<string, string> = {};
  for (const [tool, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      result[tool] = value[0] ?? '';
    } else if (typeof value === 'string') {
      result[tool] = value;
    }
  }
  return result;
}

export function setToolProviders(mapping: Record<string, string>): void {
  getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(TOOL_PROVIDERS_KEY, JSON.stringify(mapping));
}

/** Get provider IDs for a specific tool */
export function getToolProviderList(toolName: string): string[] {
  const raw = getToolProvidersRaw();
  const value = raw[toolName];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value ? [value] : [];
  return [];
}

/** Add a provider to a tool's list */
export function addProviderToTool(toolName: string, providerId: string): void {
  const raw = getToolProvidersRaw();
  const list = Array.isArray(raw[toolName]) ? raw[toolName] as string[] : (raw[toolName] ? [raw[toolName] as string] : []);
  if (!list.includes(providerId)) {
    list.push(providerId);
  }
  raw[toolName] = list;
  setToolProvidersWithArray(raw as Record<string, string[]>);
}

/** Remove a provider from a tool's list */
export function removeProviderFromTool(toolName: string, providerId: string): void {
  const raw = getToolProvidersRaw();
  const list = Array.isArray(raw[toolName]) ? raw[toolName] as string[] : [];
  const filtered = list.filter(id => id !== providerId);
  if (filtered.length > 0) {
    raw[toolName] = filtered;
  } else {
    delete raw[toolName];
  }
  setToolProvidersWithArray(raw as Record<string, string[]>);

  // Clean up active if needed
  const active = getToolActiveProviders();
  if (active[toolName] === providerId) {
    delete active[toolName];
    setToolActiveProviders(active);
  }
}

function setToolProvidersWithArray(mapping: Record<string, string[]>): void {
  getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(TOOL_PROVIDERS_KEY, JSON.stringify(mapping));
}

/** Active provider per tool */
export function getToolActiveProviders(): Record<string, string> {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(TOOL_ACTIVE_PROVIDERS_KEY) as { value: string } | undefined;
  return row ? JSON.parse(row.value) : {};
}

export function setToolActiveProviders(mapping: Record<string, string>): void {
  getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(TOOL_ACTIVE_PROVIDERS_KEY, JSON.stringify(mapping));
}

export function setToolActiveProvider(toolName: string, providerId: string): void {
  const active = getToolActiveProviders();
  active[toolName] = providerId;
  setToolActiveProviders(active);
}

/** Get only the tool-specific active provider ID (no fallback cascade) */
export function getToolActiveProviderId(toolName: string): string | null {
  const activeMapping = getToolActiveProviders();
  return activeMapping[toolName] ?? null;
}

/** Get the active provider for a tool: per-tool active → first in list → global active */
export function getProviderForTool(toolName: string): Provider | null {
  // claude-desktop and claude-code always share the same provider
  if (toolName === 'claude-desktop') {
    return getProviderForTool('claude-code');
  }

  const activeMapping = getToolActiveProviders();
  const activeId = activeMapping[toolName];
  if (activeId) {
    const provider = getProviderById(activeId);
    if (provider) return provider;
  }

  const ids = getToolProviderList(toolName);
  if (ids.length > 0) {
    const provider = getProviderById(ids[0]);
    if (provider) return provider;
  }

  // No global active provider and no tool detection → try any tool-specific provider
  if (!toolName) {
    for (const [, provId] of Object.entries(activeMapping)) {
      const provider = getProviderById(provId);
      if (provider) return provider;
    }
  }

  return getActiveProvider();
}

/** Get all providers with their tool associations and active status */
export function getProviderToolMapping(): Array<Provider & { tools: Array<{ toolName: string; isActive: boolean }> }> {
  const allProviders = getAllProviders();
  const toolProviders = getToolProvidersRaw();
  const activeMapping = getToolActiveProviders();

  return allProviders.map((p) => {
    const tools: Array<{ toolName: string; isActive: boolean }> = [];
    for (const [toolName, value] of Object.entries(toolProviders)) {
      const ids = Array.isArray(value) ? value : (value ? [value] : []);
      if (ids.includes(p.id)) {
        tools.push({ toolName, isActive: activeMapping[toolName] === p.id });
      }
    }
    return { ...p, tools };
  });
}

/** Get all Provider objects for a tool */
export function getProvidersForTool(toolName: string): Provider[] {
  return getToolProviderList(toolName).map(id => getProviderById(id)).filter(Boolean) as Provider[];
}