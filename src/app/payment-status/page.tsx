'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function PaymentStatus() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [pollingActive, setPollingActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Obter usuário da sessão
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrorMsg('Sessão expirada. Redirecionando para login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
        return;
      }
      setUser(user);
    };

    getUser();
  }, [router]);

  useEffect(() => {
    if (!user || !pollingActive) return;

    // Timer para o botão fallback aparecer após 10 segundos
    const fallbackTimer = setTimeout(() => {
      setShowFallback(true);
    }, 10000);

    // Polling a cada 3 segundos
    const pollInterval = setInterval(async () => {
      try {
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('status, current_period_end')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!subscription) {
          // Assinatura ainda não existe no banco
          return;
        }

        const now = new Date();
        const isValid =
          (subscription.status === 'active' || subscription.status === 'authorized') &&
          (!subscription.current_period_end || new Date(subscription.current_period_end) > now);

        if (isValid) {
          setPollingActive(false);
          clearInterval(pollInterval);
          clearTimeout(fallbackTimer);
          // Aguardar um pouco antes de redirecionar para suavidade visual
          setTimeout(() => {
            router.push('/dashboard');
          }, 500);
        }
      } catch (err) {
        console.error('[PAYMENT-STATUS] Erro ao verificar assinatura:', err);
        // Continuar polling mesmo com erro
      }
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(fallbackTimer);
    };
  }, [user, pollingActive, router]);

  const handleFallbackClick = () => {
    setPollingActive(false);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center max-w-md text-center">
        {/* Logo */}
        <div className="mb-12">
          <img
            src="/SIMULICOLD_LOGO.png"
            alt="Simulicold"
            className="h-20 w-auto object-contain animate-pulse"
          />
        </div>

        {/* Spinner Container */}
        <div className="mb-8 relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500/10 to-blue-500/5 flex items-center justify-center relative">
            <div className="absolute inset-0 border-2 border-transparent border-t-blue-500/50 border-r-blue-500/30 rounded-full animate-spin" />
            <LoaderCircle className="w-12 h-12 text-blue-500 animate-spin relative z-10" />
          </div>
        </div>

        {/* Título */}
        <h2 className="text-3xl font-bold text-white mb-3">
          {errorMsg ? 'Erro na Sessão' : 'Validando seu pagamento...'}
        </h2>

        {/* Subtítulo */}
        <p className="text-slate-400 text-base mb-8 leading-relaxed">
          {errorMsg ? (
            <span className="text-red-400 font-medium">{errorMsg}</span>
          ) : (
            <>
              Por favor, aguarde enquanto sincronizamos com o Mercado Pago.
              <br />
              Isso pode levar alguns segundos.
            </>
          )}
        </p>

        {/* Loading Indicators */}
        {!errorMsg && (
          <div className="flex gap-2 mb-8 justify-center">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        )}

        {/* Fallback Button */}
        {showFallback && !errorMsg && (
          <button
            onClick={handleFallbackClick}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2 shadow-lg"
          >
            <CheckCircle2 className="w-5 h-5" />
            Ir para o Dashboard
          </button>
        )}

        {/* Info Text */}
        <div className="mt-12 pt-8 border-t border-slate-700/50 text-sm text-slate-500">
          <p>Caso não seja redirecionado automaticamente em breve, clique no botão acima.</p>
        </div>
      </div>
    </div>
  );
}
