import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useBlockedCheck = () => {
  const { user, signOut } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [needsPayment, setNeedsPayment] = useState(false);
  const [loading, setLoading] = useState(true);

  const userId = user?.id ?? null;

  const checkStatus = useCallback(async (uid: string) => {
    try {
      // 1. Check if blocked
      const { data: status, error } = await supabase.rpc('get_user_status', {
        _user_id: uid
      });

      if (error) {
        console.error('Error checking user status:', error);
        return { blocked: false, needsPayment: false };
      }

      if (status === 'blocked') {
        return { blocked: true, needsPayment: false };
      }

      // 2. Check admin or legacy
      const { data: subData } = await supabase.rpc('get_subscription_info', {
        _user_id: uid,
      });

      if (!subData || subData.length === 0) {
        return { blocked: false, needsPayment: true };
      }

      const info = subData[0];

      // Legacy users have full access
      if (info.is_legacy) {
        return { blocked: false, needsPayment: false };
      }

      // Admin has full access
      const { data: isAdmin } = await supabase.rpc('has_role', {
        _user_id: uid,
        _role: 'admin' as const,
      });
      if (isAdmin) {
        return { blocked: false, needsPayment: false };
      }

      // 3. Check trial (3 days from trial_started_at)
      if (info.subscription_status === 'trial' && info.trial_started_at) {
        const trialEnd = new Date(info.trial_started_at);
        trialEnd.setDate(trialEnd.getDate() + 3);
        if (new Date() <= trialEnd) {
          return { blocked: false, needsPayment: false };
        }
        // Trial expired
        return { blocked: false, needsPayment: true };
      }

      // 4. Check active subscription
      if (info.subscription_status === 'active' && info.subscription_expires_at) {
        if (new Date() <= new Date(info.subscription_expires_at)) {
          return { blocked: false, needsPayment: false };
        }
        return { blocked: false, needsPayment: true };
      }

      // 5. Expired or no valid subscription
      return { blocked: false, needsPayment: true };
    } catch (err) {
      console.error('Error checking user status:', err);
      return { blocked: false, needsPayment: false };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setIsBlocked(false);
      setNeedsPayment(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    checkStatus(userId).then(({ blocked, needsPayment: np }) => {
      if (cancelled) return;
      setIsBlocked(blocked);
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
          if (newStatus) {
            setIsBlocked(newStatus === 'blocked');
          }
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
      checkStatus(userId).then(({ blocked, needsPayment: np }) => {
        setIsBlocked(blocked);
        setNeedsPayment(np);
      });
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId, checkStatus]);

  return { isBlocked, needsPayment, loading, signOut };
};
