import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';

// Create an in-memory test database and mock getDb
const testDb = new Database(':memory:');
testDb.exec(`
  CREATE TABLE sync_queue (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('INSERT','UPDATE','DELETE')),
    payload TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    synced_at TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX idx_sync_queue_synced ON sync_queue(synced_at, retry_count);
`);

vi.mock('./index', () => ({
  getDb: () => testDb,
}));

const { enqueueSync, dequeuePending, markSynced, markFailed, getSyncStatus, cleanOldSynced } = await import('./sync-queue');

describe('Sync Queue', () => {
  beforeEach(() => {
    testDb.exec('DELETE FROM sync_queue');
  });

  describe('enqueueSync', () => {
    it('should insert a new sync item', () => {
      enqueueSync('providers', 'p1', 'INSERT', { id: 'p1', name: 'Test' });

      const row = testDb.prepare('SELECT * FROM sync_queue WHERE record_id = ?').get('p1') as any;
      expect(row).toBeDefined();
      expect(row.table_name).toBe('providers');
      expect(row.action).toBe('INSERT');
      expect(JSON.parse(row.payload)).toEqual({ id: 'p1', name: 'Test' });
    });

    it('should generate a unique UUID for each item', () => {
      enqueueSync('usage_records', 'u1', 'INSERT', { id: 'u1' });
      enqueueSync('usage_records', 'u2', 'INSERT', { id: 'u2' });

      const rows = testDb.prepare('SELECT id FROM sync_queue').all() as any[];
      expect(rows).toHaveLength(2);
      expect(rows[0].id).not.toBe(rows[1].id);
    });
  });

  describe('dequeuePending', () => {
    beforeEach(() => {
      enqueueSync('providers', 'p1', 'INSERT', { id: 'p1' });
      enqueueSync('sessions', 's1', 'INSERT', { id: 's1' });
      enqueueSync('usage_records', 'u1', 'UPDATE', { id: 'u1' });
    });

    it('should return all pending items ordered by creation time', () => {
      const items = dequeuePending(10);
      expect(items).toHaveLength(3);
      expect(items[0].tableName).toBe('providers');
      expect(items[1].tableName).toBe('sessions');
      expect(items[2].tableName).toBe('usage_records');
    });

    it('should respect the limit parameter', () => {
      const items = dequeuePending(2);
      expect(items).toHaveLength(2);
    });

    it('should not return synced items', () => {
      const items = dequeuePending(10);
      // Mark first as synced
      markSynced(items[0].id);

      const remaining = dequeuePending(10);
      expect(remaining).toHaveLength(2);
    });

    it('should not return items with retry_count >= 5', () => {
      enqueueSync('budget_alerts', 'b1', 'INSERT', { id: 'b1' });
      testDb.prepare("UPDATE sync_queue SET retry_count = 5 WHERE record_id = 'b1'").run();

      const items = dequeuePending(10);
      expect(items.find((i) => i.recordId === 'b1')).toBeUndefined();
    });
  });

  describe('markSynced', () => {
    it('should set synced_at timestamp', () => {
      enqueueSync('providers', 'p1', 'INSERT', { id: 'p1' });
      const item = dequeuePending(1)[0];

      markSynced(item.id);

      const row = testDb.prepare('SELECT synced_at FROM sync_queue WHERE id = ?').get(item.id) as any;
      expect(row.synced_at).not.toBeNull();
    });
  });

  describe('markFailed', () => {
    it('should increment retry_count', () => {
      enqueueSync('providers', 'p1', 'INSERT', { id: 'p1' });
      const item = dequeuePending(1)[0];

      markFailed(item.id);
      markFailed(item.id);

      const row = testDb.prepare('SELECT retry_count FROM sync_queue WHERE id = ?').get(item.id) as any;
      expect(row.retry_count).toBe(2);
    });
  });

  describe('getSyncStatus', () => {
    it('should return queueSize = 0 when empty', () => {
      const status = getSyncStatus();
      expect(status.queueSize).toBe(0);
    });

    it('should return correct queueSize for pending items', () => {
      enqueueSync('providers', 'p1', 'INSERT', { id: 'p1' });
      enqueueSync('sessions', 's1', 'INSERT', { id: 's1' });

      const status = getSyncStatus();
      expect(status.queueSize).toBe(2);
    });

    it('should not count synced items in queueSize', () => {
      enqueueSync('providers', 'p1', 'INSERT', { id: 'p1' });
      const item = dequeuePending(1)[0];
      markSynced(item.id);

      const status = getSyncStatus();
      expect(status.queueSize).toBe(0);
    });
  });

  describe('cleanOldSynced', () => {
    it('should delete synced items older than retention period', () => {
      enqueueSync('providers', 'p1', 'INSERT', { id: 'p1' });
      const item = dequeuePending(1)[0];
      markSynced(item.id);

      // Simulate old synced_at by setting to 30 days ago
      testDb.prepare(`UPDATE sync_queue SET synced_at = datetime('now', '-30 days') WHERE id = ?`).run(item.id);

      cleanOldSynced(7);

      const count = (testDb.prepare("SELECT COUNT(*) as c FROM sync_queue WHERE id = ?").get(item.id) as any).c;
      expect(count).toBe(0);
    });

    it('should keep recently synced items', () => {
      enqueueSync('providers', 'p1', 'INSERT', { id: 'p1' });
      const item = dequeuePending(1)[0];
      markSynced(item.id);

      cleanOldSynced(7);

      const count = (testDb.prepare("SELECT COUNT(*) as c FROM sync_queue WHERE id = ?").get(item.id) as any).c;
      expect(count).toBe(1);
    });
  });
});
