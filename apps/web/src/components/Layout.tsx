import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
  onLogout?: () => void;
}

export function Layout({ children, onLogout }: LayoutProps) {
  return (
    <div className="flex h-screen bg-bg-primary">
      <Sidebar onLogout={onLogout} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
