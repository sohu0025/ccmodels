import { useState } from 'react';
import { api, getToken } from '../api';

export function Settings() {
  const [syncResult, setSyncResult] = useState<any>(null);

  const testSync = async () => {
    try {
      const res = await api.sync.push([{ tableName: 'test', recordId: '1', action: 'INSERT' }]);
      setSyncResult({ success: true, data: res });
    } catch (err: any) {
      setSyncResult({ success: false, error: err.message });
    }
  };

  const token = getToken();

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-6">Settings</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h3 className="font-bold mb-3">Connection</h3>
        <p className="text-sm text-gray-600">Status: {token ? <span className="text-green-600">Connected</span> : <span className="text-red-600">Disconnected</span>}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h3 className="font-bold mb-3">Data Sync</h3>
        <p className="text-sm text-gray-500 mb-3">Test the sync connection to the backend.</p>
        <button onClick={testSync} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">Test Sync</button>
        {syncResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${syncResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {syncResult.success ? `Success: ${JSON.stringify(syncResult.data)}` : `Error: ${syncResult.error}`}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold mb-3">About</h3>
        <p className="text-sm text-gray-500">CC Switch Web Dashboard v0.1.0</p>
        <p className="text-sm text-gray-500 mt-1">Read-only views of your desktop data, synced via the cloud API.</p>
      </div>
    </div>
  );
}
