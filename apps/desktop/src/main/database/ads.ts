import { randomUUID } from 'node:crypto';
import { getDb } from './index';

export interface AdRecord {
  id: string;
  type: 'popup' | 'corner' | 'text';
  title: string;
  htmlContent: string;
  textContent: string;
  linkUrl: string;
  width: number;
  height: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdRow {
  id: string;
  type: string;
  title: string;
  html_content: string;
  text_content: string;
  link_url: string;
  width: number;
  height: number;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export function getAllAds(): AdRecord[] {
  const rows = getDb().prepare('SELECT * FROM ads ORDER BY type, created_at').all() as AdRow[];
  return rows.map(mapRow);
}

export function getAdById(id: string): AdRecord | null {
  const row = getDb().prepare('SELECT * FROM ads WHERE id = ?').get(id) as AdRow | undefined;
  return row ? mapRow(row) : null;
}

export function getAdsByType(type: string): AdRecord[] {
  const rows = getDb().prepare('SELECT * FROM ads WHERE type = ? ORDER BY created_at').all(type) as AdRow[];
  return rows.map(mapRow);
}

export function createAd(data: Partial<AdRecord>): AdRecord {
  const id = randomUUID();
  const now = new Date().toISOString();
  try {
    getDb().prepare(`
      INSERT INTO ads (id, type, title, html_content, text_content, link_url, width, height, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.type ?? 'popup',
      data.title ?? '',
      data.htmlContent ?? '',
      data.textContent ?? '',
      data.linkUrl ?? '',
      data.width ?? 0,
      data.height ?? 0,
      data.enabled ? 1 : 0,
      now,
      now,
    );
  } catch (e: any) {
    console.error('[AdDB] createAd error:', e.message);
    throw e;
  }
  const created = getAdById(id)!;
  return created;
}

export function updateAd(id: string, data: Partial<AdRecord>): AdRecord | null {
  const existing = getAdById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  getDb().prepare(`
    UPDATE ads SET type=?, title=?, html_content=?, text_content=?, link_url=?, width=?, height=?, enabled=?, updated_at=?
    WHERE id=?
  `).run(
    data.type ?? existing.type,
    data.title ?? existing.title,
    data.htmlContent ?? existing.htmlContent,
    data.textContent ?? existing.textContent,
    data.linkUrl !== undefined ? data.linkUrl : existing.linkUrl,
    data.width ?? existing.width,
    data.height ?? existing.height,
    data.enabled !== undefined ? (data.enabled ? 1 : 0) : (existing.enabled ? 1 : 0),
    now,
    id,
  );
  const updated = getAdById(id)!;
  return updated;
}

export function deleteAd(id: string): void {
  getDb().prepare('DELETE FROM ads WHERE id = ?').run(id);
}

/** Replace all ads with server data (used by pull sync) */
export function replaceAllAds(ads: AdRecord[]): void {
  const db = getDb();
  const tx = db.transaction((items: AdRecord[]) => {
    db.prepare('DELETE FROM ads').run();
    const stmt = db.prepare(`
      INSERT INTO ads (id, type, title, html_content, text_content, link_url, width, height, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const ad of items) {
      stmt.run(ad.id, ad.type, ad.title, ad.htmlContent, ad.textContent, ad.linkUrl,
        ad.width, ad.height, ad.enabled ? 1 : 0, ad.createdAt, ad.updatedAt);
    }
  });
  tx(ads);
}

function mapRow(row: AdRow): AdRecord {
  return {
    id: row.id,
    type: row.type as AdRecord['type'],
    title: row.title,
    htmlContent: row.html_content,
    textContent: row.text_content,
    linkUrl: row.link_url,
    width: row.width,
    height: row.height,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
