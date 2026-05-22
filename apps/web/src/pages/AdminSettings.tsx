import { useState, useEffect } from 'react';
import { api } from '../api';

export function AdminSettings() {
  const [serverUrl, setServerUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [latestVersion, setLatestVersion] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [building, setBuilding] = useState(false);
  const [status, setStatus] = useState<{
    running: boolean;
    runs: Array<{ id: number; status: string; conclusion: string | null; htmlUrl: string; createdAt: string; platform: string }>;
    artifacts: Array<{ name: string; downloadUrl: string; size: number }>;
  } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
    loadBuildStatus();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const settings = await api.admin.settings.list();
      setServerUrl(settings.serverUrl || 'http://localhost:3000');
      setWebsiteUrl(settings.websiteUrl || '');
      setLatestVersion(settings.latestVersion || '');
      setDownloadUrl(settings.downloadUrl || '');
      setGithubToken(settings.githubToken || '');
      setGithubRepo(settings.githubRepo || '');
    } catch (err: any) {
      setMessage({ type: 'error', text: '加载设置失败: ' + (err.message || '未知错误') });
    } finally {
      setLoading(false);
    }
  }

  async function loadBuildStatus() {
    try {
      const s = await api.admin.buildInstallerStatus();
      setStatus(s);
    } catch {} // Silently fail
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      await Promise.all([
        api.admin.settings.update('serverUrl', serverUrl),
        api.admin.settings.update('websiteUrl', websiteUrl),
        api.admin.settings.update('latestVersion', latestVersion),
        api.admin.settings.update('downloadUrl', downloadUrl),
        api.admin.settings.update('githubToken', githubToken),
        api.admin.settings.update('githubRepo', githubRepo),
      ]);
      setMessage({ type: 'success', text: '保存成功' });
    } catch (err: any) {
      setMessage({ type: 'error', text: '保存失败: ' + (err.message || '未知错误') });
    } finally {
      setSaving(false);
    }
  }

  async function handleBuildInstaller() {
    setBuilding(true);
    setMessage(null);
    try {
      const result = await api.admin.buildInstaller();
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        if (result.runUrl) {
          window.open(result.runUrl, '_blank');
        }
        // Refresh status after triggering
        setTimeout(() => loadBuildStatus(), 2000);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: '触发构建失败: ' + (err.message || '未知错误') });
    } finally {
      setBuilding(false);
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function statusBadge(status: string, conclusion: string | null) {
    if (status === 'completed') {
      return conclusion === 'success'
        ? <span className="text-success font-medium">成功</span>
        : <span className="text-danger font-medium">{conclusion || '失败'}</span>;
    }
    if (status === 'in_progress') return <span className="text-warning font-medium">构建中</span>;
    if (status === 'queued' || status === 'pending') return <span className="text-text-secondary font-medium">排队中</span>;
    return <span className="text-text-tertiary">{status}</span>;
  }

  if (loading) {
    return <div className="text-text-secondary">加载中...</div>;
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-bold tracking-tight mb-1">系统设置</h2>
      <p className="text-xs text-text-secondary mb-6">配置服务端地址和 GitHub 构建参数</p>

      {message && (
        <div className={`p-3 rounded-lg text-sm mb-4 ${
          message.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
        }`}>
          {message.text}
        </div>
      )}

      {/* Server URL */}
      <section className="rounded-2xl border border-border p-4 bg-white/80 backdrop-blur-xl mb-4">
        <h3 className="text-sm font-semibold mb-1">服务器地址</h3>
        <p className="text-xs text-text-secondary mb-3">
          客户端用量同步、系统供应商、广告内容的 API 地址。打包安装包时将此地址内置到客户端。
        </p>
        <input
          type="text"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          placeholder="http://localhost:3000"
          className="input input-bordered w-full text-sm"
        />
      </section>

      {/* App Info */}
      <section className="rounded-2xl border border-border p-4 bg-white/80 backdrop-blur-xl mb-4">
        <h3 className="text-sm font-semibold mb-1">应用信息</h3>
        <p className="text-xs text-text-secondary mb-3">
          配置客户端「关于」页面显示的官网地址、版本号和下载链接。客户端启动时会自动检查版本。
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">官网地址</label>
            <input
              type="text"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://cc-models.app"
              className="input input-bordered w-full text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">最新版本号</label>
            <input
              type="text"
              value={latestVersion}
              onChange={(e) => setLatestVersion(e.target.value)}
              placeholder="例如 1.0.0"
              className="input input-bordered w-full text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">下载链接</label>
            <input
              type="text"
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              placeholder="https://example.com/download/latest"
              className="input input-bordered w-full text-sm"
            />
          </div>
        </div>
      </section>

      {/* GitHub Config */}
      <section className="rounded-2xl border border-border p-4 bg-white/80 backdrop-blur-xl mb-4">
        <h3 className="text-sm font-semibold mb-1">GitHub 配置</h3>
        <p className="text-xs text-text-secondary mb-3">
          用于触发 GitHub Actions 自动构建 Windows、macOS、Linux 三个平台的安装包。
          需要创建 Personal Access Token（权限：repo）。
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">GitHub Token</label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="input input-bordered w-full text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">仓库地址</label>
            <input
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="username/repo"
              className="input input-bordered w-full text-sm"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm">
            {saving ? '保存中…' : '保存配置'}
          </button>
        </div>
      </section>

      {/* Build Installer */}
      <section className="rounded-2xl border border-border p-4 bg-white/80 backdrop-blur-xl mb-4">
        <h3 className="text-sm font-semibold mb-1">打包安装包</h3>
        <p className="text-xs text-text-secondary mb-3">
          触发 GitHub Actions 在三个平台上编译并打包安装包，生成的 .msi/.dmg/.AppImage 可在运行完成后下载。
        </p>
        <button
          onClick={handleBuildInstaller}
          disabled={building || status?.running}
          className="btn btn-primary"
        >
          {building || status?.running ? '构建中…' : '开始打包（三个平台）'}
        </button>
        {status && status.runs.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-text-secondary mb-2">最近构建记录：</p>
            <div className="space-y-1.5">
              {status.runs.slice(0, 3).map((run) => (
                <div key={run.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-bg-secondary/50">
                  <div className="flex items-center gap-2">
                    <span className="text-text-tertiary">{new Date(run.createdAt).toLocaleString('zh-CN')}</span>
                    <span className="text-text-secondary">{run.platform}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(run.status, run.conclusion)}
                    {run.htmlUrl && (
                      <a href={run.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        查看
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {status && status.artifacts.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-text-secondary mb-2">最新构建产物（从 GitHub 下载）：</p>
            <div className="space-y-1">
              {status.artifacts.map((art) => (
                <div key={art.name} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-success/5">
                  <span className="text-text-primary">{art.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-text-tertiary">{formatSize(art.size)}</span>
                    <a href={art.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      下载
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-3">
          <button
            onClick={loadBuildStatus}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            刷新构建状态
          </button>
        </div>
      </section>
    </div>
  );
}
