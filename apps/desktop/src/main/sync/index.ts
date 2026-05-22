import { BrowserWindow } from 'electron';
import { getSettings } from '../database/settings';
import * as adDb from '../database/ads';

let syncTimer: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

export function startSyncDaemon(): void {
  const settings = getSettings();
  const serverUrl = settings.serverUrl;
  if (!serverUrl) {
    console.log('[CC Models] Pull sync disabled (no server URL)');
    return;
  }

  const intervalMs = (settings.syncInterval || 30) * 1000;
  syncTimer = setInterval(doPullSync, intervalMs);
  doPullSync();
  console.log(`[CC Models] Pull sync started (interval: ${intervalMs}ms, server: ${serverUrl})`);
}

export function stopSyncDaemon(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

export async function triggerSync(): Promise<{ success: boolean; processed: number; message: string }> {
  return doPullSync();
}

export function getSyncState(): { isSyncing: boolean } {
  return { isSyncing };
}

async function doPullSync(): Promise<{ success: boolean; processed: number; message: string }> {
  if (isSyncing) return { success: false, processed: 0, message: 'Already syncing' };
  isSyncing = true;

  try {
    const settings = getSettings();
    const serverUrl = settings.serverUrl;
    let processed = 0;

    // Pull ads from server → update local cache → notify renderer
    try {
      const adRes = await fetch(`${serverUrl}/api/ad/list`, { signal: AbortSignal.timeout(5000) });
      if (adRes.ok) {
        const data = await adRes.json() as any[];
        adDb.replaceAllAds(data.map(normalizeAd));
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('ads:changed'));
        processed++;
      }
    } catch (e: any) {
      console.warn('[Sync] Failed to pull ads:', e.message);
    }

    // Pull system providers → notify renderer
    try {
      const spRes = await fetch(`${serverUrl}/api/system-providers`, { signal: AbortSignal.timeout(5000) });
      if (spRes.ok) {
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('systemProviders:changed'));
        processed++;
      }
    } catch (e: any) {
      console.warn('[Sync] Failed to pull system providers:', e.message);
    }

    return { success: true, processed, message: 'OK' };
  } catch (err: any) {
    console.error('[CC Models] Pull sync failed:', err.message);
    return { success: false, processed: 0, message: err.message };
  } finally {
    isSyncing = false;
  }
}

function normalizeAd(item: any): any {
  return {
    id: item.id,
    type: item.type,
    title: item.title ?? '',
    htmlContent: item.htmlContent ?? '',
    textContent: item.textContent ?? '',
    linkUrl: item.linkUrl ?? '',
    width: item.width ?? 0,
    height: item.height ?? 0,
    enabled: item.enabled === 1 || item.enabled === true,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
