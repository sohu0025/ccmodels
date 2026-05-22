import { HashRouter } from 'react-router-dom';
import { AppRouter } from './router';
import { SettingsProvider } from './hooks/useSettings';
import { I18nProvider } from './hooks/useI18n';
import { AdPopup } from './components/AdPopup';
import { AdCorner } from './components/AdCorner';

export function App() {
  return (
    <HashRouter>
      <SettingsProvider>
        <I18nProvider>
          <AdPopup />
          <AppRouter />
          <AdCorner />
        </I18nProvider>
      </SettingsProvider>
    </HashRouter>
  );
}
