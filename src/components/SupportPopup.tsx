'use client';

import { useState } from 'react';
import { MessageCircleQuestion, X, Send } from 'lucide-react';

export function SupportPopup() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Pop-up Modal */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-panel border border-border rounded-2xl shadow-2xl p-4 flex flex-col mb-4 bg-zinc-900 origin-bottom-right animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-md text-foreground">Feedback & Suporte</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-foreground/50 hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-sm text-foreground/70 mb-4">
            Encontrou algum problema ou tem sugestões para melhorar a IA?
          </p>

          <textarea 
            className="w-full bg-background border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 resize-none h-24 mb-3"
            placeholder="Descreva aqui..."
          />
          
          <button className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl font-medium transition-colors cursor-pointer">
            <Send className="w-4 h-4" />
            <span>Enviar Feedback</span>
          </button>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-primary hover:bg-primary-hover text-white rounded-full flex items-center justify-center shadow-xl shadow-primary/20 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircleQuestion className="w-6 h-6" />}
      </button>
    </div>
  );
}
