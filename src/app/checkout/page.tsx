'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrencyBRL, PLAN_PRICING, PlanType } from '@/lib/pricing';

const PLANS: Array<{
  id: PlanType;
  name: string;
  price: number;
  description: string;
  featured?: boolean;
}> = [
  {
    id: 'mensal',
    name: 'Mensal',
    price: PLAN_PRICING.mensal.price,
    description: 'Renovação mensal com flexibilidade para testar e provar valor rapidamente.',
  },
  {
    id: 'trimestral',
    name: 'Trimestral',
    price: PLAN_PRICING.trimestral.price,
    description: 'Acesso total por 3 meses com equilíbrio entre custo e continuidade.',
    featured: true,
  },
  {
    id: 'semestral',
    name: 'Semestral',
    price: PLAN_PRICING.semestral.price,
    description: 'Acesso completo por 6 meses para equipes que querem escala com previsibilidade.',
  },
];

export default function CheckoutPage() {
  const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubscribe(planType: PlanType) {
    setErrorMsg(null);
    setLoadingPlan(planType);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/login?register=true';
        return;
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planType }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao gerar link de pagamento.');
      }

      if (!result.url) {
        throw new Error('Link de pagamento não encontrado na resposta.');
      }

      window.location.href = result.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro inesperado.';
      setErrorMsg(message);
      setLoadingPlan(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-200 font-sans selection:bg-blue-600/30">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden flex justify-center items-center opacity-30 mix-blend-screen">
        <div className="w-[120vw] h-[120vh] bg-[radial-gradient(ellipse_at_center,rgba(29,78,216,0.15),transparent_60%)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <svg className="absolute w-full h-full stroke-blue-500/10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="checkout-net" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M100 0L0 100M0 0l100 100" strokeWidth="0.5" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#checkout-net)" />
        </svg>
      </div>

      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-300 text-sm font-medium mb-6">
            <CheckCircle2 className="w-4 h-4" />
            Checkout e pagamento
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight text-white">
            Escolha seu plano e siga para o Mercado Pago.
          </h1>
          <p className="text-lg md:text-xl text-slate-400 leading-relaxed">
            Ao clicar em assinar, vamos gerar o link do pagamento correspondente ao plano escolhido.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
          {PLANS.map((plan) => {
            const isLoading = loadingPlan === plan.id;
            const isAnyLoading = loadingPlan !== null;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-8 flex flex-col text-center border transition-all ${
                  plan.featured
                    ? 'bg-[#131b2c] border-blue-600/60 shadow-[0_0_30px_rgba(37,99,235,0.12)] scale-[1.02]'
                    : 'bg-[#0f1523] border-blue-900/30 hover:border-blue-700/50'
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md">
                      Mais escolhido
                    </span>
                  </div>
                )}

                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-400 ${
                    plan.featured ? 'bg-blue-900/40' : 'bg-blue-900/20'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                </div>

                <h2 className="text-xl font-bold text-white mb-2">{plan.name}</h2>
                <div className="text-blue-400 font-semibold mb-6">({formatCurrencyBRL(plan.price)})</div>
                <p className="text-slate-400 text-sm mb-8 flex-1">{plan.description}</p>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isAnyLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Aguarde...
                    </>
                  ) : (
                    <>
                      Assinar agora
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {errorMsg && (
          <div className="mt-6 max-w-lg mx-auto bg-red-900/20 border border-red-700/40 rounded-xl p-4 text-center">
            <p className="text-red-400 text-sm">{errorMsg}</p>
          </div>
        )}
      </section>
    </main>
  );
}
