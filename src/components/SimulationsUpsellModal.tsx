
'use client';

import { Coins, ArrowRight } from 'lucide-react';

interface SimulationsUpsellModalProps {
  isOpen: boolean;
  message?: string;
  onClose: () => void;
}

export function SimulationsUpsellModal({ isOpen, message, onClose }: SimulationsUpsellModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-panel border border-border w-full max-w-lg rounded-3xl p-6 sm:p-7 relative shadow-2xl pointer-events-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-9 w-9 rounded-full border border-border bg-background/80 text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors flex items-center justify-center"
          aria-label="Fechar modal"
        >
          <span className="text-lg leading-none">×</span>
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
          Seu acesso está bloqueado até comprar novos créditos. A única ação disponível é seguir para o checkout.
        </p>

        <button
          onClick={() => {
            window.location.href = '/checkout';
          }}
          className="w-full px-5 py-3 rounded-xl bg-accent text-zinc-950 font-bold hover:bg-yellow-300 transition-colors flex items-center justify-center gap-2"
        >
          Ir para o checkout
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
