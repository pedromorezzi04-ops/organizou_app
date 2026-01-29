import { Clock, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const Pending = () => {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-amber-500/10 rounded-full flex items-center justify-center">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Aguardando Aprovação
          </h1>
          <p className="text-muted-foreground">
            Sua conta foi criada com sucesso! Aguarde a aprovação do administrador para ter acesso ao sistema.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          <p>
            Você receberá acesso assim que sua conta for liberada. 
            Tente fazer login novamente mais tarde.
          </p>
        </div>

        <Button variant="outline" onClick={handleSignOut} className="gap-2">
          <LogOut className="w-4 h-4" />
          Sair e tentar novamente
        </Button>
      </div>
    </div>
  );
};

export default Pending;
