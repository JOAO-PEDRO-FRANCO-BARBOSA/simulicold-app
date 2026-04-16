'use client';

import { Sparkles, MessageSquare } from 'lucide-react';

interface Props {
  messages?: { role: string, content: string }[];
}

export function TranscriptionPanel({ messages = [] }: Props) {
  const stripMarkup = (text: string) => text.replace(/<[^>]*>?/gm, '').trim();

  return (
    <div className="flex flex-col h-full gap-4 animate-in fade-in zoom-in-95 duration-500">
      {/* Área da Transcrição */}
      <div className="flex-1 rounded-3xl border border-border bg-panel flex flex-col relative transition-all duration-300 shadow-sm">
        
        <div className="p-5 border-b border-border flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-accent" />
          <h2 className="text-md font-semibold tracking-wide text-foreground/90">Conversa</h2>
        </div>

        {/* Estado Vazio (Mock para Transcrição Ocorrendo) */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth flex flex-col gap-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 relative h-full">
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 text-foreground/5 pointer-events-none" />
              
              <div className="z-10 flex flex-col items-center opacity-70">
                <Sparkles className="w-10 h-10 text-foreground/30 mb-5" />
                <p className="text-foreground/60 text-lg font-medium mb-2 tracking-wide">A conversa aparecerá aqui</p>
                <p className="text-foreground/40 text-sm">Fale com o cliente para ver a transcrição</p>
              </div>
            </div>
          ) : (
            messages.filter(m => m.role !== 'system').map((msg, index) => (
              <div 
                key={index} 
                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] rounded-2xl p-4 ${
                    msg.role === 'user' 
                      ? 'bg-blue-600/10 border border-blue-500/20 text-foreground rounded-tr-none' 
                      : 'bg-accent/10 border border-accent/20 text-foreground rounded-tl-none'
                  }`}
                >
                  <p className="text-sm font-semibold mb-1 opacity-50 uppercase tracking-widest text-[10px]">
                    {msg.role === 'user' ? 'Você' : 'Cliente'}
                  </p>
                  <p className="text-[15px] leading-relaxed">{stripMarkup(msg.content)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
