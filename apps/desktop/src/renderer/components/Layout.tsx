import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../hooks/useI18n';
import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  Claude,
  Codex,
  Gemini,
  OpenCode,
  OpenClaw,
  HermesAgent,
} from '@lobehub/icons';

interface ToolInfo {
  name: string;
  displayName: string;
  apiType: 'openai' | 'anthropic' | 'google';
  icon: ReactNode;
}

const CLI_TOOLS: ToolInfo[] = [
  { name: 'claude-code', displayName: 'Claude Code', apiType: 'anthropic', icon: <Claude size={28} style={{ color: '#D97757' }} /> },
  { name: 'codex', displayName: 'Codex', apiType: 'openai', icon: <Codex size={28} style={{ color: '#3941FF' }} /> },
  { name: 'gemini-cli', displayName: 'Gemini CLI', apiType: 'google', icon: <Gemini size={28} style={{ color: '#3186FF' }} /> },
  { name: 'opencode', displayName: 'OpenCode', apiType: 'openai', icon: <OpenCode size={28} style={{ color: '#000000' }} /> },
  { name: 'openclaw', displayName: 'OpenClaw', apiType: 'openai', icon: <OpenClaw size={28} style={{ color: '#DC2626' }} /> },
  { name: 'hermes', displayName: 'Hermes Agent', apiType: 'openai', icon: <HermesAgent size={28} style={{ color: '#0891B2' }} /> },
];

interface ToolContextType {
  selectedTool: string;
  setSelectedTool: (tool: string) => void;
  tools: ToolInfo[];
  getToolInfo: (name: string) => ToolInfo | undefined;
}

const ToolContext = createContext<ToolContextType>(null!);
export const useToolContext = () => useContext(ToolContext);

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedTool, setSelectedTool] = useState('claude-code');
  const { t } = useI18n();
  const isMainPage = location.pathname === '/';

  const getToolInfo = (name: string) => CLI_TOOLS.find((t) => t.name === name);

  return (
    <ToolContext.Provider value={{ selectedTool, setSelectedTool, tools: CLI_TOOLS, getToolInfo }}>
      <div className="h-screen flex flex-col bg-bg-primary">
        {/* Header bar — drag region */}
        <header className="flex items-center justify-between px-3 h-10 border-b border-border bg-white/80 backdrop-blur-xl shrink-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="CC Models" className="w-6 h-6 rounded-md" />
              <img src="/text.png" alt="CC Models" className="h-3 w-auto" />
            </div>
          </div>

          {/* Nav icons + window controls */}
          <div className="flex items-center gap-0.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            {!isMainPage && (
              <button
                onClick={() => navigate('/')}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-text-tertiary hover:text-text-primary hover:bg-black/5 transition-colors"
                title={t('layout.back')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <NavIconButton
              label={t('nav.dashboard')}
              active={location.pathname === '/dashboard'}
              onClick={() => navigate('/dashboard')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
              </svg>
            </NavIconButton>
            <NavIconButton
              label={t('nav.sessions')}
              active={location.pathname.startsWith('/sessions')}
              onClick={() => navigate('/sessions')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </NavIconButton>
            <NavIconButton
              label={t('nav.settings')}
              active={location.pathname === '/settings'}
              onClick={() => navigate('/settings')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </NavIconButton>

            {/* Separator */}
            <div className="w-px h-5 mx-0.5 bg-border" />

            <button
              onClick={() => (window as any).electronAPI.minimizeWindow()}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-text-tertiary hover:text-text-primary hover:bg-black/5 transition-colors"
              title={t('layout.minimize')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              onClick={() => (window as any).electronAPI.closeWindow()}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-text-tertiary hover:text-red-500 hover:bg-red-50 transition-colors"
              title={t('layout.close')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            </button>
          </div>
        </header>

        {/* Tool sidebar — vertical icon list on the left */}
        <div className="flex-1 flex min-h-0">
          {isMainPage && (
            <aside className="flex flex-col items-center gap-3 pt-[25px] px-2 border-r border-border bg-bg-secondary/20 shrink-0">
              {CLI_TOOLS.map((tool) => (
                <button
                  key={tool.name}
                  onClick={() => setSelectedTool(tool.name)}
                  title={tool.displayName}
                  className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                    selectedTool === tool.name
                      ? 'bg-white shadow-sm ring-1 ring-black/10 scale-105'
                      : 'text-text-tertiary hover:text-text-primary hover:bg-black/5'
                  }`}
                >
                  {tool.icon}
                  {/* Active indicator dot */}
                  {selectedTool === tool.name && (
                    <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent" />
                  )}
                </button>
              ))}
            </aside>
          )}

          {/* Content area */}
          <main className="flex-1 overflow-auto pt-[25px] pb-4 pl-6 pr-4">
            <Outlet />
          </main>
        </div>
      </div>
    </ToolContext.Provider>
  );
}

function NavIconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
        active
          ? 'bg-accent/10 text-accent'
          : 'text-text-tertiary hover:text-text-primary hover:bg-black/5'
      }`}
    >
      {children}
    </button>
  );
}
