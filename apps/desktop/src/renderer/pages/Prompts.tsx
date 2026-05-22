import { useState } from 'react';
import { usePrompts } from '../hooks/usePrompts';
import { useI18n } from '../hooks/useI18n';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { PromptTarget, PromptFormData, PromptConfig } from '@ccmodels/shared';

export function Prompts() {
  const { prompts, loading, create, update, remove, toggleActive } = usePrompts();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PromptFormData & { id?: string }>({ name: '', content: '', target: 'claude', tags: [] });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleSave = async () => {
    if (form.id) await update(form.id, form);
    else await create(form);
    setEditing(false);
  };

  if (loading) return <div className="text-text-secondary">{t('common.loading')}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('prompts.title')}</h2>
          <p className="text-sm text-text-secondary mt-1">{t('prompts.desc')}</p>
        </div>
        <button
          onClick={() => { setEditing(true); setForm({ name: '', content: '', target: 'claude', tags: [] }); }}
          className="btn btn-primary"
        >
          {t('prompts.add')}
        </button>
      </div>

      {/* List */}
      {prompts.length === 0 ? (
        <div className="card card-bordered p-12 text-center">
          <p className="text-lg font-medium mb-1">{t('prompts.emptyTitle')}</p>
          <p className="text-sm text-text-secondary">{t('prompts.emptyDesc')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prompts.map((p: PromptConfig) => (
            <div key={p.id} className="card card-bordered p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-semibold">{p.name}</span>
                  <span className="badge">{p.target}</span>
                  <span className={`text-xs ${p.isActive ? 'text-success' : 'text-text-tertiary'}`}>
                    {p.isActive ? t('prompts.enabled') : t('prompts.disabled')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(p.id, !p.isActive)} className="btn btn-ghost">
                    {p.isActive ? t('prompts.disable') : t('prompts.enable')}
                  </button>
                  <button
                    onClick={() => { setEditing(true); setForm({ id: p.id, name: p.name, content: p.content, target: p.target, tags: p.tags }); }}
                    className="btn btn-ghost"
                  >
                    {t('prompts.edit')}
                  </button>
                  <button onClick={() => setConfirmDelete(p.id)} className="btn btn-ghost text-error">{t('prompts.delete')}</button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditing(false)}>
          <div className="bg-white text-text-primary rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{form.id ? t('prompts.editTitle') : t('prompts.addTitle')}</h3>
            <div className="space-y-3">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('prompts.namePlaceholder')}
                className="input input-bordered w-full"
              />
              <select
                value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value as PromptTarget })}
                className="input input-bordered w-full"
              >
                <option value="claude">{t('prompts.targetClaude')}</option>
                <option value="gemini">{t('prompts.targetGemini')}</option>
                <option value="codex">{t('prompts.targetCodex')}</option>
                <option value="all">{t('prompts.targetAll')}</option>
              </select>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder={t('prompts.contentPlaceholder')}
                rows={8}
                className="input input-bordered w-full font-mono resize-y"
              />
              <input
                value={form.tags.join(', ')}
                onChange={(e) => setForm({ ...form, tags: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
                placeholder={t('prompts.tagsPlaceholder')}
                className="input input-bordered w-full"
              />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditing(false)} className="btn btn-ghost">{t('common.cancel')}</button>
              <button onClick={handleSave} className="btn btn-primary">{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={confirmDelete !== null}
        title={t('prompts.deleteTitle')}
        message={t('prompts.deleteConfirm')}
        confirmLabel={t('common.delete')}
        onConfirm={() => { if (confirmDelete) { remove(confirmDelete); setConfirmDelete(null); } }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
