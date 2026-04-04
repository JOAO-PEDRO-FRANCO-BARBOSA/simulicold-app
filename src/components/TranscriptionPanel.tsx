'use client';

import { Sparkles, MessageSquare } from 'lucide-react';

export function TranscriptionPanel() {
  return (
    <div className="flex flex-col h-full gap-4 animate-in fade-in zoom-in-95 duration-500">
      {/* Área da Transcrição */}
      <div className="flex-1 rounded-3xl border border-border bg-panel flex flex-col relative transition-all duration-300 shadow-sm">
        
        <div className="p-5 border-b border-border flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-accent" />
          <h2 className="text-md font-semibold tracking-wide text-foreground/90">Conversa</h2>
        </div>

        {/* Estado Vazio (Mock para Transcrição Ocorrendo) */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden h-full">
          {/* Fundo Decorativo Sutil */}
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 text-foreground/5" />
          
          <div className="z-10 flex flex-col items-center opacity-70">
            <Sparkles className="w-10 h-10 text-foreground/30 mb-5" />
            <p className="text-foreground/60 text-lg font-medium mb-2 tracking-wide">A conversa aparecerá aqui</p>
            <p className="text-foreground/40 text-sm">Inicie a simulação para começar</p>
          </div>
        </div>
      </div>
    </div>
  );
}
