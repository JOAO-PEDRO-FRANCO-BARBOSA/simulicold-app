import Link from 'next/link';
import { FileText, ArrowRight, CheckCircle2 } from 'lucide-react';

const plans = [
  {
    name: 'Mensal',
    price: 'R$ 60',
    description: 'Renovação mensal com flexibilidade para testar e provar valor rapidamente.',
    href: '/login?register=true&plan=mensal',
    featured: false,
  },
  {
    name: 'Trimestral',
    price: 'R$ 170',
    description: 'Acesso total por 3 meses com equilíbrio entre custo e continuidade.',
    href: '/login?register=true&plan=trimestral',
    featured: true,
  },
  {
    name: 'Semestral',
    price: 'R$ 335',
    description: 'Acesso completo por 6 meses para equipes que querem escala com previsibilidade.',
    href: '/login?register=true&plan=semestral',
    featured: false,
  },
];

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-[#070b14] text-slate-200 font-sans selection:bg-blue-600/30">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden flex justify-center items-center opacity-30 mix-blend-screen">
        <div className="w-[120vw] h-[120vh] bg-[radial-gradient(ellipse_at_center,rgba(29,78,216,0.15),transparent_60%)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <svg className="absolute w-full h-full stroke-blue-500/10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="checkout-net" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M100 0L0 100M0 0l100 100" strokeWidth="0.5" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#checkout-net)" />
        </svg>
      </div>

      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-300 text-sm font-medium mb-6">
            <CheckCircle2 className="w-4 h-4" />
            Fluxo de assinatura
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight text-white">
            Escolha seu plano e continue o cadastro.
          </h1>
          <p className="text-lg md:text-xl text-slate-400 leading-relaxed">
            Se você já tem conta, o login vai te levar direto para a cobrança correta. Se não tem, escolha um plano e crie sua conta.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 flex flex-col text-center border transition-all ${
                plan.featured
                  ? 'bg-[#131b2c] border-blue-600/60 shadow-[0_0_30px_rgba(37,99,235,0.12)] scale-[1.02]'
                  : 'bg-[#0f1523] border-blue-900/30 hover:border-blue-700/50'
              }`}
            >
              <div className="w-12 h-12 bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-400">
                <FileText className="w-5 h-5" />
              </div>

              <h2 className="text-xl font-bold text-white mb-2">{plan.name}</h2>
              <div className="text-blue-400 font-semibold mb-6">({plan.price})</div>
              <p className="text-slate-400 text-sm mb-8 flex-1">{plan.description}</p>

              <Link
                href={plan.href}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2"
              >
                Assinar agora
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16 max-w-4xl mx-auto bg-[#0f1523]/80 border border-blue-900/30 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">Já tem conta?</h3>
          <p className="text-slate-400 mb-6">
            Entre com seu e-mail e senha para que o sistema identifique sua assinatura e siga automaticamente para o dashboard ou cobrança.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-700 hover:border-blue-500 text-white hover:text-blue-400 transition-all"
          >
            Entrar
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
