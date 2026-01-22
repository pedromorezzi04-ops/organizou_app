import { useState, useEffect } from 'react';
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Receipt, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatMonthShort = (date: Date) => {
  return format(date, 'MMM/yy', { locale: ptBR });
};

interface TaxConfig {
  tax_type: 'mei' | 'me' | null;
  tax_fixed_value: number;
  tax_percentage: number;
}

interface TaxPayment {
  id: string;
  reference_month: string;
  amount: number;
  status: string;
  paid_at: string | null;
}

const Impostos = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Configuration state
  const [taxType, setTaxType] = useState<'mei' | 'me' | null>(null);
  const [fixedValue, setFixedValue] = useState('');
  const [percentage, setPercentage] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  // Fetch user's tax configuration
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile-tax-config', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      // Extract tax config from profile (new columns may not be in types yet)
      const profileData = data as Record<string, unknown> | null;
      if (!profileData) return null;
      
      return {
        tax_type: (profileData.tax_type as 'mei' | 'me' | null) || null,
        tax_fixed_value: Number(profileData.tax_fixed_value) || 0,
        tax_percentage: Number(profileData.tax_percentage) || 0
      } as TaxConfig;
    },
    enabled: !!user
  });

  // Fetch monthly income for ME calculation
  const currentMonth = startOfMonth(new Date());
  const { data: monthlyIncome = 0 } = useQuery({
    queryKey: ['monthly-income', user?.id, currentMonth.toISOString()],
    queryFn: async () => {
      if (!user) return 0;
      const startDate = format(currentMonth, 'yyyy-MM-dd');
      const endDate = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'income')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59');
      
      if (error) throw error;
      return data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    },
    enabled: !!user
  });

  // Fetch tax payments history using direct fetch
  const { data: taxPayments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['tax-payments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/tax_payments?user_id=eq.${user.id}&order=reference_month.desc`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${session.data.session?.access_token}`
          }
        }
      );
      
      if (response.ok) {
        return await response.json() as TaxPayment[];
      }
      return [];
    },
    enabled: !!user
  });

  // Initialize form state from profile
  useEffect(() => {
    if (profile) {
      setTaxType(profile.tax_type);
      setFixedValue(profile.tax_fixed_value?.toString() || '');
      setPercentage(profile.tax_percentage?.toString() || '');
    }
  }, [profile]);

  const isConfigured = profile?.tax_type != null;

  // Calculate estimated tax
  const calculateEstimatedTax = () => {
    if (!profile?.tax_type) return 0;
    if (profile.tax_type === 'mei') {
      return Number(profile.tax_fixed_value) || 0;
    }
    // ME: percentage of monthly income
    return (monthlyIncome * (Number(profile.tax_percentage) || 0)) / 100;
  };

  const estimatedTax = calculateEstimatedTax();

  // Get current month payment status
  const currentMonthPayment = taxPayments.find(
    p => p.reference_month === format(currentMonth, 'yyyy-MM-dd')
  );
  const isPaid = currentMonthPayment?.status === 'paid';

  const saveConfiguration = async () => {
    if (!user || !taxType) return;
    
    setIsSavingConfig(true);
    try {
      // Use raw update to handle new columns
      const updates: Record<string, unknown> = {
        tax_type: taxType,
        tax_fixed_value: taxType === 'mei' ? parseFloat(fixedValue) || 0 : 0,
        tax_percentage: taxType === 'me' ? parseFloat(percentage) || 0 : 0
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates as never)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Configuração salva!',
        description: 'Seu perfil tributário foi configurado com sucesso.'
      });

      queryClient.invalidateQueries({ queryKey: ['profile-tax-config'] });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a configuração.',
        variant: 'destructive'
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const markAsPaid = async () => {
    if (!user) return;
    
    setIsMarkingPaid(true);
    try {
      const referenceMonth = format(currentMonth, 'yyyy-MM-dd');
      const amount = estimatedTax;

      // Check for existing payment using fetch
      const session = await supabase.auth.getSession();
      const headers = {
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${session.data.session?.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      };

      const checkResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/tax_payments?user_id=eq.${user.id}&reference_month=eq.${referenceMonth}`,
        { headers }
      );
      const existingPayments = await checkResponse.json();

      if (existingPayments && existingPayments.length > 0) {
        // Update existing
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/tax_payments?id=eq.${existingPayments[0].id}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              status: 'paid',
              paid_at: new Date().toISOString(),
              amount
            })
          }
        );
      } else {
        // Insert new
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/tax_payments`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              user_id: user.id,
              reference_month: referenceMonth,
              amount,
              status: 'paid',
              paid_at: new Date().toISOString()
            })
          }
        );
      }

      // Create automatic expense in transactions
      const monthName = format(currentMonth, 'MMMM/yyyy', { locale: ptBR });
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'expense',
          description: `Pagamento DAS ${monthName}`,
          amount,
          category: 'Impostos',
          status: 'paid'
        });

      toast({
        title: 'DAS marcado como pago!',
        description: 'Uma despesa foi lançada automaticamente em Saídas.'
      });

      queryClient.invalidateQueries({ queryKey: ['tax-payments'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao registrar pagamento',
        description: 'Não foi possível marcar como pago.',
        variant: 'destructive'
      });
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const undoPayment = async () => {
    if (!user || !currentMonthPayment) return;
    
    setIsMarkingPaid(true);
    try {
      const session = await supabase.auth.getSession();
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/tax_payments?id=eq.${currentMonthPayment.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'pending', paid_at: null })
        }
      );

      toast({
        title: 'Status atualizado',
        description: 'O pagamento foi marcado como pendente novamente.'
      });

      queryClient.invalidateQueries({ queryKey: ['tax-payments'] });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível desfazer o pagamento.',
        variant: 'destructive'
      });
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const isLoading = isLoadingProfile || isLoadingPayments;

  // Configuration Screen (Onboarding)
  if (!isLoading && !isConfigured) {
    return (
      <Layout title="Impostos">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Receipt className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Configuração Inicial</CardTitle>
                  <CardDescription>Como você paga seu imposto mensal (DAS)?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={taxType || ''}
                onValueChange={(value) => setTaxType(value as 'mei' | 'me')}
              >
                <div className="space-y-4">
                  <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="mei" id="mei" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="mei" className="text-base font-medium cursor-pointer">
                        Sou MEI (Valor Fixo)
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pago um valor fixo mensal de DAS
                      </p>
                      {taxType === 'mei' && (
                        <div className="mt-4">
                          <Label htmlFor="fixed-value" className="text-sm">
                            Qual o valor fixo do seu DAS?
                          </Label>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-muted-foreground">R$</span>
                            <Input
                              id="fixed-value"
                              type="number"
                              placeholder="75,90"
                              value={fixedValue}
                              onChange={(e) => setFixedValue(e.target.value)}
                              className="max-w-[150px]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="me" id="me" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="me" className="text-base font-medium cursor-pointer">
                        Sou ME / Outro (Porcentagem sobre Vendas)
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pago uma porcentagem sobre o faturamento
                      </p>
                      {taxType === 'me' && (
                        <div className="mt-4">
                          <Label htmlFor="percentage" className="text-sm">
                            Qual sua alíquota aproximada?
                          </Label>
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              id="percentage"
                              type="number"
                              placeholder="6"
                              value={percentage}
                              onChange={(e) => setPercentage(e.target.value)}
                              className="max-w-[100px]"
                            />
                            <span className="text-muted-foreground">%</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Aplicaremos essa % sobre suas "Entradas" do mês para estimar o imposto.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </RadioGroup>

              <Button 
                onClick={saveConfiguration} 
                disabled={!taxType || isSavingConfig || (taxType === 'mei' && !fixedValue) || (taxType === 'me' && !percentage)}
                className="w-full"
              >
                {isSavingConfig ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Configuração'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Main Taxes Screen
  return (
    <Layout title="Impostos">
      <div className="space-y-6">
        {/* Current Month Card */}
        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-xl" />
        ) : (
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <Receipt className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold capitalize">
                    DAS de {format(currentMonth, 'MMMM', { locale: ptBR })}
                  </h2>
                </div>

                <div className="text-4xl font-bold text-foreground">
                  {formatCurrency(estimatedTax)}
                </div>

                {profile?.tax_type === 'me' && (
                  <p className="text-sm text-muted-foreground">
                    {profile.tax_percentage}% sobre {formatCurrency(monthlyIncome)} de entradas
                  </p>
                )}

                <div className="flex justify-center">
                  {isPaid ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Pago
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                      <Clock className="w-3 h-3 mr-1" />
                      Pendente
                    </Badge>
                  )}
                </div>

                <div className="pt-2">
                  {isPaid ? (
                    <Button 
                      variant="outline" 
                      onClick={undoPayment}
                      disabled={isMarkingPaid}
                      className="w-full"
                    >
                      {isMarkingPaid ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                      )}
                      Pago - Clique para desfazer
                    </Button>
                  ) : (
                    <Button 
                      onClick={markAsPaid}
                      disabled={isMarkingPaid || estimatedTax === 0}
                      className="w-full"
                    >
                      {isMarkingPaid ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Registrando...
                        </>
                      ) : (
                        'Marcar como Pago'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* History Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground px-1">Histórico</h3>
          
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : taxPayments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum pagamento registrado ainda</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {taxPayments
                .filter(p => p.reference_month !== format(currentMonth, 'yyyy-MM-dd'))
                .map((payment) => (
                  <Card key={payment.id} className="overflow-hidden">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {payment.status === 'paid' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-600" />
                          )}
                          <span className="font-medium capitalize">
                            {formatMonthShort(new Date(payment.reference_month + 'T12:00:00'))}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">
                            {formatCurrency(Number(payment.amount))}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={payment.status === 'paid' 
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs' 
                              : 'bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs'
                            }
                          >
                            {payment.status === 'paid' ? 'Pago' : 'Pendente'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Impostos;
