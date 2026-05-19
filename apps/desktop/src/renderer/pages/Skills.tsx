import { useState } from 'react';
import { useSkills } from '../hooks/useSkills';
import type { SkillFormData, Skill } from '@ccswitch/shared';

export function Skills() {
  const { skills, loading, create, remove, toggleActive, checkConflict } = useSkills();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<SkillFormData & { id?: string }>({ name: '', sourceUrl: '', config: {} });

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Skills</h2>
          <p className="text-sm text-text-secondary mt-1">管理已安装的技能插件</p>
        </div>
        <button
          onClick={() => { setEditing(true); setForm({ name: '', sourceUrl: '', config: {} }); }}
          className="btn-primary"
        >
          + 安装 Skill
        </button>
      </div>

      {/* Skill list */}
      {skills.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-lg font-medium mb-1">暂无 Skills</p>
          <p className="text-sm text-text-secondary">从社区仓库 URL 安装技能插件</p>
        </div>
      ) : (
        <div className="space-y-3">
          {skills.map((s: Skill) => (
            <div key={s.id} className="card p-5 flex items-center justify-between">
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
                <button onClick={() => toggleActive(s.id, !s.isActive)} className="btn-ghost">
                  {s.isActive ? '禁用' : '启用'}
                </button>
                <button onClick={() => remove(s.id)} className="btn-ghost text-danger">卸载</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Install dialog */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditing(false)}>
          <div className="card p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">安装 Skill</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Skill 名称" className="input w-full" />
              <input value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="来源 URL（GitHub 仓库）" className="input w-full font-mono" />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditing(false)} className="btn-ghost">取消</button>
              <button
                onClick={async () => {
                  const conflict = await checkConflict(form.name);
                  if (conflict) { alert(`Skill "${form.name}" 已安装`); return; }
                  await create(form);
                  setEditing(false);
                }}
                className="btn-primary"
              >
                安装
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
