import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useBlockedCheck = () => {
  const { user, signOut } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading] = useState(true);

  const userId = user?.id ?? null;

  const checkStatus = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_status', {
        _user_id: uid
      });

      if (error) {
        console.error('Error checking user status:', error);
        // fail-safe
        return { status: 'pending' as const };
      }

      const status = (data || 'pending') as string;
      return { status };
    } catch (err) {
      console.error('Error checking user status:', err);
      return { status: 'pending' as const };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setIsBlocked(false);
      setIsPending(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Initial status fetch
    checkStatus(userId).then(({ status }) => {
      if (cancelled) return;
      setIsBlocked(status === 'blocked');
      setIsPending(status === 'pending');
      setLoading(false);
    });

    // Subscribe to realtime changes on the user's profile
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
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, checkStatus]);

  // Periodic check every 1 hour as a fallback (realtime should handle instant updates)
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      checkStatus(userId).then(({ status }) => {
        setIsBlocked(status === 'blocked');
        setIsPending(status === 'pending');
      });
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId, checkStatus]);

  return { isBlocked, isPending, loading, signOut };
};
