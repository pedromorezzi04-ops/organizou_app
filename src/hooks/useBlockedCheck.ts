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
        // Add a small delay to ensure profile is created after signup
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data, error } = await supabase.rpc('get_user_status', {
          _user_id: user.id
        });

        console.log('User status check:', { userId: user.id, status: data, error });

        if (error) {
          console.error('Error checking user status:', error);
          // If there's an error, assume pending for safety
          setIsBlocked(false);
          setIsPending(true);
        } else {
          const status = data || 'pending';
          setIsBlocked(status === 'blocked');
          setIsPending(status === 'pending');
        }
      } catch (err) {
        console.error('Error checking user status:', err);
        // If there's an error, assume pending for safety
        setIsBlocked(false);
        setIsPending(true);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [user]);

  return { isBlocked, isPending, loading, signOut };
};
