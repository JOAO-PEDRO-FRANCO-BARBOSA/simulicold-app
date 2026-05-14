'use client';

import { useState, useEffect } from 'react';
import { Phone, Sparkles, MessageSquare, Mic, PhoneOff } from 'lucide-react';
import { EndCallModal } from './EndCallModal';
import { unlockAudioContext } from '@/lib/audioUtils';

export function CallPanel() {
  const [callState, setCallState] = useState<'idle' | 'active' | 'ended'>('idle');
  const [timer, setTimer] = useState(0);

  // Timer Lógico da Chamada Ativa (mock visual)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'active') {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev >= 300) { // Encerra forçosamente nos 5 Minutos cravados
            setCallState('ended');
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto overflow-x-hidden">
      {/* Container Principal */}
      <div className="flex-1 rounded-2xl border border-border bg-panel flex flex-col relative transition-all duration-300 overflow-y-auto overflow-x-hidden">
        
        {/* Cabeçalho da Seção */}
        <div className="p-4 border-b border-border flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="text-md font-semibold">Conversa</h2>
        </div>

        {/* ================= ESTADO: IDLE (Aguardando) ================= */}
        {callState === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden animate-in fade-in duration-300">
            <Sparkles className="absolute bottom-8 right-8 w-12 h-12 text-foreground/5" />
            
            <div className="w-24 h-24 bg-background rounded-full border border-border flex items-center justify-center mb-6 shadow-xl">
              <Phone className="w-10 h-10 text-foreground/50" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Pronto para iniciar</h3>
            <p className="text-foreground/60 mb-8">Clique no botão para simular a ligação</p>

            <button 
              onClick={() => {
                unlockAudioContext();
                setCallState('active');
              }}
              className="flex items-center gap-3 bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-full font-bold text-lg transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(219,39,119,0.3)] cursor-pointer"
            >
              <Phone className="w-6 h-6" />
              <span>Iniciar Chamada</span>
            </button>
          </div>
        )}

        {/* ================= ESTADO: ACTIVE (Ativo/Ouvindo) ================= */}
        {callState === 'active' && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
            
            {/* Componente Cronômetro Decorativo Superior */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background border border-border px-5 py-2 rounded-full shadow-lg">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-mono text-sm tracking-widest text-foreground/80">{formatTime(timer)}</span>
            </div>

            {/* Ícone Pulsante de Voz (Dourado/Amarelo do Design) */}
            <div className="relative mb-8 mt-6">
              <div className="absolute inset-0 bg-accent/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
              <div className="relative w-32 h-32 sm:w-44 sm:h-44 bg-background rounded-full border border-accent/50 flex items-center justify-center shadow-[0_0_50px_rgba(234,179,8,0.15)] overflow-hidden">
                <Mic className="w-12 h-12 text-accent" />
              </div>
            </div>

            <h3 className="text-xl sm:text-3xl font-bold mb-2 tracking-wide font-sans">Sua vez de falar</h3>
            <p className="text-foreground/40 text-sm mb-12">Fale naturalmente...</p>
            
            {/* Visualizador de Ondas Progressivo Abstrato */}
            <div className="flex items-end gap-1.5 mb-14 h-8 justify-center min-w-[60px]">
               <div className="w-1.5 h-2 rounded bg-accent/80 animate-bounce" style={{animationDelay: '0ms'}} />
               <div className="w-1.5 h-4 rounded bg-accent/80 animate-bounce" style={{animationDelay: '150ms'}} />
               <div className="w-1.5 h-6 rounded bg-accent/80 animate-bounce" style={{animationDelay: '300ms'}} />
               <div className="w-1.5 h-4 rounded bg-accent/80 animate-bounce" style={{animationDelay: '450ms'}} />
               <div className="w-1.5 h-2 rounded bg-accent/80 animate-bounce" style={{animationDelay: '600ms'}} />
            </div>

            {/* Botão Retangular Pílula de Encerrar */}
            <button 
              onClick={() => setCallState('ended')}
              className="flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white px-10 py-3.5 rounded-full font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-600/20 cursor-pointer"
            >
              <PhoneOff className="w-5 h-5" />
              <span>Encerrar</span>
            </button>
          </div>
        )}
      </div>

      {/* Caixa Inferior Ficha Limpa */}
      <div className="p-4 sm:p-6 rounded-2xl border border-border bg-panel text-sm shrink-0 overflow-y-auto max-h-[200px] sm:max-h-none">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-accent" />
          <h3 className="text-md font-bold text-accent">Dicas do Coach (B2B)</h3>
        </div>
        <ul className="flex flex-col gap-3 text-foreground/80">
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5 font-bold">•</span>
            <span>Use o padrão <strong>SPIN</strong>: Situação, Problema, Implicação e Necessidade.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5 font-bold">•</span>
            <span>Não venda o produto nos primeiros 3 minutos; venda a próxima reunião.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5 font-bold">•</span>
            <span>Aja com autoridade, mas seja consultivo e empático com o cenário.</span>
          </li>
        </ul>
      </div>

      {/* Renderiza o Popup Condicionalmente, que intercepta tudo */}
      {callState === 'ended' && (
        <EndCallModal onRetry={() => setCallState('idle')} />
      )}
    </div>
  );
}
