import { getSettings } from '../database/settings';
import { dequeuePending, markSynced, markFailed } from '../database/sync-queue';
import type { SyncQueueItem } from '@ccswitch/shared';

let syncTimer: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

export function startSyncDaemon(): void {
  const settings = getSettings();
  if (!settings.syncEnabled || !settings.syncServerUrl) {
    console.log('[CC Switch] Sync daemon disabled (sync not configured)');
    return;
  }

  const intervalMs = (settings.syncInterval || 60) * 1000;
  syncTimer = setInterval(doSync, intervalMs);
  // Also do an immediate sync
  doSync();
  console.log(`[CC Switch] Sync daemon started (interval: ${intervalMs}ms)`);
}

export function stopSyncDaemon(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

export async function triggerSync(): Promise<{ success: boolean; processed: number; message: string }> {
  return doSync();
}

export function getSyncState(): { isSyncing: boolean } {
  return { isSyncing };
}

async function doSync(): Promise<{ success: boolean; processed: number; message: string }> {
  if (isSyncing) return { success: false, processed: 0, message: 'Already syncing' };
  isSyncing = true;

  let items: SyncQueueItem[] = [];

  try {
    const settings = getSettings();
    if (!settings.syncEnabled || !settings.syncServerUrl) {
      return { success: false, processed: 0, message: 'Sync not configured' };
    }

    items = dequeuePending(50);
    if (items.length === 0) return { success: true, processed: 0, message: 'Nothing to sync' };

    const res = await fetch(`${settings.syncServerUrl}/api/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.syncAuthToken || ''}`,
      },
      body: JSON.stringify(items.map((item: SyncQueueItem) => ({
        tableName: item.tableName,
        recordId: item.recordId,
        action: item.action,
        payload: item.payload,
      }))),
    });

    if (!res.ok) {
      throw new Error(`Sync push failed: ${res.status} ${res.statusText}`);
    }

    await res.json();
    for (const item of items) {
      markSynced(item.id);
    }

    return { success: true, processed: items.length, message: 'OK' };
  } catch (err: any) {
    console.error('[CC Switch] Sync failed:', err.message);
    for (const item of items) {
      markFailed(item.id);
    }
    return { success: false, processed: 0, message: err.message };
  } finally {
    isSyncing = false;
  }
}
