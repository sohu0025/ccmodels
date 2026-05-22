import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
  onLogout?: () => void;
}

export function Layout({ children, onLogout }: LayoutProps) {
  return (
    <div className="flex h-screen bg-bg-primary gap-x-5">
      <Sidebar onLogout={onLogout} />
      <main className="flex-1 overflow-auto pr-5 py-6">{children}</main>
    </div>
  );
}
