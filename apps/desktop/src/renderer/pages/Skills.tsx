import { useState } from 'react';
import { useSkills } from '../hooks/useSkills';
import type { SkillFormData, Skill } from '@ccswitch/shared';

export function Skills() {
  const { skills, loading, create, remove, toggleActive, checkConflict } = useSkills();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<SkillFormData & { id?: string }>({ name: '', sourceUrl: '', config: {} });

  if (loading) return <div className="p-8 text-text-secondary">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Skills</h2>
          <p className="text-sm text-text-secondary mt-1">Manage installed skills</p>
        </div>
        <button onClick={() => { setEditing(true); setForm({ name: '', sourceUrl: '', config: {} }); }}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover">+ Install Skill</button>
      </div>

      <div className="space-y-3">
        {skills.length === 0 ? (
          <p className="text-sm text-text-secondary py-8 text-center">No skills installed. Add a skill from a community repo URL.</p>
        ) : skills.map((s: Skill) => (
          <div key={s.id} className="rounded-xl border border-border p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${s.isActive ? 'bg-success' : 'bg-text-secondary'}`} />
                <span className="font-medium text-sm">{s.name}</span>
                <span className="text-xs text-text-secondary">v{s.version}</span>
              </div>
              <p className="text-xs text-text-secondary truncate max-w-md">{s.description || s.sourceUrl}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleActive(s.id, !s.isActive)}
                className="text-xs px-2 py-1 rounded border border-border">{s.isActive ? 'Disable' : 'Enable'}</button>
              <button onClick={() => remove(s.id)} className="text-xs px-2 py-1 rounded border border-border text-danger">Uninstall</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditing(false)}>
          <div className="bg-bg-primary rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-4">Install Skill</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Skill name" className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm" />
              <input value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="Source URL (GitHub repo)" className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm font-mono" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditing(false)} className="px-3 py-2 rounded-lg border border-border text-sm">Cancel</button>
              <button onClick={async () => {
                const conflict = await checkConflict(form.name);
                if (conflict) { alert(`Skill "${form.name}" is already installed`); return; }
                await create(form);
                setEditing(false);
              }} className="px-3 py-2 rounded-lg bg-accent text-white text-sm">Install</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
