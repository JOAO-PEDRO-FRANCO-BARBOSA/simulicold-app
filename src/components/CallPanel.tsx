'use client';

import { Phone, Sparkles, MessageSquare } from 'lucide-react';

export function CallPanel() {
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Call Main Area */}
      <div className="flex-1 rounded-2xl border border-border bg-panel flex flex-col">
        {/* Call Area Header */}
        <div className="p-4 border-b border-border flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="text-md font-semibold">Conversa</h2>
        </div>

        {/* Call Area Content (Empty State) */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
          {/* Background decoration */}
          <Sparkles className="absolute bottom-8 right-8 w-12 h-12 text-foreground/5" />
          
          <div className="w-24 h-24 bg-background rounded-full border border-border flex items-center justify-center mb-6 shadow-xl">
            <Phone className="w-10 h-10 text-foreground/50" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Pronto para iniciar</h3>
          <p className="text-foreground/60 mb-8">Clique no botão para simular a ligação</p>

          <button className="flex items-center gap-3 bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-full font-bold text-lg transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-primary/25 cursor-pointer">
            <Phone className="w-6 h-6" />
            <span>Iniciar Chamada</span>
          </button>
        </div>
      </div>

      {/* Quick Tips Box */}
      <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-md font-bold text-primary">Dicas do Coach (B2B)</h3>
        </div>
        <ul className="flex flex-col gap-2 text-sm text-foreground/80">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Use o padrão <strong>SPIN</strong>: Situação, Problema, Implicação e Necessidade.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Não venda o produto nos primeiros 3 minutos; venda a próxima reunião.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Aja com autoridade, mas seja consultivo e empático com o cenário.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
