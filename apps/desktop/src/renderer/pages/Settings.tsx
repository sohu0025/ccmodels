import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useProviders } from '../hooks/useProviders';
import { useSpeedTests } from '../hooks/useSpeedTests';
import { useBudget } from '../hooks/useBudget';
import { useI18n } from '../hooks/useI18n';
import { Mcp } from '../pages/Mcp';
import { Skills } from '../pages/Skills';
import { Prompts } from '../pages/Prompts';
import { Compare } from '../pages/Compare';
import { Recommendations } from '../pages/Recommendations';
import type { Theme, Locale } from '@ccmodels/shared';

type TabKey = 'general' | 'speed-test' | 'budget' | 'mcp' | 'skills' | 'prompts' | 'compare' | 'recommendations' | 'about';

export function Settings() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabKey>('general');

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'general', label: t('settings.tabs.general') },
    { key: 'speed-test', label: t('settings.tabs.speedTest') },
    { key: 'budget', label: t('settings.tabs.budget') },
    { key: 'mcp', label: t('settings.tabs.mcp') },
    { key: 'skills', label: t('settings.tabs.skills') },
    { key: 'prompts', label: t('settings.tabs.prompts') },
    { key: 'compare', label: t('settings.tabs.compare') },
    { key: 'recommendations', label: t('settings.tabs.recommendations') },
    { key: 'about', label: t('settings.tabs.about') },
  ];

  return (
    <div className="flex h-full">
      {/* Left navigation */}
      <nav className="w-44 shrink-0 border-r border-border bg-bg-secondary/20 p-3">
        <div className="space-y-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-black/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content area */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'general' && <GeneralSection />}
        {activeTab === 'speed-test' && <SpeedTestSection />}
        {activeTab === 'budget' && <BudgetSection />}
        {activeTab === 'mcp' && (
          <div className="max-w-3xl">
            <Mcp />
          </div>
        )}
        {activeTab === 'skills' && (
          <div className="max-w-3xl">
            <Skills />
          </div>
        )}
        {activeTab === 'prompts' && (
          <div className="max-w-3xl">
            <Prompts />
          </div>
        )}
        {activeTab === 'compare' && (
          <div className="max-w-3xl">
            <Compare />
          </div>
        )}
        {activeTab === 'recommendations' && (
          <div className="max-w-3xl">
            <Recommendations />
          </div>
        )}
        {activeTab === 'about' && (
          <div className="max-w-xl">
            <AboutSection />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── General Settings ── */

function GeneralSection() {
  const { settings, update, refresh } = useSettings();
  const { t } = useI18n();
  const [draftPort, setDraftPort] = useState<number>(15721);
  const [portSaving, setPortSaving] = useState(false);

  if (!settings) return <div className="text-text-secondary">{t('common.loading')}</div>;

  // Sync draft port from settings when they load
  useEffect(() => {
    setDraftPort(settings.proxyPort);
  }, [settings.proxyPort]);

  const handleThemeChange = (theme: Theme) => {
    update({ theme });
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight">{t('settings.generalTitle')}</h2>
        <p className="text-xs text-text-tertiary mt-0.5">{t('settings.generalDesc')}</p>
      </div>

      <section className="rounded-2xl border border-border p-4 bg-white/80 backdrop-blur-xl">
        <h3 className="text-sm font-semibold mb-1">{t('settings.theme')}</h3>
        <p className="text-xs text-text-secondary mb-3">{t('settings.themeDesc')}</p>
        <div className="flex gap-3">
          {([
            { key: 'light' as Theme, label: `☀️ ${t('settings.light')}` },
            { key: 'dark' as Theme, label: `🌙 ${t('settings.dark')}` },
            { key: 'system' as Theme, label: `💻 ${t('settings.system')}` },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleThemeChange(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                settings.theme === key
                  ? 'bg-accent text-white'
                  : 'bg-bg-card border border-border text-text-secondary hover:bg-border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border p-4 bg-white/80 backdrop-blur-xl">
        <h3 className="text-sm font-semibold mb-1">{t('settings.language')}</h3>
        <p className="text-xs text-text-secondary mb-4">{t('settings.languageDesc')}</p>
        <div className="flex gap-3">
          {([
            { key: 'zh-CN' as Locale, label: '中文' },
            { key: 'en-US' as Locale, label: 'English' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => update({ locale: key })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                settings.locale === key
                  ? 'bg-accent text-white'
                  : 'bg-bg-card border border-border text-text-secondary hover:bg-border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border p-4 bg-white/80 backdrop-blur-xl">
        <h3 className="text-sm font-semibold mb-3">{t('settings.autoConfig')}</h3>
        <p className="text-xs text-text-secondary mb-4">{t('settings.autoConfigDesc')}</p>
        <ToggleOption label={t('settings.autoConfigToggle')} checked={settings.autoConfigCli} onChange={(v) => update({ autoConfigCli: v })} />
      </section>

      <section className="rounded-2xl border border-border p-4 bg-white/80 backdrop-blur-xl">
        <h3 className="text-sm font-semibold mb-3">{t('settings.lightweight')}</h3>
        <p className="text-xs text-text-secondary mb-4">{t('settings.lightweightDesc')}</p>
        <ToggleOption label={t('settings.lightweightToggle')} checked={settings.lightweightMode} onChange={(v) => update({ lightweightMode: v })} />
      </section>

      <section className="rounded-2xl border border-border p-4 bg-white/80 backdrop-blur-xl">
        <h3 className="text-sm font-semibold mb-1">代理端口号</h3>
        <p className="text-xs text-text-secondary mb-3">本地代理服务器端口（默认 15721），修改后自动重启代理并更新所有 CLI 工具配置</p>
        <div className="flex gap-3 items-center">
          <span className="text-sm text-text-secondary">127.0.0.1:</span>
          <input
            type="number"
            value={draftPort}
            onChange={(e) => setDraftPort(parseInt(e.target.value, 10) || 15721)}
            placeholder="15721"
            className="input input-bordered w-32 text-sm"
            min={1024}
            max={65535}
          />
          <button
            onClick={async () => {
              if (draftPort < 1024 || draftPort > 65535) return;
              setPortSaving(true);
              try {
                const result = await (window as any).electronAPI.updateProxyPort(draftPort);
                if (result.fallback) {
                  alert(result.message || `端口 ${draftPort} 被占用，已回退到 ${result.port}`);
                }
                await refresh();
              } catch (err: any) {
                console.error('Failed to update proxy port:', err);
                alert('端口保存失败: ' + (err?.message || '未知错误'));
              } finally {
                setPortSaving(false);
              }
            }}
            disabled={portSaving || draftPort === settings.proxyPort}
            className="btn btn-primary btn-sm"
          >
            {portSaving ? '保存中…' : '保存'}
          </button>
        </div>
      </section>

    </div>
  );
}

function ToggleOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-1">
      <span className="text-sm">{label}</span>
      <div
        className={`w-10 h-6 rounded-full cursor-pointer transition-colors relative ${checked ? 'bg-accent' : 'bg-text-tertiary/40'}`}
        onClick={() => onChange(!checked)}
      >
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
    </label>
  );
}

/* ── Speed Test Section ── */

function SpeedTestSection() {
  const { results, loading, refresh } = useSpeedTests();
  const { providers } = useProviders();
  const { t } = useI18n();
  const [testing, setTesting] = useState(false);

  const providerMap = new Map(providers.map((p: any) => [p.id, p]));

  const runTest = async () => {
    setTesting(true);
    try {
      await (window as any).electronAPI.runSpeedTest();
      // Wait for tests to complete, then refresh
      await new Promise(r => setTimeout(r, 3000));
      await refresh();
    } catch (err) {
      console.error('Speed test failed:', err);
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="text-text-secondary">{t('common.loading')}</div>;

  const successCount = results.filter((r: any) => r.success).length;
  const successRate = results.length > 0 ? (successCount / results.length) * 100 : 0;
  const avgLatency =
    successCount > 0
      ? results.filter((r: any) => r.success).reduce((a: number, r: any) => a + r.latencyMs, 0) / successCount
      : 0;

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{t('settings.speedTest.title')}</h2>
          <p className="text-xs text-text-secondary">{t('settings.speedTest.desc')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={runTest} disabled={testing} className="btn btn-sm border border-border bg-white text-text-primary hover:bg-bg-secondary">
            {testing ? '测试中…' : '开始测速'}
          </button>
          <button onClick={refresh} className="btn btn-primary btn-sm">{t('settings.speedTest.refresh')}</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-2xl border border-border p-4 bg-white/80 backdrop-blur-xl">
          <p className="text-xs text-text-secondary mb-1">{t('settings.speedTest.statsTests')}</p>
          <p className="text-xl font-bold">{results.length}</p>
        </div>
        <div className="rounded-2xl border border-border p-4 bg-white/80 backdrop-blur-xl">
          <p className="text-xs text-text-secondary mb-1">{t('settings.speedTest.statsLatency')}</p>
          <p className="text-xl font-bold">{avgLatency.toFixed(0)} ms</p>
        </div>
        <div className="rounded-2xl border border-border p-4 bg-white/80 backdrop-blur-xl">
          <p className="text-xs text-text-secondary mb-1">{t('settings.speedTest.statsSuccess')}</p>
          <p className="text-xl font-bold">{successRate.toFixed(1)}%</p>
        </div>
      </div>

      {results.length === 0 && !testing && (
        <div className="rounded-2xl border border-border p-8 text-center bg-white/80 backdrop-blur-xl">
          <p className="text-sm text-text-tertiary">暂无测速数据，点击「开始测速」对已配置的供应商进行延迟测试</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="rounded-2xl border border-border overflow-hidden bg-white/80 backdrop-blur-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-secondary/50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary">供应商</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary">接口</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary">延迟</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary">状态</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary">时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {results.map((r: any) => {
                const p = providerMap.get(r.providerId);
                return (
                  <tr key={r.id} className="text-xs">
                    <td className="px-4 py-2 max-w-[120px] truncate font-medium">{p?.name ?? r.providerId.slice(0, 8)}</td>
                    <td className="px-4 py-2 max-w-[160px] truncate font-mono text-text-tertiary">
                      {p?.apiBase ? p.apiBase + '/v1/models' : r.modelId || '-'}
                    </td>
                    <td className="px-4 py-2 font-mono">{r.success ? r.latencyMs.toFixed(0) + ' ms' : '-'}</td>
                    <td className="px-4 py-2">
                      {r.success
                        ? <span className="text-success font-medium">正常</span>
                        : <span className="text-danger font-medium" title={r.errorMessage || ''}>超时/失败</span>
                      }
                    </td>
                    <td className="px-4 py-2 text-text-tertiary">{new Date(r.testedAt).toLocaleTimeString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Budget Section ── */

function BudgetSection() {
  const { status, loading, refresh } = useBudget();
  const { t } = useI18n();

  if (loading) return <div className="text-text-secondary">{t('common.loading')}</div>;

  const pct = status?.usagePct ?? 0;
  const barColor =
    pct >= 100 ? 'bg-danger' : pct >= (status?.thresholdPct ?? 80) ? 'bg-warning' : 'bg-success';

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{t('settings.budget.title')}</h2>
          <p className="text-xs text-text-secondary">{t('settings.budget.desc')}</p>
        </div>
        <button onClick={refresh} className="btn btn-primary btn-sm">{t('settings.budget.refresh')}</button>
      </div>

      {status ? (
        <>
          <div className="rounded-2xl border border-border p-4 bg-white/80 backdrop-blur-xl mb-4">
            <h3 className="text-sm font-semibold mb-4">{t('settings.budget.monthlyOverview')}{status.month}</h3>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div>
                <p className="text-xs text-text-secondary mb-1">{t('settings.budget.amountUsed')}</p>
                <p className="text-lg font-bold">${status.totalCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">{t('settings.budget.budgetLimit')}</p>
                <p className="text-lg font-bold">${status.limitAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">{t('settings.budget.usageRate')}</p>
                <p className={`text-lg font-bold ${pct >= 100 ? 'text-danger' : pct >= (status.thresholdPct ?? 80) ? 'text-warning' : ''}`}>
                  {pct.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-bg-secondary overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-border p-8 text-center bg-white/80 backdrop-blur-xl">
          <p className="text-sm text-text-tertiary">{t('settings.budget.noData')}</p>
        </div>
      )}
    </div>
  );
}

/* ── About Section ── */

function AboutSection() {
  const { t } = useI18n();
  const [version, setVersion] = useState('');
  const [systemSettings, setSystemSettings] = useState<{ websiteUrl: string; latestVersion: string; downloadUrl: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [updateResult, setUpdateResult] = useState<{ hasUpdate: boolean; latestVersion: string; downloadUrl: string; currentVersion: string; error: string } | null>(null);

  useEffect(() => {
    (window as any).electronAPI.getAppVersion?.().then((v: string) => setVersion(v || '0.1.0'));
    loadSystemSettings();
  }, []);

  async function loadSystemSettings() {
    try {
      const s = await (window as any).electronAPI.getSystemSettings();
      setSystemSettings(s);
    } catch {}
  }

  async function handleCheckUpdate() {
    setChecking(true);
    setUpdateResult(null);
    try {
      const result = await (window as any).electronAPI.checkForUpdates();
      setUpdateResult(result);
    } catch (err: any) {
      setUpdateResult({ hasUpdate: false, latestVersion: '', downloadUrl: '', currentVersion: version, error: err.message || '检查失败' });
    } finally {
      setChecking(false);
    }
  }

  const websiteUrl = systemSettings?.websiteUrl || 'https://cc-models.app';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight">{t('settings.about.title')}</h2>
        <p className="text-xs text-text-tertiary mt-0.5">{t('settings.about.desc')}</p>
      </div>

      {/* Version info */}
      <section className="rounded-2xl border border-border p-4 bg-white/80 backdrop-blur-xl">
        <h3 className="text-sm font-semibold mb-1">{t('settings.about.version')}</h3>
        <p className="text-xs text-text-secondary mb-2">{t('settings.about.currentVersion')}</p>
        <p className="text-lg font-bold font-mono">v{version || '0.1.0'}</p>
      </section>

      {/* Website link */}
      <section className="rounded-2xl border border-border p-4 bg-white/80 backdrop-blur-xl">
        <h3 className="text-sm font-semibold mb-1">{t('settings.about.website')}</h3>
        <p className="text-xs text-text-secondary mb-3">{t('settings.about.websiteDesc')}</p>
        <button
          onClick={() => (window as any).electronAPI.openExternal(websiteUrl)}
          className="text-sm text-accent hover:underline font-medium"
        >
          {websiteUrl}
        </button>
      </section>

      {/* Check for updates */}
      <section className="rounded-2xl border border-border p-4 bg-white/80 backdrop-blur-xl">
        <h3 className="text-sm font-semibold mb-1">{t('settings.about.update')}</h3>
        <p className="text-xs text-text-secondary mb-3">{t('settings.about.updateDesc')}</p>
        <button
          onClick={handleCheckUpdate}
          disabled={checking}
          className="btn btn-primary btn-sm"
        >
          {checking ? t('settings.about.checking') : t('settings.about.checkUpdate')}
        </button>

        {updateResult && (
          <div className="mt-3 p-3 rounded-lg border border-border bg-bg-secondary/30">
            {updateResult.error ? (
              <p className="text-sm text-danger">{t('settings.about.checkError')} {updateResult.error}</p>
            ) : updateResult.hasUpdate ? (
              <div>
                <p className="text-sm font-medium text-warning">
                  {t('settings.about.updateFound')} v{updateResult.latestVersion}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  {t('settings.about.currentVersion')} v{updateResult.currentVersion}
                </p>
                {updateResult.downloadUrl && (
                  <button
                    onClick={() => (window as any).electronAPI.openExternal(updateResult.downloadUrl)}
                    className="mt-2 text-sm text-accent hover:underline font-medium"
                  >
                    {t('settings.about.downloadLink')}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-success">{t('settings.about.upToDate')}</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
