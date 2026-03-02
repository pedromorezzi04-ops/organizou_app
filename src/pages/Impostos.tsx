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
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatMonthShort = (date: Date) => format(date, 'MMM/yy', { locale: ptBR });

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

/* Circular Progress Ring */
const ProgressRing = ({ progress, paid }: { progress: number; paid: boolean }) => {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width="128" height="128" viewBox="0 0 128 128" className="drop-shadow-lg">
      {/* Background ring */}
      <circle
        cx="64" cy="64" r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth="8"
      />
      {/* Progress ring */}
      <circle
        cx="64" cy="64" r={radius}
        fill="none"
        stroke={paid ? "hsl(var(--emerald))" : "hsl(var(--amber))"}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
      />
      {/* Center icon */}
      <foreignObject x="36" y="36" width="56" height="56">
        <div className="w-full h-full flex items-center justify-center">
          {paid ? (
            <CheckCircle2 className="w-8 h-8 text-emerald" />
          ) : (
            <Clock className="w-8 h-8 text-amber" />
          )}
        </div>
      </foreignObject>
    </svg>
  );
};

const Impostos = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [taxType, setTaxType] = useState<'mei' | 'me' | null>(null);
  const [fixedValue, setFixedValue] = useState('');
  const [percentage, setPercentage] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [editablePercentage, setEditablePercentage] = useState('');

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
      if (response.ok) return await response.json() as TaxPayment[];
      return [];
    },
    enabled: !!user
  });

  useEffect(() => {
    if (profile) {
      setTaxType(profile.tax_type);
      setFixedValue(profile.tax_fixed_value?.toString() || '');
      setPercentage(profile.tax_percentage?.toString() || '');
      setEditablePercentage(profile.tax_percentage?.toString() || '');
    }
  }, [profile]);

  const isConfigured = profile?.tax_type != null;

  const calculateEstimatedTax = () => {
    if (!profile?.tax_type) return 0;
    if (profile.tax_type === 'mei') return Number(profile.tax_fixed_value) || 0;
    const percentageValue = parseFloat(editablePercentage) || Number(profile.tax_percentage) || 0;
    return (monthlyIncome * percentageValue) / 100;
  };

  const estimatedTax = calculateEstimatedTax();
  const currentPercentage = parseFloat(editablePercentage) || Number(profile?.tax_percentage) || 0;

  const currentMonthPayment = taxPayments.find(
    p => p.reference_month === format(currentMonth, 'yyyy-MM-dd')
  );
  const isPaid = currentMonthPayment?.status === 'paid';

  const saveConfiguration = async () => {
    if (!user || !taxType) return;
    setIsSavingConfig(true);
    try {
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
      toast({ title: 'Configuração salva!', description: 'Seu perfil tributário foi configurado com sucesso.' });
      queryClient.invalidateQueries({ queryKey: ['profile-tax-config'] });
    } catch {
      toast({ title: 'Erro ao salvar', description: 'Não foi possível salvar a configuração.', variant: 'destructive' });
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
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/tax_payments?id=eq.${existingPayments[0].id}`,
          { method: 'PATCH', headers, body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString(), amount }) }
        );
      } else {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/tax_payments`,
          { method: 'POST', headers, body: JSON.stringify({ user_id: user.id, reference_month: referenceMonth, amount, status: 'paid', paid_at: new Date().toISOString() }) }
        );
      }
      const monthName = format(currentMonth, 'MMMM/yyyy', { locale: ptBR });
      await supabase.from('transactions').insert({
        user_id: user.id, type: 'expense', description: `Pagamento DAS ${monthName}`,
        amount, category: 'Impostos', status: 'paid'
      });
      toast({ title: 'DAS marcado como pago!', description: 'Uma despesa foi lançada automaticamente em Saídas.' });
      queryClient.invalidateQueries({ queryKey: ['tax-payments'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao registrar pagamento', description: 'Não foi possível marcar como pago.', variant: 'destructive' });
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
      toast({ title: 'Status atualizado', description: 'O pagamento foi marcado como pendente novamente.' });
      queryClient.invalidateQueries({ queryKey: ['tax-payments'] });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível desfazer o pagamento.', variant: 'destructive' });
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const isLoading = isLoadingProfile || isLoadingPayments;

  // Onboarding config screen
  if (!isLoading && !isConfigured) {
    return (
      <Layout title="Impostos">
        <div className="space-y-6 animate-fade-in">
          <Card className="glass-strong shadow-card border-border/50 lg:max-w-2xl lg:mx-auto">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald to-emerald/60 shadow-card">
                  <Receipt className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Configuração Inicial</CardTitle>
                  <CardDescription>Como você paga seu imposto mensal (DAS)?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={taxType || ''} onValueChange={(v) => setTaxType(v as 'mei' | 'me')}>
                <div className="space-y-4">
                  <div className={cn(
                    "flex items-start space-x-3 p-4 rounded-xl border transition-all duration-200",
                    "hover:shadow-card",
                    taxType === 'mei' ? "border-emerald/30 bg-emerald-light/30" : "border-border"
                  )}>
                    <RadioGroupItem value="mei" id="mei" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="mei" className="text-base font-medium cursor-pointer">Sou MEI (Valor Fixo)</Label>
                      <p className="text-sm text-muted-foreground mt-1">Pago um valor fixo mensal de DAS</p>
                      {taxType === 'mei' && (
                        <div className="mt-4 animate-fade-in">
                          <Label htmlFor="fixed-value" className="text-sm">Qual o valor fixo do seu DAS?</Label>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-muted-foreground">R$</span>
                            <Input id="fixed-value" type="number" placeholder="75,90" value={fixedValue}
                              onChange={(e) => setFixedValue(e.target.value)} className="max-w-[150px]" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={cn(
                    "flex items-start space-x-3 p-4 rounded-xl border transition-all duration-200",
                    "hover:shadow-card",
                    taxType === 'me' ? "border-emerald/30 bg-emerald-light/30" : "border-border"
                  )}>
                    <RadioGroupItem value="me" id="me" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="me" className="text-base font-medium cursor-pointer">Sou ME / Outro (Porcentagem)</Label>
                      <p className="text-sm text-muted-foreground mt-1">Pago uma porcentagem sobre o faturamento</p>
                      {taxType === 'me' && (
                        <div className="mt-4 animate-fade-in">
                          <Label htmlFor="percentage" className="text-sm">Qual sua alíquota aproximada?</Label>
                          <div className="flex items-center gap-2 mt-2">
                            <Input id="percentage" type="number" placeholder="6" value={percentage}
                              onChange={(e) => setPercentage(e.target.value)} className="max-w-[100px]" />
                            <span className="text-muted-foreground">%</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Aplicaremos essa % sobre suas "Entradas" do mês.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </RadioGroup>

              <Button onClick={saveConfiguration}
                disabled={!taxType || isSavingConfig || (taxType === 'mei' && !fixedValue) || (taxType === 'me' && !percentage)}
                className="w-full">
                {isSavingConfig ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Salvar Configuração'}
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
        {/* Hero DAS Card */}
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-navy-light p-6 shadow-lift animate-scale-in lg:max-w-2xl lg:mx-auto">
            {/* Decorative blur */}
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-emerald/20 blur-3xl" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-amber/10 blur-2xl" />

            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              <p className="text-sm font-medium text-white/70 capitalize">
                DAS de {format(currentMonth, 'MMMM', { locale: ptBR })}
              </p>

              <ProgressRing progress={isPaid ? 100 : 0} paid={isPaid} />

              <div className="text-3xl font-bold text-white">
                {formatCurrency(estimatedTax)}
              </div>

              {profile?.tax_type === 'me' && !isPaid && (
                <div className="flex items-center justify-center gap-2 text-sm text-white/60">
                  <Input type="number" value={editablePercentage}
                    onChange={(e) => setEditablePercentage(e.target.value)}
                    className="w-16 h-8 text-center bg-white/10 border-white/20 text-white" step="0.1" />
                  <span>% sobre {formatCurrency(monthlyIncome)}</span>
                </div>
              )}

              {profile?.tax_type === 'me' && isPaid && (
                <p className="text-sm text-white/60">
                  {currentPercentage}% sobre {formatCurrency(monthlyIncome)} de entradas
                </p>
              )}

              <Badge variant="outline" className={cn(
                "text-sm px-4 py-1",
                isPaid
                  ? "bg-emerald/20 text-emerald border-emerald/40"
                  : "bg-amber/20 text-amber border-amber/40"
              )}>
                {isPaid ? (
                  <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Pago</>
                ) : (
                  <><Clock className="w-3.5 h-3.5 mr-1.5" />Pendente</>
                )}
              </Badge>

              <div className="w-full pt-2">
                {isPaid ? (
                  <Button variant="outline" onClick={undoPayment} disabled={isMarkingPaid}
                    className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20">
                    {isMarkingPaid ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Pago - Clique para desfazer
                  </Button>
                ) : (
                  <Button onClick={markAsPaid} disabled={isMarkingPaid || estimatedTax === 0}
                    className="w-full bg-emerald hover:bg-emerald/90 text-primary-foreground">
                    {isMarkingPaid ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registrando...</> : 'Marcar como Pago'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* History */}
        <div className="space-y-3 lg:max-w-3xl lg:mx-auto">
          <h3 className="text-sm font-medium text-muted-foreground px-1">Histórico</h3>

          {isLoading ? (
            [0, 1, 2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)
          ) : taxPayments.length === 0 ? (
            <div className="text-center py-12 animate-fade-in">
              <div className="w-16 h-16 mx-auto bg-muted rounded-2xl flex items-center justify-center mb-3">
                <Receipt className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhum pagamento registrado ainda</p>
            </div>
          ) : (
            taxPayments
              .filter(p => p.reference_month !== format(currentMonth, 'yyyy-MM-dd'))
              .map((payment, i) => (
                <div
                  key={payment.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
                >
                  <div className={cn(
                    "glass rounded-xl py-3 px-4 shadow-card border transition-all duration-200",
                    "hover:shadow-lift hover:-translate-y-0.5",
                    payment.status === 'paid' ? "border-emerald/15" : "border-amber/15"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {payment.status === 'paid' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber" />
                        )}
                        <span className="font-medium capitalize">
                          {formatMonthShort(new Date(payment.reference_month + 'T12:00:00'))}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{formatCurrency(Number(payment.amount))}</span>
                        <Badge variant="outline" className={cn(
                          "text-xs",
                          payment.status === 'paid'
                            ? "bg-emerald/10 text-emerald border-emerald/30"
                            : "bg-amber/10 text-amber border-amber/30"
                        )}>
                          {payment.status === 'paid' ? 'Pago' : 'Pendente'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Impostos;
