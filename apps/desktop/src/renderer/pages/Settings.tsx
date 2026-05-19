import { useSettings } from '../hooks/useSettings';
import type { Theme, Locale } from '@ccswitch/shared';

export function Settings() {
  const { settings, update } = useSettings();

  if (!settings) return <div className="text-text-secondary">加载中...</div>;

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

  const ToggleOption = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      <div
        className={`w-10 h-6 rounded-full cursor-pointer transition-colors relative ${checked ? 'bg-accent' : 'bg-text-tertiary'}`}
        onClick={() => onChange(!checked)}
      >
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
    </label>
  );

  return (
    <div className="max-w-xl space-y-5">
      <section className="card p-5">
        <h3 className="text-base font-semibold mb-1">主题</h3>
        <p className="text-xs text-text-secondary mb-4">选择界面颜色主题</p>
        <div className="flex gap-3">
          {([
            { key: 'light' as Theme, label: '☀️ 浅色' },
            { key: 'dark' as Theme, label: '🌙 深色' },
            { key: 'system' as Theme, label: '💻 跟随系统' },
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

      <section className="card p-5">
        <h3 className="text-base font-semibold mb-1">语言</h3>
        <p className="text-xs text-text-secondary mb-4">界面显示语言</p>
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

      <section className="card p-5">
        <h3 className="text-base font-semibold mb-3">自动配置 CLI</h3>
        <p className="text-xs text-text-secondary mb-4">自动修改 CLI 工具配置指向本地代理</p>
        <ToggleOption label="启用自动配置" checked={settings.autoConfigCli} onChange={(v) => update({ autoConfigCli: v })} />
      </section>

      <section className="card p-5">
        <h3 className="text-base font-semibold mb-3">轻量模式</h3>
        <p className="text-xs text-text-secondary mb-4">仅系统托盘运行，不显示主窗口</p>
        <ToggleOption label="启用轻量模式" checked={settings.lightweightMode} onChange={(v) => update({ lightweightMode: v })} />
      </section>
    </div>
  );
}
