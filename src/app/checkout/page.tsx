'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, Crown, Gem, Loader2, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrencyBRL, PLAN_PRICING, PlanType } from '@/lib/pricing';

const PLANS: Array<{
  id: PlanType;
  name: string;
  price: number;
  description: string;
  featured?: boolean;
  icon: typeof Shield;
  cardClassName: string;
  badgeClassName: string;
  accentTextClassName: string;
  buttonClassName: string;
}> = [
  {
    id: 'mensal',
    name: 'Prata',
    price: 97.9,
    simulations: 30,
    description: 'Compra única de 30 créditos — ideal para começar a treinar e validar abordagens.',
    icon: Shield,
    cardClassName: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-slate-500/30 hover:border-slate-300/40',
    badgeClassName: 'bg-slate-400/10 text-slate-300 border border-slate-400/20',
    accentTextClassName: 'text-slate-300',
    buttonClassName: 'bg-slate-200 text-slate-950 hover:bg-white',
  },
  {
    id: 'trimestral',
    name: 'Ouro',
    price: 197.9,
    simulations: 80,
    description: 'Compra única de 80 créditos — para treinamentos regulares e times em crescimento.',
    featured: true,
    icon: Crown,
    cardClassName: 'bg-gradient-to-br from-amber-950 via-zinc-950 to-slate-950 border-yellow-500/40 hover:border-yellow-400/60 shadow-[0_0_40px_rgba(234,179,8,0.12)]',
    badgeClassName: 'bg-yellow-500/15 text-yellow-300 border border-yellow-400/25',
    accentTextClassName: 'text-yellow-400',
    buttonClassName: 'bg-yellow-400 text-zinc-950 hover:bg-yellow-300',
  },
  {
    id: 'semestral',
    name: 'Diamante',
    price: 297.9,
    simulations: 150,
    description: 'Compra única de 150 créditos — ideal para power users e operações de alto volume.',
    icon: Gem,
    cardClassName: 'bg-gradient-to-br from-cyan-950 via-slate-950 to-blue-950 border-cyan-500/35 hover:border-cyan-400/55',
    badgeClassName: 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/20',
    accentTextClassName: 'text-cyan-400',
    buttonClassName: 'bg-cyan-400 text-slate-950 hover:bg-cyan-300',
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

      const selectedPlan = PLANS.find((plan) => plan.id === planType);

      if (!selectedPlan) {
        throw new Error('Pacote selecionado não encontrado.');
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: `Pacote ${selectedPlan.name}`,
          unit_price: selectedPlan.price,
          package: selectedPlan.name,
          credits: (selectedPlan as any).simulations ?? 0,
        }),
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
            Checkout de créditos
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight text-white">
            Escolha seu pacote e siga para o Mercado Pago.
          </h1>
          <p className="text-lg md:text-xl text-slate-400 leading-relaxed">
            Ao clicar em comprar, vamos gerar o link do pagamento correspondente ao pacote escolhido.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
          {PLANS.map((plan) => {
            const isLoading = loadingPlan === plan.id;
            const isAnyLoading = loadingPlan !== null;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-8 flex flex-col text-center border transition-all ${plan.cardClassName} ${
                  plan.featured ? 'scale-[1.02] shadow-[0_0_30px_rgba(234,179,8,0.12)]' : ''
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-yellow-400 text-zinc-950 text-xs font-bold px-4 py-1 rounded-full shadow-md">
                      Mais Popular
                    </span>
                  </div>
                )}

                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-6 border ${plan.badgeClassName}`}
                >
                  <plan.icon className={`w-5 h-5 ${plan.accentTextClassName}`} />
                </div>

                <h2 className="text-xl font-bold text-white mb-2">{plan.name}</h2>
                <div className={`font-semibold mb-6 ${plan.accentTextClassName}`}>({formatCurrencyBRL(plan.price)})</div>
                <p className="text-slate-400 text-sm mb-8 flex-1">{plan.description}</p>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isAnyLoading}
                  className={`w-full py-3 disabled:opacity-60 disabled:cursor-not-allowed font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg ${plan.buttonClassName}`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Aguarde...
                    </>
                  ) : (
                    <>Comprar Pacote<ArrowRight className="w-4 h-4" /></>
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
