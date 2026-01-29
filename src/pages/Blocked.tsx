import { useEffect } from 'react';
import { ShieldX, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const Blocked = () => {
  const { signOut } = useAuth();

  useEffect(() => {
    // Clear any cached data
    localStorage.removeItem('sb-lvbxrfxfhrgsleuuemcb-auth-token');
  }, []);

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/auth';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
            <ShieldX className="w-10 h-10 text-destructive" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Conta Bloqueada
          </h1>
          <p className="text-muted-foreground">
            Sua conta foi temporariamente suspensa. Entre em contato com o administrador para mais informações.
          </p>
        </div>

        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm text-destructive">
            Você não pode acessar o sistema enquanto sua conta estiver bloqueada.
          </p>
        </div>

        <Button 
          onClick={handleLogout} 
          variant="outline" 
          className="w-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair da Conta
        </Button>
      </div>
    </div>
  );
};

export default Blocked;
