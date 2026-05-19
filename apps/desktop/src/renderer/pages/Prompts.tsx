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

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Prompts</h2>
          <p className="text-sm text-text-secondary mt-1">管理 CLAUDE.md、AGENTS.md、GEMINI.md 系统提示</p>
        </div>
        <button
          onClick={() => { setEditing(true); setForm({ name: '', content: '', target: 'claude', tags: [] }); }}
          className="btn-primary"
        >
          + 添加 Prompt
        </button>
      </div>

      {/* List */}
      {prompts.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-lg font-medium mb-1">暂无 Prompts</p>
          <p className="text-sm text-text-secondary">添加系统提示以配置 CLI 工具行为</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prompts.map((p: PromptConfig) => (
            <div key={p.id} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-semibold">{p.name}</span>
                  <span className="badge">{p.target}</span>
                  <span className={`text-xs ${p.isActive ? 'text-success' : 'text-text-tertiary'}`}>
                    {p.isActive ? '已启用' : '已禁用'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(p.id, !p.isActive)} className="btn-ghost">
                    {p.isActive ? '禁用' : '启用'}
                  </button>
                  <button
                    onClick={() => { setEditing(true); setForm({ id: p.id, name: p.name, content: p.content, target: p.target, tags: p.tags }); }}
                    className="btn-ghost"
                  >
                    编辑
                  </button>
                  <button onClick={() => remove(p.id)} className="btn-ghost text-danger">删除</button>
                </div>
              </div>
              <pre className="text-xs text-text-secondary bg-bg-secondary p-4 rounded-xl max-h-32 overflow-auto font-mono whitespace-pre-wrap">
                {p.content}
              </pre>
              {p.tags.length > 0 && (
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {p.tags.map((t) => (
                    <span key={t} className="badge badge-ghost">{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditing(false)}>
          <div className="card p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{form.id ? '编辑' : '添加'} Prompt</h3>
            <div className="space-y-3">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="名称"
                className="input w-full"
              />
              <select
                value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value as PromptTarget })}
                className="input w-full"
              >
                <option value="claude">Claude (CLAUDE.md)</option>
                <option value="gemini">Gemini (GEMINI.md)</option>
                <option value="codex">Codex (AGENTS.md)</option>
                <option value="all">All tools</option>
              </select>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="系统提示内容..."
                rows={8}
                className="input w-full font-mono resize-y"
              />
              <input
                value={form.tags.join(', ')}
                onChange={(e) => setForm({ ...form, tags: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
                placeholder="标签（逗号分隔）"
                className="input w-full"
              />
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
