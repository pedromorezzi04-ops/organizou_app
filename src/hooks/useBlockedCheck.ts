import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useBlockedCheck = () => {
  const { user, signOut } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    if (!user) {
      setIsBlocked(false);
      setIsPending(false);
      setLoading(false);
      return;
    }

    // Fail-safe: while validating status, do not allow access.
    // This prevents a brief window where a blocked/pending user could see protected screens.
    setLoading(true);
    setIsBlocked(false);
    setIsPending(true);

    try {
      const { data, error } = await supabase.rpc('get_user_status', {
        _user_id: user.id
      });

      console.log('User status check:', { userId: user.id, status: data, error });

      if (error) {
        console.error('Error checking user status:', error);
        setIsBlocked(false);
        setIsPending(true);
      } else {
        const status = data || 'pending';
        setIsBlocked(status === 'blocked');
        setIsPending(status === 'pending');
      }
    } catch (err) {
      console.error('Error checking user status:', err);
      setIsBlocked(false);
      setIsPending(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setIsBlocked(false);
      setIsPending(false);
      setLoading(false);
      return;
    }

    // When a user logs in (or switches accounts), force status revalidation
    // and keep the app in a safe state until we get the result.
    setLoading(true);
    setIsBlocked(false);
    setIsPending(true);

    // Initial check immediately
    checkStatus();

    // Subscribe to realtime changes on the user's profile
    const channel = supabase
      .channel(`profile-status-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Profile status changed:', payload);
          const newStatus = payload.new.status;
          setIsBlocked(newStatus === 'blocked');
          setIsPending(newStatus === 'pending');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, checkStatus]);

  // Periodic check every 5 seconds as a fallback
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      checkStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [user, checkStatus]);

  return { isBlocked, isPending, loading, signOut };
};
