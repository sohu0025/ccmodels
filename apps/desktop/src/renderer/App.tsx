import { HashRouter } from 'react-router-dom';
import { AppRouter } from './router';

export function App() {
  return (
    <HashRouter>
      <AppRouter />
    </HashRouter>
  );
}
