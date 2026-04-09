'use client';

import { useState } from 'react';
import { MessageCircleQuestion, X, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export function SupportPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Erro ao enviar');
      }

      setMessage('');
      setIsOpen(false);
      showToast('success', 'Feedback enviado com sucesso! Obrigado. 🎉');
    } catch (err: any) {
      showToast('error', 'Falha ao enviar. Tente novamente.');
      console.error('Erro ao enviar feedback:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border animate-in slide-in-from-top-3 fade-in duration-300 ${
          toast.type === 'success'
            ? 'bg-emerald-950 border-emerald-500/30 text-emerald-300'
            : 'bg-red-950 border-red-500/30 text-red-300'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            : <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          }
          <span className="text-sm font-semibold">{toast.text}</span>
        </div>
      )}

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
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSending}
            />

            <button
              onClick={handleSend}
              disabled={isSending || !message.trim()}
              className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar Feedback</span>
                </>
              )}
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
    </>
  );
}
