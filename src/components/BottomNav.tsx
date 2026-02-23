import { useLocation, useNavigate } from 'react-router-dom';
import { Home, TrendingUp, TrendingDown, FileText, Settings, BarChart3, Table, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Início' },
  { path: '/entradas', icon: TrendingUp, label: 'Entradas' },
  { path: '/saidas', icon: TrendingDown, label: 'Saídas' },
  { path: '/notinhas', icon: FileText, label: 'Notinhas' },
  { path: '/graficos', icon: BarChart3, label: 'Gráficos' },
  { path: '/tabelas', icon: Table, label: 'Tabelas' },
  { path: '/impostos', icon: Receipt, label: 'Impostos' },
  { path: '/config', icon: Settings, label: 'Config' },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-strong border-t safe-area-pb z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5 mb-1", isActive && "text-primary")} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
