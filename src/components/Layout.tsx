import { useState, ReactNode } from 'react';
import { Search } from 'lucide-react';
import BottomNav from './BottomNav';
import GlobalSearch from './GlobalSearch';
import logo from '@/assets/logo.png';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const Layout = ({ children, title, subtitle }: LayoutProps) => {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 glass-strong border-b">
        <div className="container max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <img src={logo} alt="Organizou+" className="h-10 w-auto object-contain" />
          <button
            onClick={() => setSearchOpen(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Buscar"
          >
            <Search className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>
      <main className="container max-w-lg mx-auto px-4 py-4">
        {children}
      </main>
      <BottomNav />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
};

export default Layout;
