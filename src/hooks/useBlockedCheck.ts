import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useBlockedCheck = () => {
  const { user, signOut } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastUserId = useRef<string | null>(null);

  const checkStatus = useCallback(async (isInitial: boolean = false) => {
    if (!user) {
      setIsBlocked(false);
      setIsPending(false);
      setLoading(false);
      return;
    }

    // Only set loading on initial check to avoid re-renders during polling
    if (isInitial) {
      setLoading(true);
      setIsBlocked(false);
      setIsPending(true);
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
      lastUserId.current = null;
      return;
    }

    // Only run initial check when user changes
    if (lastUserId.current !== user.id) {
      lastUserId.current = user.id;
      checkStatus(true);
    }

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

  // Periodic check every 30 seconds as a fallback (reduced from 5s)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      checkStatus(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [user, checkStatus]);

  return { isBlocked, isPending, loading, signOut };
};
