'use client';

import Link from 'next/link';
import { X, BarChart3 } from 'lucide-react';

interface EndCallModalProps {
  onRetry: () => void;
}

export function EndCallModal({ onRetry }: EndCallModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-panel border border-border w-full max-w-sm rounded-[2rem] p-6 relative shadow-2xl flex flex-col animate-in zoom-in-95 duration-400">
        
        {/* Cancel/Close Superior Direito */}
        <button 
          onClick={onRetry}
          className="absolute top-5 right-5 text-foreground/30 hover:text-foreground cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ícone de Fim de Chamada Vermelho */}
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5 mt-2">
          <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
            <X className="w-5 h-5 text-white stroke-[3px]" />
          </div>
        </div>

        {/* Título e Texto */}
        <h2 className="text-3xl font-serif font-bold text-center mb-3 tracking-tight">Interação Encerrada</h2>
        
        {/* TEXTO ATUALIZADO PELO USUÁRIO */}
        <p className="text-foreground/60 text-center mb-8 px-2 text-[15px] leading-relaxed">
          Não desanime, cada tentativa de Cold Call B2B é aprendizado!
        </p>

        {/* Card Dourado Escuro de Insights Promocional */}
        <div className="bg-accent/5 border border-accent/10 rounded-2xl p-4 flex gap-3 mb-8">
          <div className="shrink-0 pt-0.5">
            <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-accent" />
            </div>
          </div>
          <div>
            <h4 className="font-bold text-foreground text-sm tracking-wide mb-1">Quer saber onde errou?</h4>
            <p className="text-xs text-foreground/50 leading-relaxed">
              Nossa IA vai analisar sua abordagem e mostrar exatamente o que você poderia ter feito diferente utilizando os gatilhos certos.
            </p>
          </div>
        </div>

        {/* Zona de Botões Interativos Guiados */}
        <div className="flex gap-3 mt-auto">
          <button 
            onClick={onRetry}
            className="flex-1 py-3 px-4 rounded-xl border border-border text-foreground hover:bg-foreground/5 font-semibold transition-colors cursor-pointer text-sm"
          >
            Tentar Novamente
          </button>
          
          <Link 
            href="/analysis"
            className="flex-1 py-3 px-4 rounded-xl bg-accent hover:bg-yellow-400 text-zinc-950 font-bold text-center transition-transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-accent/10 cursor-pointer text-sm whitespace-nowrap"
          >
            Ver Análise Detalhada
          </Link>
        </div>
        
      </div>
    </div>
  );
}
