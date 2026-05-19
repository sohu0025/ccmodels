import { getDb } from './index';
import { randomUUID } from 'node:crypto';
import type { SyncQueueItem, SyncAction, SyncStatus } from '@ccswitch/shared';

export function enqueueSync(tableName: string, recordId: string, action: SyncAction, data: Record<string, unknown>): void {
  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO sync_queue (id, table_name, record_id, action, payload)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, tableName, recordId, action, JSON.stringify(data));
}

export function dequeuePending(limit = 50): SyncQueueItem[] {
  return getDb().prepare(`
    SELECT * FROM sync_queue WHERE synced_at IS NULL AND retry_count < 5
    ORDER BY created_at ASC LIMIT ?
  `).all(limit).map(mapSyncRow);
}

export function markSynced(id: string): void {
  getDb().prepare("UPDATE sync_queue SET synced_at = datetime('now') WHERE id = ?").run(id);
}

export function markFailed(id: string): void {
  getDb().prepare('UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?').run(id);
}

export function getSyncStatus(): SyncStatus {
  const queueSize = (getDb().prepare("SELECT COUNT(*) as c FROM sync_queue WHERE synced_at IS NULL").get() as any).c;
  const lastRow = getDb().prepare("SELECT synced_at FROM sync_queue WHERE synced_at IS NOT NULL ORDER BY synced_at DESC LIMIT 1").get() as any;
  return { queueSize, lastSyncAt: lastRow?.synced_at ?? null, lastSyncError: null, isSyncing: false };
}

export function cleanOldSynced(daysToKeep = 7): void {
  getDb().prepare("DELETE FROM sync_queue WHERE synced_at IS NOT NULL AND synced_at < datetime('now', ?)").run(`-${daysToKeep} days`);
}

function mapSyncRow(row: any): SyncQueueItem {
  return {
    id: row.id,
    tableName: row.table_name,
    recordId: row.record_id,
    action: row.action,
    payload: row.payload,
    createdAt: row.created_at,
    syncedAt: row.synced_at,
    retryCount: row.retry_count,
  };
}
