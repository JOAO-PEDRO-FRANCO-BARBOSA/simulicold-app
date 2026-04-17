'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useUserSimulations() {
  const [simulations, setSimulations] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSimulations = async () => {
      setIsLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        if (isMounted) {
          setSimulations(null);
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
        console.error('[simulations] Falha ao carregar saldo:', error);
      }

      if (isMounted) {
        setSimulations(data?.balance ?? 0);
        setIsLoading(false);
      }
    };

    loadSimulations();
    const refreshInterval = setInterval(loadSimulations, 30000);

    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
    };
  }, []);

  return { simulations, isLoading };
}
