import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Usage } from './pages/Usage';
import { Sessions } from './pages/Sessions';
import { SessionDetail } from './pages/SessionDetail';
import { SpeedTest } from './pages/SpeedTest';
import { Budget } from './pages/Budget';
import { Providers } from './pages/Providers';
import { ProviderDetail } from './pages/ProviderDetail';
import { Mcp } from './pages/Mcp';
import { Skills } from './pages/Skills';
import { Prompts } from './pages/Prompts';
import { Compare } from './pages/Compare';
import { Settings } from './pages/Settings';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/usage" element={<Usage />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/sessions/:id" element={<SessionDetail />} />
        <Route path="/speed-test" element={<SpeedTest />} />
        <Route path="/mcp" element={<Mcp />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/prompts" element={<Prompts />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/providers" element={<Providers />} />
        <Route path="/providers/:id" element={<ProviderDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
