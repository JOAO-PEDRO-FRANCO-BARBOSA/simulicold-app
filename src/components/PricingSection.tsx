'use client';

import { useState } from 'react';
import { Crown, Gem, Loader2, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrencyBRL } from '@/lib/pricing';

interface Package {
  id: string;
  label: string;
  price: number;
  simulations: number;
  description: string;
  highlight?: boolean;
  icon: typeof Shield;
  cardClassName: string;
  badgeClassName: string;
  accentTextClassName: string;
  buttonClassName: string;
}

const PACKAGES: Package[] = [
  {
    id: 'prata',
    label: 'Prata',
    price: 97.9,
    simulations: 30,
    description: 'Compra única de 10 créditos — ideal para começar a treinar.',
    highlight: false,
    icon: Shield,
    cardClassName: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-slate-500/30 hover:border-slate-300/40',
    badgeClassName: 'bg-slate-400/10 text-slate-300 border border-slate-400/20',
    accentTextClassName: 'text-slate-300',
    buttonClassName: 'bg-slate-200 text-slate-950 hover:bg-white',
  },
  {
    id: 'ouro',
    label: 'Ouro',
    price: 197.9,
    simulations: 80,
    description: 'Compra única de 25 créditos — para treinamentos regulares.',
    highlight: true,
    icon: Crown,
    cardClassName: 'bg-gradient-to-br from-amber-950 via-zinc-950 to-slate-950 border-yellow-500/40 hover:border-yellow-400/60 shadow-[0_0_40px_rgba(234,179,8,0.12)]',
    badgeClassName: 'bg-yellow-500/15 text-yellow-300 border border-yellow-400/25',
    accentTextClassName: 'text-yellow-400',
    buttonClassName: 'bg-yellow-400 text-zinc-950 hover:bg-yellow-300',
  },
  {
    id: 'diamante',
    label: 'Diamante',
    price: 297.9,
    simulations: 150,
    description: 'Compra única de 50 créditos — ideal para power users e times.',
    highlight: false,
    icon: Gem,
    cardClassName: 'bg-gradient-to-br from-cyan-950 via-slate-950 to-blue-950 border-cyan-500/35 hover:border-cyan-400/55',
    badgeClassName: 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/20',
    accentTextClassName: 'text-cyan-400',
    buttonClassName: 'bg-cyan-400 text-slate-950 hover:bg-cyan-300',
  },
];

export default function PricingSection() {
  // Rastreia qual plano está com loading ativo
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  async function handleBuy(pkg: Package) {
    setErrorMsg(null);
    setLoadingPlan(pkg.id);

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
        body: JSON.stringify({ title: `Pacote ${pkg.label}`, unit_price: pkg.price, package: pkg.label, credits: pkg.simulations }),
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
    <section id="preco" className="py-24 px-6 w-full max-w-6xl mx-auto border-t border-white/5">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
          Acesso Total. Preço Único,
          <br />
          Pagamento Flexível.
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
        {PACKAGES.map((pkg) => {
          const isLoading = loadingPlan === pkg.id;
          const isAnyLoading = loadingPlan !== null;

          return (
            <div
              key={pkg.id}
              className={`rounded-2xl p-8 flex flex-col text-center transition-all relative border ${pkg.cardClassName} ${
                pkg.highlight ? 'scale-[1.02] shadow-[0_0_30px_rgba(234,179,8,0.12)]' : ''
              }`}
            >
              {pkg.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-yellow-400 text-zinc-950 text-xs font-bold px-4 py-1 rounded-full shadow-md">
                    Mais Popular
                  </span>
                </div>
              )}

              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-6 border ${pkg.badgeClassName}`}
              >
                <pkg.icon className={`w-5 h-5 ${pkg.accentTextClassName}`} />
              </div>

              <h3 className="text-xl font-bold text-white mb-2">{pkg.label}</h3>
              <div className={`font-semibold mb-6 ${pkg.accentTextClassName}`}>{formatCurrencyBRL(pkg.price)}</div>

              <p className="text-slate-400 text-sm mb-8 flex-1">{pkg.description}</p>

              <div className="text-slate-300 text-sm mb-4">{pkg.simulations} simulações (créditos)</div>

              <button
                id={`btn-comprar-${pkg.id}`}
                onClick={() => handleBuy(pkg)}
                disabled={isAnyLoading}
                className={`w-full py-3 disabled:opacity-60 disabled:cursor-not-allowed font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg ${pkg.buttonClassName}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Aguarde...
                  </>
                ) : (
                  'Comprar Pacote'
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Mensagem de erro inline */}
      {errorMsg && (
        <div className="mt-6 max-w-lg mx-auto bg-red-900/20 border border-red-700/40 rounded-xl p-4 text-center">
          <p className="text-red-400 text-sm">{errorMsg}</p>
        </div>
      )}
    </section>
  );
}
