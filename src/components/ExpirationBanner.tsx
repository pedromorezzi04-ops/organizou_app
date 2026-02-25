import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';

const ExpirationBanner = () => {
  const { user } = useAuth();
  const { state } = useSubscription();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!user || state !== 'active') return;

    const check = async () => {
      const { data } = await supabase.rpc('get_subscription_info', { _user_id: user.id });
      if (!data?.[0]?.subscription_expires_at) return;

      const expiresAt = new Date(data[0].subscription_expires_at);
      const now = new Date();
      const days = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (days > 0 && days <= 5) {
        setDaysLeft(days);
      }
    };

    check();
  }, [user, state]);

  if (!daysLeft) return null;

  return (
    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 flex items-center gap-3 animate-fade-in">
      <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
      <p className="text-sm text-foreground flex-1">
        Sua assinatura vence em <strong>{daysLeft} dia{daysLeft > 1 ? 's' : ''}</strong>. Renove agora para evitar o bloqueio de dados.
      </p>
      <Link
        to="/payment"
        className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 hover:underline whitespace-nowrap"
      >
        Renovar
      </Link>
    </div>
  );
};

export default ExpirationBanner;
