import { useState, useEffect } from 'react';
import { useProviders } from '../hooks/useProviders';
import { useI18n } from '../hooks/useI18n';

const api = (window as any).electronAPI;

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  'claude-code': 'Claude Code',
  codex: 'Codex',
  'gemini-cli': 'Gemini CLI',
  opencode: 'OpenCode',
  openclaw: 'OpenClaw',
  hermes: 'Hermes Agent',
};

interface ProviderToolInfo {
  toolName: string;
  isActive: boolean;
}

interface ProviderWithTools {
  id: string;
  name: string;
  apiBase: string;
  type: string;
  isActive: boolean;
  models: string[];
  tools: ProviderToolInfo[];
}

export function Dashboard() {
  const { providers } = useProviders();
  const { t } = useI18n();
  const [proxyStatus, setProxyStatus] = useState({ running: false, port: 15721, requests: 0, todayRequests: 0, todayTokens: 0 });
  const [providerTools, setProviderTools] = useState<ProviderWithTools[]>([]);

  const activeProvider = providers.find((p) => p.isActive)
    ?? providerTools.find((p) => p.tools.some((t) => t.isActive))
    ?? null;

  useEffect(() => {
    const load = async () => {
      const [status, mapping] = await Promise.all([
        api.getProxyStatus(),
        api.getProviderToolMapping(),
      ]);
      setProxyStatus(status);
      setProviderTools(mapping || []);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="stat-label">{t('dashboard.proxyStatus')}</p>
          <div className="flex items-center gap-2">
            <span className={`indicator ${proxyStatus.running ? 'indicator-success' : 'indicator-danger'}`} />
            <p className="stat-value">{proxyStatus.running ? t('dashboard.running') : t('dashboard.stopped')}</p>
          </div>
          <p className="text-xs text-text-tertiary mt-1">{t('dashboard.port', { port: proxyStatus.port })}</p>
        </div>

        <div className="stat-card">
          <p className="stat-label">{t('dashboard.currentProvider')}</p>
          <p className="stat-value">{activeProvider?.name ?? '—'}</p>
          <p className="text-xs text-text-tertiary mt-1 truncate">{activeProvider?.apiBase ?? t('dashboard.notConfigured')}</p>
        </div>

        <div className="stat-card">
          <p className="stat-label">{t('dashboard.todayRequests')}</p>
          <p className="stat-value">{proxyStatus.todayRequests.toLocaleString()}</p>
          <p className="text-xs text-text-tertiary mt-1">{t('dashboard.total', { count: proxyStatus.requests })}</p>
        </div>

        <div className="stat-card">
          <p className="stat-label">今日消耗 Tokens</p>
          <p className="stat-value">{
            proxyStatus.todayTokens >= 1_000_000
              ? (proxyStatus.todayTokens / 1_000_000).toFixed(1) + 'M'
              : proxyStatus.todayTokens >= 1000
                ? (proxyStatus.todayTokens / 1000).toFixed(1) + 'K'
                : proxyStatus.todayTokens.toLocaleString()
          }</p>
          <p className="text-xs text-text-tertiary mt-1">{proxyStatus.todayTokens.toLocaleString()} Tokens</p>
        </div>
      </div>

      <div className="card card-bordered p-4">
        <h3 className="text-base font-semibold mb-4">{t('dashboard.configuredProviders')}</h3>
        {providers.length === 0 ? (
          <p className="text-sm text-text-secondary">{t('dashboard.empty')}</p>
        ) : (
          <div className="divide-y divide-border">
            {providerTools.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{p.name}</span>
                    {p.tools.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {p.tools.map((tool) => (
                          <span
                            key={tool.toolName}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              tool.isActive
                                ? 'bg-accent/10 text-accent'
                                : 'bg-bg-secondary text-text-tertiary'
                            }`}
                          >
                            {TOOL_DISPLAY_NAMES[tool.toolName] || tool.toolName}
                            {tool.isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-text-tertiary mt-0.5 truncate">{p.apiBase}</p>
                </div>
                {(p.isActive || p.tools.some((t) => t.isActive)) && (
                  <span className="badge badge-success shrink-0 ml-3">{t('dashboard.current')}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
