import { useSettings } from '../hooks/useSettings';
import type { Theme, Locale } from '@ccswitch/shared';

export function Settings() {
  const { settings, update } = useSettings();

  if (!settings) return <div className="p-8 text-text-secondary">加载中...</div>;

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
    <div className="p-8 max-w-2xl">
      <h2 className="text-xl font-bold mb-6">设置</h2>

      <div className="space-y-6">
        <section>
          <h3 className="text-sm font-semibold mb-2">主题</h3>
          <p className="text-xs text-text-secondary mb-3">选择界面颜色主题</p>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => handleThemeChange(t)}
                className={`px-4 py-2 rounded-lg text-sm border ${
                  settings.theme === t ? 'border-accent bg-accent/10 text-accent' : 'border-border'
                }`}
              >
                {{ light: '☀️ 浅色', dark: '🌙 深色', system: '💻 跟随系统' }[t]}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold mb-2">语言</h3>
          <p className="text-xs text-text-secondary mb-3">界面显示语言</p>
          <div className="flex gap-2">
            {(['zh-CN', 'en-US'] as Locale[]).map((l) => (
              <button
                key={l}
                onClick={() => update({ locale: l })}
                className={`px-4 py-2 rounded-lg text-sm border ${
                  settings.locale === l ? 'border-accent bg-accent/10 text-accent' : 'border-border'
                }`}
              >
                {{ 'zh-CN': '中文', 'en-US': 'English' }[l]}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold mb-2">自动配置 CLI</h3>
          <p className="text-xs text-text-secondary mb-3">自动修改 CLI 工具配置指向本地代理</p>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.autoConfigCli}
              onChange={(e) => update({ autoConfigCli: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">启用自动配置</span>
          </label>
        </section>

        <section>
          <h3 className="text-sm font-semibold mb-2">轻量模式</h3>
          <p className="text-xs text-text-secondary mb-3">仅系统托盘运行，不显示主窗口</p>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.lightweightMode}
              onChange={(e) => update({ lightweightMode: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">启用轻量模式</span>
          </label>
        </section>
      </div>
    </div>
  );
}
