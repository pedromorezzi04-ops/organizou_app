import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type SubscriptionState = 'loading' | 'admin' | 'legacy' | 'active' | 'expired' | 'expired_critical' | 'pending';

export const useSubscription = () => {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>('loading');
  const [hoursOverdue, setHoursOverdue] = useState(0);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState('loading');
      setLoading(false);
      return;
    }

    try {
      // Check admin first
      const { data: isAdmin } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin' as const,
      });

      if (isAdmin) {
        setState('admin');
        setLoading(false);
        return;
      }

      // Get subscription info
      const { data, error } = await supabase.rpc('get_subscription_info', {
        _user_id: user.id,
      });

      if (error || !data || data.length === 0) {
        setState('pending');
        setLoading(false);
        return;
      }

      const info = data[0];

      if (info.is_legacy) {
        setState('legacy');
        setLoading(false);
        return;
      }

      if (info.subscription_status === 'active' && info.subscription_expires_at) {
        const expiresAt = new Date(info.subscription_expires_at);
        if (expiresAt > new Date()) {
          setState('active');
          setLoading(false);
          return;
        }
        // Expired
        const hoursOver = (Date.now() - expiresAt.getTime()) / (1000 * 60 * 60);
        setHoursOverdue(hoursOver);
        setState(hoursOver > 72 ? 'expired_critical' : 'expired');
        setLoading(false);
        return;
      }

      // No active subscription — needs payment
      setState('pending');
    } catch (err) {
      console.error('Subscription check error:', err);
      setState('pending');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const canExport = state === 'admin' || state === 'legacy' || state === 'active';
  const needsPayment = state === 'pending' || state === 'expired' || state === 'expired_critical';

  return { state, hoursOverdue, loading, canExport, needsPayment, refresh: checkSubscription };
};
