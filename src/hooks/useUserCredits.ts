'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useUserCredits() {
  const [credits, setCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadCredits = async () => {
      setIsLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        if (isMounted) {
          setCredits(null);
          setIsLoading(false);
        }
        return;
      }

      const { data, error } = (await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', authData.user.id)
        .single()) as { data: { balance: number } | null; error: any };

      if (error) {
        console.error('[credits] Falha ao carregar saldo:', error);
      }

      if (isMounted) {
        setCredits(data?.balance ?? 0);
        setIsLoading(false);
      }
    };

    loadCredits();
    const refreshInterval = setInterval(loadCredits, 30000);

    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
    };
  }, []);

  return { credits, isLoading };
}