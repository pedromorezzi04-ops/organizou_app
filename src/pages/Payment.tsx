import { CreditCard, Zap, Shield, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import logoImg from '@/assets/logo.png';

const CAKTO_CHECKOUT_URL = 'https://pay.cakto.com.br/98ajdxe_784173';

const Payment = () => {
  const { user, signOut } = useAuth();
  const { state } = useSubscription();

  const handleCheckout = () => {
    if (!user) return;
    localStorage.setItem('cakto_pending', 'true');
    window.location.href = `${CAKTO_CHECKOUT_URL}?external_id=${user.id}`;
  };

  const isCritical = state === 'expired_critical';

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
