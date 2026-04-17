'use client';

import { useState } from 'react';
import { Coins, Loader2, X } from 'lucide-react';
import { ADDON_PRICING, formatCurrencyBRL, PLAN_PRICING } from '@/lib/pricing';

interface SimulationsUpsellModalProps {
  isOpen: boolean;
  message?: string;
  onClose: () => void;
}

export function SimulationsUpsellModal({ isOpen, message, onClose }: SimulationsUpsellModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const addonPriceLabel = formatCurrencyBRL(ADDON_PRICING['simulacoes-20'].price);

  if (!isOpen) return null;

  const handleBuyAddon = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);

      const response = await fetch('/api/checkout-addon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ addonType: 'simulacoes-20' }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Não foi possível iniciar a compra do pacote avulso.');
      }

      if (!result.init_point) {
        throw new Error('Link de pagamento não encontrado.');
      }

      window.location.href = result.init_point;
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Erro ao iniciar pagamento.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-panel border border-border w-full max-w-lg rounded-3xl p-6 sm:p-7 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-foreground/35 hover:text-foreground transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-5">
          <Coins className="w-7 h-7 text-accent" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 tracking-tight">
          Simulações esgotadas!
        </h2>

        <p className="text-foreground/70 leading-relaxed mb-2">
          {message || 'Simulações esgotadas'}
        </p>

        <p className="text-foreground/80 leading-relaxed mb-7">
          {`Faça uma recarga de +20 simulações por ${addonPriceLabel} para continuar agora ou escolha um upgrade de assinatura com mais volume.`}
        </p>

        <div className="mb-7 rounded-xl border border-border bg-foreground/5 px-4 py-3">
          <p className="text-sm font-semibold text-foreground mb-2">Opções de upgrade:</p>
          <p className="text-sm text-foreground/75">
            Mensal: {formatCurrencyBRL(PLAN_PRICING.mensal.price)} (105 simulações)
          </p>
          <p className="text-sm text-foreground/75">
            Trimestral: {formatCurrencyBRL(PLAN_PRICING.trimestral.price)} (315 simulações)
          </p>
          <p className="text-sm text-foreground/75">
            Semestral: {formatCurrencyBRL(PLAN_PRICING.semestral.price)} (630 simulações)
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-border text-foreground/90 hover:bg-foreground/5 transition-colors font-medium disabled:opacity-60"
          >
            Agora não
          </button>

          <button
            onClick={() => {
              window.location.href = '/checkout';
            }}
            disabled={isLoading}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-accent/30 text-foreground hover:bg-accent/10 transition-colors font-medium disabled:opacity-60"
          >
            Ver upgrades
          </button>

          <button
            onClick={handleBuyAddon}
            disabled={isLoading}
            className="w-full sm:flex-1 px-5 py-3 rounded-xl bg-accent text-zinc-950 font-bold hover:bg-yellow-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecionando...
              </>
            ) : (
              `Comprar +20 simulações por ${addonPriceLabel}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
