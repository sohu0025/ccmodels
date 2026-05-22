import { useState, useEffect } from 'react';
import { api } from '../api';

interface SystemProvider {
  id: string;
  name: string;
  icon: string;
  type: string;
  website: string;
  openaiApiBase: string | null;
  anthropicApiBase: string | null;
  googleApiBase: string | null;
  sort: number;
  isActive: boolean;
}

interface FormData {
  name: string;
  icon: string;
  type: string;
  website: string;
  openaiApiBase: string;
  anthropicApiBase: string;
  googleApiBase: string;
  sort: number;
  isActive: boolean;
}

const ICON_OPTIONS = [
  'DeepSeek', '智谱 GLM', 'Kimi (Moonshot)', 'MiniMax',
  '通义千问 (DashScope)', '字节豆包', '百川 (Baichuan)',
  '讯飞星火', '腾讯混元', 'SiliconFlow', 'OpenRouter',
  'Anthropic Official', 'OpenAI Official', 'Google Gemini',
];

const emptyForm: FormData = {
  name: '',
  icon: '',
  type: 'official',
  website: '',
  openaiApiBase: '',
  anthropicApiBase: '',
  googleApiBase: '',
  sort: 0,
  isActive: true,
};

export function AdminProviders() {
  const [providers, setProviders] = useState<SystemProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.admin.systemProviders.list();
      setProviders(data);
    } catch (err: any) {
      setError(err.message ?? '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setEditing(true);
  };

  const openEdit = (p: SystemProvider) => {
    setForm({
      name: p.name,
      icon: p.icon ?? '',
      type: p.type,
      website: p.website,
      openaiApiBase: p.openaiApiBase ?? '',
      anthropicApiBase: p.anthropicApiBase ?? '',
      googleApiBase: p.googleApiBase ?? '',
      sort: p.sort,
      isActive: p.isActive,
    });
    setEditingId(p.id);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const data = {
        ...form,
        openaiApiBase: form.openaiApiBase || null,
        anthropicApiBase: form.anthropicApiBase || null,
        googleApiBase: form.googleApiBase || null,
      };
      if (editingId) {
        await api.admin.systemProviders.update(editingId, data);
      } else {
        await api.admin.systemProviders.create(data);
      }
      setEditing(false);
      await load();
    } catch (err: any) {
      setError(err.message ?? '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.admin.systemProviders.remove(id);
      setDeleteConfirm(null);
      await load();
    } catch (err: any) {
      setError(err.message ?? '删除失败');
    }
  };

  const protocolBadges = (p: SystemProvider) => {
    const badges = [];
    if (p.openaiApiBase) badges.push(<span key="openai" className="badge badge-sm bg-accent/10 text-accent border-accent/20">OpenAI</span>);
    if (p.anthropicApiBase) badges.push(<span key="anthropic" className="badge badge-sm bg-success/10 text-success border-success/20">Anthropic</span>);
    if (p.googleApiBase) badges.push(<span key="google" className="badge badge-sm bg-warning/10 text-warning border-warning/20">Google</span>);
    return badges.length ? <div className="flex gap-1 flex-wrap">{badges}</div> : <span className="text-xs text-text-tertiary">未配置</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-md text-accent" />
        <span className="ml-3 text-sm text-text-secondary">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">系统供应商</h1>
          <p className="section-subtitle">管理所有用户可用的系统预设供应商及协议地址</p>
        </div>
        <button onClick={openCreate} className="btn bg-accent text-white h-10 rounded-lg text-sm font-medium px-5 hover:bg-accent-hover transition-colors shadow-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新增供应商
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-danger/10 text-danger text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-danger/60 hover:text-danger">✕</button>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="table w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-bg-secondary/30">
                <th className="text-left px-4 py-3.5 font-medium text-text-secondary text-xs uppercase tracking-wider">名称</th>
                <th className="text-left px-4 py-3.5 font-medium text-text-secondary text-xs uppercase tracking-wider">图标</th>
                <th className="text-left px-4 py-3.5 font-medium text-text-secondary text-xs uppercase tracking-wider">类型</th>
                <th className="text-left px-4 py-3.5 font-medium text-text-secondary text-xs uppercase tracking-wider">官网</th>
                <th className="text-left px-4 py-3.5 font-medium text-text-secondary text-xs uppercase tracking-wider">支持协议</th>
                <th className="text-left px-4 py-3.5 font-medium text-text-secondary text-xs uppercase tracking-wider">状态</th>
                <th className="text-right px-4 py-3.5 font-medium text-text-secondary text-xs uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody>
              {providers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-text-secondary">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8 text-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                      <p className="text-sm">暂无系统供应商</p>
                      <p className="text-xs text-text-tertiary">点击上方按钮新增</p>
                    </div>
                  </td>
                </tr>
              ) : (
                providers.map((p) => (
                  <tr key={p.id} className="border-b border-border/30 hover:bg-bg-secondary/30 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-text-primary">{p.name}</td>
                    <td className="px-4 py-3.5 text-text-secondary">{p.icon || <span className="text-text-tertiary">—</span>}</td>
                    <td className="px-4 py-3.5">
                      <span className={`badge badge-sm ${
                        p.type === 'official'
                          ? 'bg-accent/10 text-accent border-accent/20'
                          : p.type === 'third-party'
                          ? 'bg-warning/10 text-warning border-warning/20'
                          : 'bg-bg-tertiary text-text-secondary border-border/40'
                      }`}>
                        {p.type === 'official' ? '官方' : p.type === 'third-party' ? '第三方' : '自定义'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {p.website ? (
                        <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-xs font-medium">
                          {p.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">{protocolBadges(p)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${p.isActive ? 'text-success' : 'text-text-tertiary'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-success shadow-sm shadow-success/50' : 'bg-border'}`} />
                        {p.isActive ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(p)} className="btn btn-ghost btn-xs text-accent hover:bg-accent/5 font-medium">编辑</button>
                        <button onClick={() => setDeleteConfirm(p.id)} className="btn btn-ghost btn-xs text-danger hover:bg-danger/5 font-medium">删除</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Create Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditing(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-text-primary">{editingId ? '编辑供应商' : '新增供应商'}</h3>
              <button onClick={() => setEditing(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-secondary transition-colors text-text-tertiary">
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-text-secondary mb-1 block">供应商名称</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：DeepSeek" className="input w-full bg-white border-border/60 focus:border-accent rounded-lg px-3 py-2.5 text-sm outline-none transition-colors" />
                </div>
                <div className="w-32">
                  <label className="text-xs font-medium text-text-secondary mb-1 block">类型</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input w-full bg-white border-border/60 focus:border-accent rounded-lg px-3 py-2.5 text-sm outline-none transition-colors">
                    <option value="official">官方</option>
                    <option value="third-party">第三方</option>
                    <option value="custom">自定义</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">图标</label>
                <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="input w-full bg-white border-border/60 focus:border-accent rounded-lg px-3 py-2.5 text-sm outline-none transition-colors">
                  <option value="">— 无图标 —</option>
                  {ICON_OPTIONS.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">官网地址</label>
                <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://api.deepseek.com" className="input w-full bg-white border-border/60 focus:border-accent rounded-lg px-3 py-2.5 text-sm outline-none transition-colors" />
              </div>

              <div className="border-t border-border/60 pt-4">
                <p className="text-xs font-semibold text-text-secondary mb-3">协议接口地址</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1 block flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                      OpenAI 兼容协议
                    </label>
                    <input value={form.openaiApiBase} onChange={(e) => setForm({ ...form, openaiApiBase: e.target.value })} placeholder="https://api.deepseek.com/v1" className="input w-full bg-white border-border/60 focus:border-accent rounded-lg px-3 py-2.5 text-sm outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1 block flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-success" />
                      Anthropic 协议
                    </label>
                    <input value={form.anthropicApiBase} onChange={(e) => setForm({ ...form, anthropicApiBase: e.target.value })} placeholder="https://api.anthropic.com" className="input w-full bg-white border-border/60 focus:border-accent rounded-lg px-3 py-2.5 text-sm outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1 block flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                      Google Gemini 协议
                    </label>
                    <input value={form.googleApiBase} onChange={(e) => setForm({ ...form, googleApiBase: e.target.value })} placeholder="https://generativelanguage.googleapis.com" className="input w-full bg-white border-border/60 focus:border-accent rounded-lg px-3 py-2.5 text-sm outline-none transition-colors" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-text-secondary">排序</label>
                  <input type="number" value={form.sort} onChange={(e) => setForm({ ...form, sort: parseInt(e.target.value) || 0 })} className="input w-20 bg-white border-border/60 focus:border-accent rounded-lg px-3 py-2 text-sm outline-none transition-colors" />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="checkbox checkbox-sm checkbox-accent" />
                  启用
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setEditing(false)} className="btn h-9 rounded-lg text-sm font-medium px-4 border border-border/60 text-text-primary hover:bg-bg-secondary transition-colors">
                取消
              </button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} className="btn bg-accent text-white h-9 rounded-lg text-sm font-medium px-4 hover:bg-accent-hover transition-colors disabled:opacity-50">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="loading loading-spinner loading-sm" />
                    保存中...
                  </span>
                ) : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">确认删除</h3>
              <p className="text-sm text-text-secondary mb-6">删除后将无法恢复，确定要删除该供应商吗？</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="btn h-9 rounded-lg text-sm font-medium px-5 border border-border/60 text-text-primary hover:bg-bg-secondary transition-colors">
                  取消
                </button>
                <button onClick={() => handleDelete(deleteConfirm)} className="btn h-9 rounded-lg text-sm font-medium px-5 bg-danger text-white hover:bg-red-600 transition-colors shadow-sm">
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
