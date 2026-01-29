import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useBlockedCheck = () => {
  const { user, signOut } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkBlocked = async () => {
      if (!user) {
        setIsBlocked(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('is_user_blocked', {
          _user_id: user.id
        });

        if (error) {
          console.error('Error checking blocked status:', error);
          setIsBlocked(false);
        } else {
          setIsBlocked(data === true);
        }
      } catch (err) {
        console.error('Error checking blocked status:', err);
        setIsBlocked(false);
      } finally {
        setLoading(false);
      }
    };

    checkBlocked();
  }, [user]);

  return { isBlocked, loading, signOut };
};
