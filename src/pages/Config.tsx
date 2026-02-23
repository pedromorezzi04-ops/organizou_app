import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Upload, LogOut, Download, Shield, Lock } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAllTransactions, useAllInstallments, useRecurringExpenses } from '@/hooks/useFinancialData';

const Config = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminCheck();
  const { canExport, state: subState, trialDaysLeft } = useSubscription();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#10B981');
  
  const { data: transactions } = useAllTransactions();
  const { data: installments } = useAllInstallments();
  const { data: recurringExpenses } = useRecurringExpenses();

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (data) {
      setBusinessName(data.business_name || '');
      setPrimaryColor(data.primary_color || '#10B981');
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        business_name: businessName,
        primary_color: primaryColor,
      })
      .eq('user_id', user.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Salvo!",
        description: "Suas configurações foram atualizadas.",
      });
    }
  };

  const exportData = () => {
    const data = {
      transactions: transactions || [],
      installments: installments || [],
      recurringExpenses: recurringExpenses || [],
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financeiro-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Dados exportados!",
      description: "O arquivo foi baixado para seu dispositivo.",
    });
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Layout title="Configurações">
      <div className="space-y-6">
        {/* Perfil do negócio */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Meu Negócio</h2>
          
          <div className="space-y-2">
            <Label htmlFor="businessName">Nome do negócio</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ex: Loja da Maria"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryColor">Cor principal</Label>
            <div className="flex gap-2">
              <Input
                id="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <Button onClick={saveProfile} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
          </Button>
        </div>

        {/* Exportar dados */}
        <div className="space-y-4 pt-4 border-t">
          <h2 className="text-lg font-semibold">Dados</h2>
          {canExport ? (
            <Button variant="outline" onClick={exportData} className="w-full gap-2">
              <Download className="w-4 h-4" />
              Exportar todos os dados
            </Button>
          ) : (
            <div className="space-y-2">
              <Button variant="outline" disabled className="w-full gap-2 opacity-50">
                <Lock className="w-4 h-4" />
                Exportar todos os dados
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Disponível apenas para assinantes
              </p>
            </div>
          )}
        </div>

        {/* Conta */}
        <div className="space-y-4 pt-4 border-t">
          <h2 className="text-lg font-semibold">Conta</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <Button variant="destructive" onClick={handleSignOut} className="w-full gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>

        {/* Painel Admin - apenas para admins */}
        {isAdmin && (
          <div className="space-y-4 pt-4 border-t">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Administração
            </h2>
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin-secret-dashboard')} 
              className="w-full gap-2"
            >
              <Shield className="w-4 h-4" />
              Gerenciar Usuários
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Config;
