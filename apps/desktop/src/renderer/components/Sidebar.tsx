import { NavLink } from 'react-router-dom';
import { useI18n } from '../hooks/useI18n';

export function Sidebar() {
  const { t } = useI18n();

  const navItems = [
    { to: '/', label: t('nav.dashboard'), icon: '◉' },
    { to: '/usage', label: t('nav.usage'), icon: '◎' },
    { to: '/sessions', label: t('nav.sessions'), icon: '🕐' },
    { to: '/speed-test', label: t('nav.speedTest'), icon: '⚡' },
    { to: '/mcp', label: t('nav.mcp'), icon: '⬡' },
    { to: '/skills', label: t('nav.skills'), icon: '✦' },
    { to: '/prompts', label: t('nav.prompts'), icon: '◐' },
    { to: '/compare', label: t('nav.compare'), icon: '⚖' },
    { to: '/recommendations', label: t('nav.recommendations'), icon: '✧' },
    { to: '/budget', label: t('nav.budget'), icon: '◔' },
    { to: '/providers', label: t('nav.providers'), icon: '⬢' },
    { to: '/ads', label: '广告管理', icon: '📢' },
    { to: '/settings', label: t('nav.settings'), icon: '⚙' },
  ];
  return (
    <aside className="sidebar">
      <div className="px-5 py-6">
        <div className="flex items-center gap-2.5">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="CC Models" className="w-7 h-7 rounded-lg" />
          <div>
            <img src={`${import.meta.env.BASE_URL}text.png`} alt="CC Models" className="h-3.5 w-auto" />
            <p className="text-xs text-text-tertiary leading-none">{t('sidebar.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center min-h-0">
        <div className="px-5 pb-3 text-xs font-semibold text-text-secondary uppercase tracking-widest">
          {t('sidebar.navigation')}
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 mx-2 my-[16px] px-3 py-[7px] text-sm rounded-lg cursor-pointer no-underline transition-colors duration-100 hover:bg-border ${
                isActive ? 'bg-accent text-white font-medium' : 'text-text-primary'
              }`
            }
          >
            <span className="text-sm w-4 text-center">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="px-5 py-4 border-t border-border">
        <p className="text-xs text-text-tertiary">v0.1.0</p>
      </div>
    </aside>
  );
}
