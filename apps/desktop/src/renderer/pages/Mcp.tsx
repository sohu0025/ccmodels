import { useState } from 'react';
import { useMcp } from '../hooks/useMcp';
import type { MCPTransport } from '@ccswitch/shared';

export function Mcp() {
  const { servers, statuses, loading, create, update, remove, toggleEnabled, startStop } = useMcp();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<{ name: string; transport: MCPTransport; command?: string; args?: string[]; url?: string; id?: string }>({ name: '', transport: 'stdio', command: '', args: [], url: '' });

  const handleSave = async () => {
    const saveData: any = { ...form };
    if (form.id) {
      const original = servers.find((s: any) => s.id === form.id);
      if (original) {
        const origStr = (original.args ?? []).join(' ');
        const currentStr = (saveData.args ?? []).join(' ');
        if (origStr === currentStr) {
          saveData.args = original.args;
        }
      }
      delete saveData.headers;
      delete saveData.envVars;
      await update(form.id, saveData);
    } else {
      saveData.headers = {};
      saveData.envVars = {};
      await create(saveData);
    }
    setEditing(false);
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">MCP 管理</h2>
          <p className="text-sm text-text-secondary mt-1">管理 MCP 服务器（stdio、HTTP、SSE）</p>
        </div>
        <button
          onClick={() => { setEditing(true); setForm({ name: '', transport: 'stdio', command: '', args: [], url: '' }); }}
          className="btn-primary"
        >
          + 添加 MCP
        </button>
      </div>

      {/* Server list */}
      {servers.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-lg font-medium mb-1">暂无 MCP 服务器</p>
          <p className="text-sm text-text-secondary">添加第一个 MCP 服务器以扩展工具能力</p>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map((s) => (
            <div key={s.id} className="card p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className={`indicator ${statuses[s.id] === 'running' ? 'indicator-success' : 'indicator-danger'}`} />
                  <span className="text-sm font-semibold">{s.name}</span>
                  <span className="badge">{s.transport}</span>
                </div>
                {s.command && (
                  <p className="text-xs text-text-tertiary font-mono">{s.command} {(s.args ?? []).join(' ')}</p>
                )}
                {s.url && (
                  <p className="text-xs text-text-tertiary font-mono">{s.url}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {s.transport === 'stdio' && (
                  <button
                    onClick={() => startStop(s.id, statuses[s.id] !== 'running')}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      statuses[s.id] === 'running'
                        ? 'bg-danger/10 text-danger hover:bg-danger/20'
                        : 'bg-success/10 text-success hover:bg-success/20'
                    }`}
                  >
                    {statuses[s.id] === 'running' ? '停止' : '启动'}
                  </button>
                )}
                <button
                  onClick={() => { setEditing(true); setForm({ id: s.id, name: s.name, transport: s.transport, command: s.command, args: s.args, url: s.url }); }}
                  className="btn-ghost"
                >
                  编辑
                </button>
                <button onClick={() => remove(s.id)} className="btn-ghost text-danger">删除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditing(false)}>
          <div className="card p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{form.id ? '编辑' : '添加'} MCP 服务器</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="名称" className="input w-full" />
              <select value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value as MCPTransport })} className="input w-full">
                <option value="stdio">stdio</option>
                <option value="http">http</option>
                <option value="sse">sse</option>
              </select>
              {form.transport === 'stdio' && (
                <>
                  <input value={form.command ?? ''} onChange={(e) => setForm({ ...form, command: e.target.value })} placeholder="命令 (如 node)" className="input w-full font-mono" />
                  <input value={(form.args ?? []).join(' ')} onChange={(e) => setForm({ ...form, args: e.target.value.split(' ') })} placeholder="参数（空格分隔）" className="input w-full font-mono" />
                </>
              )}
              {(form.transport === 'http' || form.transport === 'sse') && (
                <input value={form.url ?? ''} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="URL" className="input w-full font-mono" />
              )}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditing(false)} className="btn-ghost">取消</button>
              <button onClick={handleSave} className="btn-primary">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
