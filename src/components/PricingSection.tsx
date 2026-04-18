'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrencyBRL, PLAN_PRICING, PlanType } from '@/lib/pricing';

interface Plan {
  id: PlanType;
  label: string;
  price: number;
  description: string;
  highlight: boolean;
  buttonLabel: string;
}

const PLANS: Plan[] = [
  {
    id: 'semestral',
    label: 'Semestral',
    price: PLAN_PRICING.semestral.price,
    description:
      'Acesso completo por 6 meses. Ideal para equipes escalando suas operações com máxima eficiência no pagamento a termo.',
    highlight: false,
    buttonLabel: 'Assinar Semestre',
  },
  {
    id: 'trimestral',
    label: 'Trimestral',
    price: PLAN_PRICING.trimestral.price,
    description:
      'Acesso total por 3 meses. Compromisso balanceado garantindo evolução contínua.',
    highlight: true,
    buttonLabel: 'Assinar Trimestre',
  },
  {
    id: 'mensal',
    label: 'Mensal',
    price: PLAN_PRICING.mensal.price,
    description:
      'Renovação mensal garantindo flexibilidade para quem quer testar e provar o valor.',
    highlight: false,
    buttonLabel: 'Assinar Mês',
  },
];

export default function PricingSection() {
  // Rastreia qual plano está com loading ativo
  const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubscribe(planType: PlanType) {
    setErrorMsg(null);
    setLoadingPlan(planType);

    try {
      // 1. Verificar se o usuário está logado
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Redireciona para login e envia o plano desejado via URL
        window.location.href = '/login?register=true';
        return;
      }

      // 2. Chamar a rota de checkout backend
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // garante que cookies de sessão são enviados
        body: JSON.stringify({ planType }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao gerar link de pagamento.');
      }

      if (!result.url) {
        throw new Error('Link de pagamento não encontrado na resposta.');
      }

      // 3. Redirecionar para o checkout do Mercado Pago
      window.location.href = result.url;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Ocorreu um erro inesperado.';
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
        {PLANS.map((plan) => {
          const isLoading = loadingPlan === plan.id;
          const isAnyLoading = loadingPlan !== null;

          return (
            <div
              key={plan.id}
              className={`rounded-2xl p-8 flex flex-col text-center transition-colors ${
                plan.highlight
                  ? 'bg-[#131b2c] border border-blue-600/50 relative shadow-[0_0_30px_rgba(37,99,235,0.1)]'
                  : 'bg-[#0f1523] border border-blue-900/30 hover:border-blue-700/50'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md">
                    Mais escolhido
                  </span>
                </div>
              )}

              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-400 ${
                  plan.highlight ? 'bg-blue-900/40' : 'bg-blue-900/20'
                }`}
              >
                <FileText className="w-5 h-5" />
              </div>

              <h3 className="text-xl font-bold text-white mb-2">{plan.label}</h3>
              <div className="text-blue-400 font-semibold mb-6">({formatCurrencyBRL(plan.price)})</div>

              <p className="text-slate-400 text-sm mb-8 flex-1">{plan.description}</p>

              <button
                id={`btn-assinar-${plan.id}`}
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
                  plan.buttonLabel
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
