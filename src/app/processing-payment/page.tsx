'use client';

import { useEffect, useState, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function ProcessingContent() {
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // 1. Captura o plano via URL (veio do email -> callback -> processing)
    const plan = searchParams.get('plan');

    if (!plan) {
      window.location.href = '/#preco';
      return;
    }

    // 2. Transfere silenciosamente o usuário pro Mercado Pago API de forma imediata. 
    // Como a página só foi carregada via Auth Callback, os cookies JWT já existem no servidor via @supabase/ssr.
    const createCheckout = async () => {
      try {
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ planType: plan }),
        });
        
        const result = await response.json();
        
        if (response.ok && result.init_point) {
          window.location.href = result.init_point;
          return;
        } else {
          throw new Error(result.error || 'Falha técnica ao gerar a cobrança.');
        }
      } catch (err) {
        console.error('[Processing] Erro:', err);
        setErrorMsg('Erro de rede. Voltando aos planos...');
        setTimeout(() => {
            window.location.href = '/#preco';
        }, 1500);
      }
    };

    createCheckout();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center font-sans">
      <div className="flex flex-col items-center max-w-sm text-center">
        <img src="/SIMULICOLD_LOGO.png" alt="Simulicold" className="h-16 w-auto mb-8 animate-pulse" />
        
        <div className="mb-6 bg-blue-900/20 p-5 rounded-full relative">
           <div className="absolute inset-0 border-2 border-blue-500/30 rounded-full animate-ping opacity-50"></div>
           <Loader2 className="w-10 h-10 text-blue-500 animate-spin relative z-10" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">Preparando pagamento...</h2>
        <p className="text-slate-400 text-sm">
          {errorMsg ? (
            <span className="text-red-400 font-semibold">{errorMsg}</span>
          ) : (
            'Construindo seu ambiente totalmente seguro pelo Mercado Pago.'
          )}
        </p>
      </div>
    </div>
  );
}

// Em App Router com TS e Netlify/Vercel edge limits search params em runtime, é vital englobar debaixo de suspense client boundaries
export default function ProcessingPayment() {
  return (
    <Suspense fallback={<div className="bg-[#070b14] min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>}>
      <ProcessingContent />
    </Suspense>
  );
}
