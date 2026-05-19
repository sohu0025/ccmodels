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
      // Preserve original args if the joined representation hasn't changed
      const original = servers.find((s: any) => s.id === form.id);
      if (original) {
        const origStr = (original.args ?? []).join(' ');
        const currentStr = (saveData.args ?? []).join(' ');
        if (origStr === currentStr) {
          saveData.args = original.args;
        }
      }
      // Don't pass headers/envVars so backend keeps existing values
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

  if (loading) return <div className="p-8 text-text-secondary">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">MCP Servers</h2>
          <p className="text-sm text-text-secondary mt-1">Manage MCP servers (stdio, HTTP, SSE)</p>
        </div>
        <button onClick={() => { setEditing(true); setForm({ name: '', transport: 'stdio', command: '', args: [], url: '' }); }}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover">+ Add MCP</button>
      </div>

      <div className="space-y-3">
        {servers.length === 0 ? (
          <p className="text-sm text-text-secondary py-8 text-center">No MCP servers configured</p>
        ) : servers.map((s) => (
          <div key={s.id} className="rounded-xl border border-border p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${statuses[s.id] === 'running' ? 'bg-success' : 'bg-text-secondary'}`} />
                <span className="font-medium text-sm">{s.name}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-bg-tertiary">{s.transport}</span>
              </div>
              {s.command && <p className="text-xs text-text-secondary font-mono">{s.command} {(s.args ?? []).join(' ')}</p>}
              {s.url && <p className="text-xs text-text-secondary">{s.url}</p>}
            </div>
            <div className="flex items-center gap-2">
              {s.transport === 'stdio' && (
                <button onClick={() => startStop(s.id, statuses[s.id] !== 'running')}
                  className={`text-xs px-2 py-1 rounded ${statuses[s.id] === 'running' ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}>
                  {statuses[s.id] === 'running' ? 'Stop' : 'Start'}
                </button>
              )}
              <button onClick={() => { setEditing(true); setForm({ id: s.id, name: s.name, transport: s.transport, command: s.command, args: s.args, url: s.url }); }}
                className="text-xs px-2 py-1 rounded border border-border">Edit</button>
              <button onClick={() => remove(s.id)} className="text-xs px-2 py-1 rounded border border-border text-danger">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditing(false)}>
          <div className="bg-bg-primary rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-4">{form.id ? 'Edit' : 'Add'} MCP Server</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm" />
              <select value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value as MCPTransport })} className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm">
                <option value="stdio">stdio</option>
                <option value="http">http</option>
                <option value="sse">sse</option>
              </select>
              {form.transport === 'stdio' && (
                <>
                  <input value={form.command ?? ''} onChange={(e) => setForm({ ...form, command: e.target.value })} placeholder="Command (e.g. node)" className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm font-mono" />
                  <input value={(form.args ?? []).join(' ')} onChange={(e) => setForm({ ...form, args: e.target.value.split(' ') })} placeholder="Args (space separated)" className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm font-mono" />
                </>
              )}
              {(form.transport === 'http' || form.transport === 'sse') && (
                <input value={form.url ?? ''} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="URL" className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm font-mono" />
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditing(false)} className="px-3 py-2 rounded-lg border border-border text-sm">Cancel</button>
              <button onClick={handleSave} className="px-3 py-2 rounded-lg bg-accent text-white text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
