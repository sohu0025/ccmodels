export type SyncAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface SyncQueueItem {
  id: string;
  tableName: string;
  recordId: string;
  action: SyncAction;
  payload: string; // JSON serialized data
  createdAt: string;
  syncedAt: string | null;
  retryCount: number;
}

export interface SyncStatus {
  queueSize: number;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  isSyncing: boolean;
}
