import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Zap, Shield, AlertTriangle, Check, Ticket, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import logoImg from '@/assets/logo.png';

const CAKTO_CHECKOUT_URL = 'https://pay.cakto.com.br/dfgjcuf_784254';

const Payment = () => {
  const { user, signOut } = useAuth();
  const { state, refresh } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState(false);

  const handleCouponActivation = async () => {
    if (!couponCode.trim()) return;

    setCouponLoading(true);
    setCouponError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/auth';
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activate-coupon`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ code: couponCode.trim().toUpperCase() }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        setCouponError(result.error?.message || 'Cupom inválido ou expirado.');
        return;
      }

      setCouponSuccess(true);
      toast({ title: 'Cupom ativado!', description: 'Sua assinatura está ativa. Redirecionando...' });
      setTimeout(() => { window.location.href = '/'; }, 1500);
    } catch {
      setCouponError('Erro de conexão. Tente novamente.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCheckout = () => {
    if (!user) return;
    localStorage.setItem('cakto_pending', 'true');
    window.location.href = `${CAKTO_CHECKOUT_URL}?external_id=${user.id}`;
  };

  const isCritical = state === 'expired_critical';
  const isPending = state === 'pending';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10 space-y-6">
        <div className="text-center">
          <img src={logoImg} alt="Organizou+" className="w-16 h-16 mx-auto mb-4 rounded-2xl" />
          <h1 className="text-2xl font-bold text-foreground">Organizou+</h1>
        </div>

        {isCritical && (
          <div className="glass rounded-2xl p-4 border border-destructive/30 bg-destructive/5 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-destructive">Exclusão Iminente</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Sua assinatura expirou há mais de 72 horas. Seus dados serão excluídos em breve.
                  Pague agora para manter seu acesso.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Seção de cupom */}
        <div className="glass rounded-2xl p-5 border border-border/50 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Ticket className="w-4 h-4 text-emerald-500" />
            Tem um cupom de acesso?
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Digite seu cupom"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase());
                setCouponError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCouponActivation()}
              disabled={couponLoading || couponSuccess}
              className="rounded-xl uppercase tracking-widest"
            />
            <Button
              onClick={handleCouponActivation}
              disabled={!couponCode.trim() || couponLoading || couponSuccess}
              className="rounded-xl px-5 bg-emerald-600 hover:bg-emerald-700 shrink-0"
            >
              {couponLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : 'Ativar'}
            </Button>
          </div>
          {couponError && (
            <div className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {couponError}
            </div>
          )}
          {couponSuccess && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Cupom ativado! Redirecionando...
            </div>
          )}
        </div>

        {/* Separador */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border/50" />
          <span className="text-xs text-muted-foreground">ou</span>
          <div className="flex-1 h-px bg-border/50" />
        </div>

        <div className="glass-strong rounded-3xl p-6 shadow-lift space-y-6 border border-border/50">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-sm font-medium">
              <Zap className="w-4 h-4" />
              Plano Mensal
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-foreground">R$ 50</span>
              <span className="text-muted-foreground">/mês</span>
            </div>
          </div>

          <div className="space-y-3">
            {[
              'Controle completo de entradas e saídas',
              'Gestão de notinhas e parcelas',
              'Cálculo automático de impostos (DAS)',
              'Exportação de dados',
              'Suporte prioritário',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-emerald-600" />
                </div>
                <span className="text-foreground">{feature}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={handleCheckout}
            className="w-full h-14 text-base font-semibold rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Ativar Plano Mensal
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            Pagamento seguro
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={signOut}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
};

export default Payment;
