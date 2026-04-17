'use client';

import { useState } from 'react';
import { ArrowRight, Coins, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function CheckoutAddonPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleBuyAddon() {
    try {
      setErrorMsg(null);
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/login';
        return;
      }

      const response = await fetch('/api/checkout-addon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ addonType: 'simulacoes-20' }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao iniciar checkout avulso.');
      }

      if (!result.init_point) {
        throw new Error('Link de pagamento não encontrado.');
      }

      window.location.href = result.init_point;
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Erro inesperado ao iniciar pagamento.');
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-200 font-sans selection:bg-blue-600/30">
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-24">
        <div className="rounded-3xl border border-blue-900/40 bg-[#101726] p-8 sm:p-10 shadow-[0_0_40px_rgba(37,99,235,0.08)]">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center mb-6">
            <Coins className="w-7 h-7 text-blue-300" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Suas simulações acabaram.
          </h1>

          <p className="text-slate-300 text-lg leading-relaxed mb-7">
            Limite atingido! Adquira mais 20 simulações por R$ 97 para continuar treinando agora ou aguarde a renovação do plano.
          </p>

          {errorMsg && (
            <div className="mb-5 rounded-xl border border-red-700/40 bg-red-900/20 p-4 text-red-300 text-sm">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => { window.location.href = '/checkout'; }}
              disabled={isLoading}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800/60 transition-colors font-medium disabled:opacity-60"
            >
              Ver planos
            </button>

            <button
              onClick={handleBuyAddon}
              disabled={isLoading}
              className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecionando...
                </>
              ) : (
                <>
                  Comprar +20 simulações por R$ 97
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
