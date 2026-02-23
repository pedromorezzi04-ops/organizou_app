import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Zap, Shield, AlertTriangle, Loader2, Tag, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logoImg from '@/assets/logo.png';

const Payment = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { state, hoursOverdue } = useSubscription();
  const [couponCode, setCouponCode] = useState('');
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);

  const handleCheckout = async () => {
    if (!user) return;
    setLoadingCheckout(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { couponCode: couponCode.trim() || null },
      });

      if (error) {
        toast.error('Erro ao criar checkout. Tente novamente.');
        console.error('Checkout error:', error);
        return;
      }

      if (data?.free) {
        toast.success(data.message);
        setCouponApplied(true);
        setTimeout(() => navigate('/'), 1500);
        return;
      }

      if (data?.billing?.data?.url) {
        window.location.href = data.billing.data.url;
      } else {
        toast.error('Erro ao gerar link de pagamento.');
        console.error('No URL in response:', data);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setLoadingCheckout(false);
    }
  };

  const isCritical = state === 'expired_critical';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10 space-y-6">
        {/* Logo */}
        <div className="text-center">
          <img src={logoImg} alt="Organizou+" className="w-16 h-16 mx-auto mb-4 rounded-2xl" />
          <h1 className="text-2xl font-bold text-foreground">Organizou+</h1>
        </div>

        {/* Critical warning */}
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

        {/* Payment card */}
        <div className="glass-strong rounded-3xl p-6 shadow-lift space-y-6 border border-border/50">
          {/* Plan info */}
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

          {/* Features */}
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

          {/* Coupon */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              Cupom de desconto
            </label>
            <Input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO DO CUPOM"
              className="text-center font-mono tracking-widest"
            />
          </div>

          {/* Checkout button */}
          <Button
            onClick={handleCheckout}
            disabled={loadingCheckout || couponApplied}
            className="w-full h-14 text-base font-semibold rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-lg shadow-emerald-500/20 transition-all"
          >
            {loadingCheckout ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : couponApplied ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Ativado!
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Pagar com PIX
              </>
            )}
          </Button>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            Pagamento seguro via AbacatePay
          </div>
        </div>

        {/* Sign out */}
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
