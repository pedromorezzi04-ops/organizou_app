import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useBlockedCheck = () => {
  const { user, signOut } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
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
          setIsPending(false);
        } else {
          setIsBlocked(data === 'blocked');
          setIsPending(data === 'pending');
        }
      } catch (err) {
        console.error('Error checking user status:', err);
        setIsBlocked(false);
        setIsPending(false);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [user]);

  return { isBlocked, isPending, loading, signOut };
};
