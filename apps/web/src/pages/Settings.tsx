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
    <div className="space-y-5 max-w-xl">
      <section className="card p-5">
        <h3 className="text-base font-semibold mb-1">连接状态</h3>
        <p className="text-xs text-text-secondary mb-4">当前与后端 API 的连接状态</p>
        <div className="flex items-center gap-2">
          <span className={`indicator ${token ? 'indicator-success' : 'indicator-danger'}`} />
          <span className="text-sm">{token ? '已连接' : '未连接'}</span>
        </div>
      </section>

      <section className="card p-5">
        <h3 className="text-base font-semibold mb-2">数据同步</h3>
        <p className="text-xs text-text-secondary mb-4">测试与后端的同步连接。</p>
        <button onClick={testSync} className="btn-primary">测试同步</button>
        {syncResult && (
          <div className={`mt-4 p-3 rounded-xl text-sm ${syncResult.success ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
            {syncResult.success ? `同步成功：${JSON.stringify(syncResult.data)}` : `错误：${syncResult.error}`}
          </div>
        )}
      </section>

      <section className="card p-5">
        <h3 className="text-base font-semibold mb-2">关于</h3>
        <p className="text-sm text-text-secondary">CC Switch Web Dashboard v0.1.0</p>
        <p className="text-sm text-text-secondary mt-1">桌面端数据的只读视图，通过云端 API 同步。</p>
      </section>
    </div>
  );
}
