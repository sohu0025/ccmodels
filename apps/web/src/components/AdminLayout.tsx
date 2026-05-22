import { ReactNode } from 'react';
import { Layout } from './Layout';

interface AdminLayoutProps {
  children: ReactNode;
  onLogout?: () => void;
}

export function AdminLayout({ children, onLogout }: AdminLayoutProps) {
  return <Layout onLogout={onLogout}>{children}</Layout>;
}
