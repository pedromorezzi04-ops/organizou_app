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

    try {
      const { data, error } = await supabase.rpc('get_user_status', {
        _user_id: user.id
      });

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

    // Set loading when user changes
    setLoading(true);
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
  }, [user?.id]); // Only depend on user.id to avoid unnecessary re-runs

  // Periodic check every 60 seconds as a fallback
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      checkStatus();
    }, 60000);

    return () => clearInterval(interval);
  }, [user?.id, checkStatus]);

  return { isBlocked, isPending, loading, signOut };
};
