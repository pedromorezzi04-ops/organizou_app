import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useBlockedCheck = () => {
  const { user, signOut } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [needsPayment, setNeedsPayment] = useState(false);
  const [loading, setLoading] = useState(true);

  const userId = user?.id ?? null;

  const checkStatus = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_status', {
        _user_id: uid
      });

      if (error) {
        console.error('Error checking user status:', error);
        return { status: 'pending' as const, needsPayment: false };
      }

      const status = (data || 'pending') as string;

      // Check subscription status
      let subNeedsPayment = false;
      if (status === 'active') {
        const { data: subData } = await supabase.rpc('get_subscription_info', {
          _user_id: uid,
        });
        if (subData && subData.length > 0) {
          const info = subData[0];
          if (!info.is_legacy) {
            // Check admin
            const { data: isAdmin } = await supabase.rpc('has_role', {
              _user_id: uid,
              _role: 'admin' as const,
            });
            if (!isAdmin) {
              if (info.subscription_status === 'trial' && info.trial_started_at) {
                const trialEnd = new Date(info.trial_started_at);
                trialEnd.setDate(trialEnd.getDate() + 3);
                if (new Date() > trialEnd) {
                  subNeedsPayment = true;
                }
              } else if (info.subscription_status === 'active' && info.subscription_expires_at) {
                if (new Date() > new Date(info.subscription_expires_at)) {
                  subNeedsPayment = true;
                }
              } else if (info.subscription_status === 'expired') {
                subNeedsPayment = true;
              }
            }
          }
        }
      }

      return { status, needsPayment: subNeedsPayment };
    } catch (err) {
      console.error('Error checking user status:', err);
      return { status: 'pending' as const, needsPayment: false };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setIsBlocked(false);
      setIsPending(false);
      setNeedsPayment(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    checkStatus(userId).then(({ status, needsPayment: np }) => {
      if (cancelled) return;
      setIsBlocked(status === 'blocked');
      setIsPending(status === 'pending');
      setNeedsPayment(np);
      setLoading(false);
    });

    const channel = supabase
      .channel(`profile-status-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (cancelled) return;
          const newStatus = (payload.new as { status?: string }).status;
          if (!newStatus) return;
          setIsBlocked(newStatus === 'blocked');
          setIsPending(newStatus === 'pending');
          // Re-check subscription on profile change
          checkStatus(userId).then(({ needsPayment: np }) => {
            if (cancelled) return;
            setNeedsPayment(np);
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, checkStatus]);

  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      checkStatus(userId).then(({ status, needsPayment: np }) => {
        setIsBlocked(status === 'blocked');
        setIsPending(status === 'pending');
        setNeedsPayment(np);
      });
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId, checkStatus]);

  return { isBlocked, isPending, needsPayment, loading, signOut };
};
