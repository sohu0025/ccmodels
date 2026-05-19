import { useState } from 'react';
import { usePrompts } from '../hooks/usePrompts';
import type { PromptTarget, PromptFormData, PromptConfig } from '@ccswitch/shared';

export function Prompts() {
  const { prompts, loading, create, update, remove, toggleActive } = usePrompts();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PromptFormData & { id?: string }>({ name: '', content: '', target: 'claude', tags: [] });

  const handleSave = async () => {
    if (form.id) await update(form.id, form);
    else await create(form);
    setEditing(false);
  };

  if (loading) return <div className="p-8 text-text-secondary">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Prompts</h2>
          <p className="text-sm text-text-secondary mt-1">Manage CLAUDE.md, AGENTS.md, GEMINI.md system prompts</p>
        </div>
        <button onClick={() => { setEditing(true); setForm({ name: '', content: '', target: 'claude', tags: [] }); }}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover">+ Add Prompt</button>
      </div>

      <div className="space-y-3">
        {prompts.length === 0 ? (
          <p className="text-sm text-text-secondary py-8 text-center">No prompts configured. Add system prompts for your CLI tools.</p>
        ) : prompts.map((p: PromptConfig) => (
          <div key={p.id} className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{p.name}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-bg-tertiary">{p.target}</span>
                <span className={`text-xs ${p.isActive ? 'text-success' : 'text-text-secondary'}`}>{p.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(p.id, !p.isActive)}
                  className="text-xs px-2 py-1 rounded border border-border">{p.isActive ? 'Disable' : 'Enable'}</button>
                <button onClick={() => { setEditing(true); setForm({ id: p.id, name: p.name, content: p.content, target: p.target, tags: p.tags }); }}
                  className="text-xs px-2 py-1 rounded border border-border">Edit</button>
                <button onClick={() => remove(p.id)} className="text-xs px-2 py-1 rounded border border-border text-danger">Delete</button>
              </div>
            </div>
            <pre className="text-xs text-text-secondary bg-bg-secondary p-3 rounded-lg max-h-32 overflow-auto font-mono whitespace-pre-wrap">{p.content}</pre>
            {p.tags.length > 0 && (
              <div className="flex gap-1 mt-2">
                {p.tags.map((t) => <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-bg-tertiary">{t}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditing(false)}>
          <div className="bg-bg-primary rounded-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-4">{form.id ? 'Edit' : 'Add'} Prompt</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm" />
              <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value as PromptTarget })} className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm">
                <option value="claude">Claude (CLAUDE.md)</option>
                <option value="gemini">Gemini (GEMINI.md)</option>
                <option value="codex">Codex (AGENTS.md)</option>
                <option value="all">All tools</option>
              </select>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="System prompt content..." rows={8}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm font-mono" />
              <input value={form.tags.join(', ')} onChange={(e) => setForm({ ...form, tags: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} placeholder="Tags (comma separated)" className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm" />
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
