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
      <div>
        <h1 className="section-title">设置</h1>
        <p className="section-subtitle">系统连接与同步配置</p>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-text-primary">连接状态</h3>
            <p className="text-xs text-text-secondary mt-0.5">当前与后端 API 的连接状态</p>
            <div className="flex items-center gap-2 mt-3">
              <span className={`w-2 h-2 rounded-full ${token ? 'bg-success shadow-sm shadow-success/50' : 'bg-danger shadow-sm shadow-danger/50'}`} />
              <span className="text-sm text-text-primary font-medium">{token ? '已连接' : '未连接'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-text-primary">数据同步</h3>
            <p className="text-xs text-text-secondary mt-0.5">测试与后端的同步连接。</p>
            <button onClick={testSync} className="btn bg-accent text-white h-9 rounded-lg text-sm font-medium px-4 mt-3 hover:bg-accent-hover transition-colors">
              测试同步
            </button>
            {syncResult && (
              <div className={`mt-4 p-3 rounded-xl text-sm flex items-start gap-2 ${
                syncResult.success
                  ? 'bg-success/10 text-success'
                  : 'bg-danger/10 text-danger'
              }`}>
                <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {syncResult.success
                    ? <polyline points="20 6 9 17 4 12"/>
                    : <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>
                  }
                </svg>
                <span>{syncResult.success ? `同步成功：${JSON.stringify(syncResult.data)}` : `错误：${syncResult.error}`}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary mb-1">关于</h3>
            <p className="text-sm text-text-secondary">CC Models Web Dashboard v0.1.0</p>
            <p className="text-sm text-text-secondary mt-1">桌面端数据的只读视图，通过云端 API 同步。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
