'use client';

import { Phone, Sparkles, MessageSquare } from 'lucide-react';

interface Props {
  onStart: () => void;
  onUpsellRequired: (message: string) => void;
  hasPersona: boolean;
  simulations: number | null;
}

export function CallPanelIdle({ onStart, onUpsellRequired, hasPersona, simulations }: Props) {
  const areSimulationsReady = simulations !== null;
  const isSimulationBlocked = areSimulationsReady && simulations <= 0;
  const isBlocked = !hasPersona || !areSimulationsReady || isSimulationBlocked;

  const handleStartClick = () => {
    if (!hasPersona) {
      return;
    }

    if (!areSimulationsReady) {
      return;
    }

    if (isSimulationBlocked) {
      onUpsellRequired('Limite atingido!');
      return;
    }

    onStart();
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Call Main Area (Pré-chamada) */}
      <div className="flex-1 rounded-3xl border border-border bg-panel flex flex-col relative transition-all duration-300">
        
        <div className="p-5 border-b border-border flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="text-md font-semibold tracking-wide">Conversa</h2>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden animate-in fade-in duration-300 h-full">
          <Sparkles className="absolute bottom-8 right-10 w-16 h-16 text-foreground/5 rotate-12" />
          
          <div className="w-28 h-28 bg-[#0a0a0a] rounded-full border border-border flex items-center justify-center mb-8 shadow-xl">
            <Phone className="w-12 h-12 text-foreground/40" />
          </div>
          <h3 className="text-2xl font-bold mb-3">Pronto para iniciar</h3>
          <p className="text-foreground/50 mb-10 text-sm">Clique no botão para simular a ligação</p>

          <button 
            onClick={handleStartClick}
            aria-disabled={isBlocked}
            title={!hasPersona ? 'Selecione um perfil de cliente antes de iniciar' : !areSimulationsReady ? 'Carregando simulações...' : isSimulationBlocked ? 'Limite atingido' : undefined}
            className={`flex items-center gap-3 bg-primary text-white px-10 py-4 rounded-full font-bold text-lg transition-transform shadow-[0_0_30px_rgba(219,39,119,0.25)] tracking-wide ${
              isBlocked 
                ? 'opacity-40 cursor-not-allowed' 
                : 'hover:bg-primary-hover hover:scale-105 active:scale-95 cursor-pointer'
            }`}
          >
            <Phone className="w-6 h-6 fill-current" />
            <span>Iniciar Chamada</span>
          </button>

          {!hasPersona && (
            <p className="text-amber-400/90 text-sm mt-4 animate-pulse font-medium text-center">
              ⚠ Selecione uma persona antes de iniciar
            </p>
          )}

          {!areSimulationsReady && (
            <p className="text-amber-400/90 text-sm mt-4 animate-pulse font-medium text-center">
              ⚠ Carregando simulações...
            </p>
          )}

          {isSimulationBlocked && (
            <p className="text-amber-400/90 text-sm mt-4 animate-pulse font-medium text-center">
              ⚠ Limite atingido. Adquira mais simulações para continuar.
            </p>
          )}
        </div>
      </div>

      {/* Caixa Inferior Ficha Limpa */}
      <div className="p-6 rounded-3xl border border-border bg-panel shrink-0 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-accent" />
          <h3 className="text-md font-bold text-accent">Dicas do Coach (B2B)</h3>
        </div>
        <ul className="flex flex-col gap-3 text-sm text-foreground/75 leading-relaxed">
          <li className="flex items-start gap-3">
            <span className="text-accent mt-0.5 font-black">•</span>
            <span>Use o padrão <strong>SPIN</strong>: Situação, Problema, Implicação e Necessidade.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-accent mt-0.5 font-black">•</span>
            <span>Não venda o produto nos primeiros 3 minutos; venda a próxima reunião.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-accent mt-0.5 font-black">•</span>
            <span>Aja com autoridade, mas seja consultivo e empático com o cenário.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
