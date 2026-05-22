import { useState } from 'react';
import { useSkills } from '../hooks/useSkills';
import { useI18n } from '../hooks/useI18n';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { SkillFormData, Skill } from '@ccmodels/shared';

export function Skills() {
  const { skills, loading, create, remove, toggleActive, checkConflict } = useSkills();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<SkillFormData & { id?: string }>({ name: '', sourceUrl: '', config: {} });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (loading) return <div className="text-text-secondary">{t('common.loading')}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('skills.title')}</h2>
          <p className="text-sm text-text-secondary mt-1">{t('skills.desc')}</p>
        </div>
        <button
          onClick={() => { setEditing(true); setForm({ name: '', sourceUrl: '', config: {} }); }}
          className="btn btn-primary"
        >
          {t('skills.install')}
        </button>
      </div>

      {/* Skill list */}
      {skills.length === 0 ? (
        <div className="card card-bordered p-12 text-center">
          <p className="text-lg font-medium mb-1">{t('skills.emptyTitle')}</p>
          <p className="text-sm text-text-secondary">{t('skills.emptyDesc')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {skills.map((s: Skill) => (
            <div key={s.id} className="card card-bordered p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className={`indicator ${s.isActive ? 'indicator-success' : 'indicator-danger'}`} />
                  <span className="text-sm font-semibold">{s.name}</span>
                  <span className="badge badge-ghost">v{s.version}</span>
                </div>
                <p className="text-xs text-text-tertiary truncate max-w-md">
                  {s.description || s.sourceUrl}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(s.id, !s.isActive)} className="btn btn-ghost">
                  {s.isActive ? t('skills.disable') : t('skills.enable')}
                </button>
                <button onClick={() => setConfirmDelete(s.id)} className="btn btn-ghost text-error">{t('skills.uninstall')}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Install dialog */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditing(false)}>
          <div className="bg-white text-text-primary rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{t('skills.dialogTitle')}</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('skills.namePlaceholder')} className="input input-bordered w-full" />
              <input value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder={t('skills.urlPlaceholder')} className="input input-bordered w-full font-mono" />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditing(false)} className="btn btn-ghost">{t('common.cancel')}</button>
              <button
                onClick={async () => {
                  const conflict = await checkConflict(form.name);
                  if (conflict) { alert(t('skills.conflictMsg', { name: form.name })); return; }
                  await create(form);
                  setEditing(false);
                }}
                className="btn btn-primary"
              >
                {t('skills.installBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={confirmDelete !== null}
        title={t('skills.deleteTitle')}
        message={t('skills.deleteConfirm')}
        confirmLabel={t('skills.uninstall')}
        onConfirm={() => { if (confirmDelete) { remove(confirmDelete); setConfirmDelete(null); } }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
