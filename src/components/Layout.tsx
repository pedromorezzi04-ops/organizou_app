import { ReactNode } from 'react';
import BottomNav from './BottomNav';
import logo from '@/assets/logo.png';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const Layout = ({ children, title, subtitle }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container max-w-lg mx-auto px-4 h-20 flex items-center justify-center">
          <img src={logo} alt="Organizou+" className="h-16 w-auto object-contain" />
        </div>
      </header>
      <main className="container max-w-lg mx-auto px-4 py-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;
