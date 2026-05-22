import { useState, useEffect } from 'react';

interface AdItem {
  id: string;
  type: 'popup' | 'corner' | 'text';
  title: string;
  htmlContent: string;
  textContent: string;
  linkUrl: string;
  width: number;
  height: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  popup: '弹窗广告',
  corner: '角标广告',
  text: '文字广告',
};

const emptyForm: Partial<AdItem> = {
  type: 'popup',
  title: '',
  htmlContent: '',
  textContent: '',
  width: 300,
  height: 250,
  enabled: true,
};

export function AdminAds() {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<AdItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/ad/list', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const list = await res.json();
        setAds(list);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const url = editing.id ? `/api/ad/update/${editing.id}` : '/api/ad/create';
      const method = editing.id ? 'PUT' : 'POST';
      await fetch(url, { method, headers, body: JSON.stringify(editing) });
      setEditing(null);
      await load();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`/api/ad/delete/${id}`, { method: 'DELETE', headers });
      await load();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="text-text-secondary">加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">广告管理</h1>
          <p className="text-sm text-text-secondary mt-1">管理应用内广告位</p>
        </div>
        <button onClick={() => setEditing(emptyForm)} className="btn bg-accent text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors">
          新增广告
        </button>
      </div>

      {ads.length === 0 ? (
        <div className="card bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl p-12 text-center">
          <p className="text-lg font-medium text-text-secondary">暂无广告</p>
          <p className="text-sm text-text-tertiary mt-1">点击"新增广告"创建第一个广告</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-white/80 backdrop-blur-xl">
          <table className="table w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-text-secondary text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-medium">类型</th>
                <th className="text-left py-3 px-4 font-medium">标题</th>
                <th className="text-left py-3 px-4 font-medium">内容</th>
                <th className="text-center py-3 px-4 font-medium">状态</th>
                <th className="text-right py-3 px-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {ads.map((ad) => (
                <tr key={ad.id} className="border-b border-border/30 hover:bg-bg-secondary/30 transition-colors">
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      ad.type === 'popup' ? 'bg-accent/10 text-accent' :
                      ad.type === 'corner' ? 'bg-success/10 text-success' :
                      'bg-warning/10 text-warning'
                    }`}>
                      {TYPE_LABELS[ad.type] || ad.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-text-primary">{ad.title}</td>
                  <td className="py-3 px-4 text-text-secondary truncate max-w-xs">
                    {ad.type === 'text' ? ad.textContent : `HTML (${ad.width}×${ad.height})`}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${ad.enabled ? 'bg-success' : 'bg-text-tertiary'}`} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditing(ad)} className="text-accent hover:underline text-xs font-medium">编辑</button>
                      <button onClick={() => setDeleteConfirm(ad.id)} className="text-danger hover:underline text-xs font-medium">删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / Create dialog */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border">
              <h3 className="text-lg font-bold text-text-primary">{editing.id ? '编辑广告' : '新增广告'}</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">广告类型</label>
                <select
                  value={editing.type || 'popup'}
                  onChange={(e) => setEditing({ ...editing, type: e.target.value as any })}
                  className="select select-bordered w-full"
                >
                  <option value="popup">弹窗广告 (Popup)</option>
                  <option value="corner">角标广告 (Corner)</option>
                  <option value="text">文字广告 (Text)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">标题</label>
                <input
                  value={editing.title || ''}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="input w-full bg-white border-border/60 rounded-lg px-3 py-2 text-sm outline-none"
                  placeholder="广告标题"
                />
              </div>
              {editing.type === 'text' ? (
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">文字内容（最多8字）</label>
                  <input
                    value={editing.textContent || ''}
                    onChange={(e) => setEditing({ ...editing, textContent: e.target.value.slice(0, 8) })}
                    className="input w-full bg-white border-border/60 rounded-lg px-3 py-2 text-sm outline-none"
                    placeholder="最多8个汉字"
                    maxLength={8}
                  />
                  <p className="text-xs text-text-tertiary mt-1">{(editing.textContent || '').length}/8</p>
                </div>
              ) : null}
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">链接 URL（可选）</label>
                <input
                  value={editing.linkUrl || ''}
                  onChange={(e) => setEditing({ ...editing, linkUrl: e.target.value })}
                  className="input w-full bg-white border-border/60 rounded-lg px-3 py-2 text-sm outline-none"
                  placeholder="https://example.com"
                />
                <p className="text-xs text-text-tertiary mt-1">留空则点击广告仅关闭菜单</p>
              </div>
              {editing.type !== 'text' ? (
                <>
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1 block">HTML 代码</label>
                    <textarea
                      value={editing.htmlContent || ''}
                      onChange={(e) => setEditing({ ...editing, htmlContent: e.target.value })}
                      className="textarea w-full bg-white border-border/60 rounded-lg px-3 py-2 text-sm outline-none font-mono"
                      rows={6}
                      placeholder="<div>广告 HTML 代码</div>"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-text-secondary mb-1 block">宽度 (px)</label>
                      <input
                        type="number"
                        value={editing.width ?? 300}
                        onChange={(e) => setEditing({ ...editing, width: parseInt(e.target.value) || 0 })}
                        className="input w-full bg-white border-border/60 rounded-lg px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-text-secondary mb-1 block">高度 (px)</label>
                      <input
                        type="number"
                        value={editing.height ?? 250}
                        onChange={(e) => setEditing({ ...editing, height: parseInt(e.target.value) || 0 })}
                        className="input w-full bg-white border-border/60 rounded-lg px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                </>
              ) : null}
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-primary">启用</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.enabled ?? true}
                    onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-text-tertiary/40 rounded-full peer peer-checked:bg-accent peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-all" />
                </label>
              </div>
            </div>
            <div className="p-5 border-t border-border flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="btn px-4 py-2 text-sm rounded-lg border border-border hover:bg-bg-secondary transition-colors">取消</button>
              <button onClick={handleSave} disabled={saving} className="btn bg-accent text-white px-5 py-2 text-sm rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50">
                {saving ? '保存中...' : '保存'}
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
              <p className="text-sm text-text-secondary mb-6">删除后将无法恢复，确定要删除该广告吗？</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="btn h-9 rounded-lg text-sm font-medium px-5 border border-border/60 text-text-primary hover:bg-bg-secondary transition-colors">
                  取消
                </button>
                <button onClick={() => { handleDelete(deleteConfirm); setDeleteConfirm(null); }} className="btn h-9 rounded-lg text-sm font-medium px-5 bg-danger text-white hover:bg-red-600 transition-colors shadow-sm">
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Web API notice */}
      <div className="rounded-xl bg-warning/5 border border-warning/20 p-4 text-sm text-warning">
        <strong>注意：</strong> 此页面通过 Web API 操作数据。确保后端已启动 ad 相关 API 路由。
      </div>
    </div>
  );
}
