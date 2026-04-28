import Link from 'next/link';
import { Mic, FileText, Users, History } from 'lucide-react';
import Image from 'next/image';
import PricingSection from '@/components/PricingSection';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-200 font-sans selection:bg-blue-600/30">
      {/* Network Background Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden flex justify-center items-center opacity-30 mix-blend-screen">
        <div className="w-[120vw] h-[120vh] bg-[radial-gradient(ellipse_at_center,rgba(29,78,216,0.15),transparent_60%)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <svg className="absolute w-full h-full stroke-blue-500/10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="net" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M100 0L0 100M0 0l100 100" strokeWidth="0.5" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#net)" />
        </svg>
      </div>

      {/* Header */}
      <header className="relative z-50 bg-[#070b14]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/SIMULICOLD_LOGO.png" alt="Simulicold" width={360} height={80} className="h-16 w-auto object-contain" priority />
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="px-6 py-2 border border-slate-700 hover:border-blue-500 text-sm font-medium text-white hover:text-blue-400 rounded-lg transition-all"
            >
              Entrar
            </Link>
            <Link 
              href="/login?register=true" 
              className="hidden md:flex px-6 py-2 bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)]"
            >
              Cadastrar
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center">
        {/* Hero Section */}
        <section className="pt-24 pb-20 px-6 w-full max-w-5xl mx-auto text-center flex flex-col items-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight text-white">
            Treine Cold Calls com IA.<br/>
            <span className="text-blue-500">Receba Feedbacks Instantâneos.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl leading-relaxed">
            Domine Tom de Voz, Linguagem e Script.<br/>
            Escale sua Equipe com Dados.
          </p>
          
          <Link 
            href="/login" 
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-base font-semibold rounded-lg transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] mb-20"
          >
            Começar Agora
          </Link>

          {/* Features Grid (Inside Hero Area as per reference) */}
          <div id="funcionalidades" className="grid md:grid-cols-2 gap-4 w-full text-left">
            {/* Feature 1 */}
            <div className="bg-[#0f1523]/80 backdrop-blur-sm border border-blue-900/30 rounded-xl p-8 hover:border-blue-700/50 transition-colors">
              <Mic className="w-8 h-8 text-blue-500 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Análise de Tom de Voz</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Treine Cold Calls com IA e receba feedbacks da análise de entonação e ritmo da voz.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#0f1523]/80 backdrop-blur-sm border border-blue-900/30 rounded-xl p-8 hover:border-blue-700/50 transition-colors">
              <FileText className="w-8 h-8 text-blue-500 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Roteiros Dinâmicos</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Domine o script ideal para cada cenário. Ferramentas integradas para guiar seu discurso.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#0f1523]/80 backdrop-blur-sm border border-blue-900/30 rounded-xl p-8 hover:border-blue-700/50 transition-colors">
              <Users className="w-8 h-8 text-blue-500 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Personas Customizáveis</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Configure perfis de clientes específicos. Adapte os treinamentos à sua base ideal.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-[#0f1523]/80 backdrop-blur-sm border border-blue-900/30 rounded-xl p-8 hover:border-blue-700/50 transition-colors">
              <History className="w-8 h-8 text-blue-500 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Histórico de Evolução</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Evolua seu time de vendas com gráficos precisos de resultados de cada consultor acompanhando seu desenvolvimento.
              </p>
            </div>
          </div>
        </section>

        {/* Como Funciona Section */}
        <section id="como-funciona" className="py-32 px-6 w-full max-w-6xl mx-auto border-t border-white/5">
          <div className="text-center mb-24">
            <span className="text-blue-500 font-bold tracking-widest text-sm uppercase mb-3 block">SIMPLES ASSIM</span>
            <h2 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight">
              Como funciona
            </h2>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start gap-16 md:gap-10 relative max-w-5xl mx-auto">
            {/* Dotted Connecting Line (desktop only) */}
            <div className="hidden md:block absolute top-[3.5rem] left-[15%] right-[15%] h-[4px] border-t-[4px] border-dashed border-blue-500/50 z-0 pointer-events-none"></div>

            {/* Step 1 */}
            <div className="flex flex-col items-center text-center flex-1 relative z-10 w-full group">
              <div className="w-28 h-28 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white font-black text-4xl mb-10 relative shadow-[0_0_40px_rgba(37,99,235,0.4)] group-hover:scale-105 transition-transform duration-300">
                1
                <div className="absolute -top-4 -right-4 text-4xl drop-shadow-xl bg-[#0f1523] rounded-full p-2 border border-white/5">💬</div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Defina o cenário</h3>
              <p className="text-slate-400 text-base leading-relaxed max-w-[280px]">
                Adicione as informações do seu produto, lead e principais objeções com apenas alguns cliques.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center flex-1 relative z-10 w-full group">
              <div className="w-28 h-28 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white font-black text-4xl mb-10 relative shadow-[0_0_40px_rgba(37,99,235,0.4)] group-hover:scale-105 transition-transform duration-300">
                2
                <div className="absolute -top-4 -right-4 text-4xl drop-shadow-xl bg-[#0f1523] rounded-full p-2 border border-white/5">🤖</div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">IA simula o cliente</h3>
              <p className="text-slate-400 text-base leading-relaxed max-w-[280px]">
                Nossa IA atua como um prospect realista em uma chamada de voz dinâmica e interativa.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center flex-1 relative z-10 w-full group">
              <div className="w-28 h-28 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white font-black text-4xl mb-10 relative shadow-[0_0_40px_rgba(37,99,235,0.4)] group-hover:scale-105 transition-transform duration-300">
                3
                <div className="absolute -top-4 -right-4 text-4xl drop-shadow-xl bg-[#0f1523] rounded-full p-2 border border-white/5">📈</div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Feedback detalhado</h3>
              <p className="text-slate-400 text-base leading-relaxed max-w-[280px]">
                A análise é gerada e apresentada automaticamente com pontuações e dicas de melhoria.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Section (Packages) */}
        <PricingSection />
      </main>

      {/* Footer */}
      <footer id="sobre" className="relative z-10 bg-[#04070c] border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8 items-center text-sm">
          {/* Logo Simulicold */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <Image src="/SIMULICOLD_LOGO.png" alt="Simulicold" width={320} height={72} className="h-14 md:h-16 w-auto object-contain opacity-90" />
          </div>
          
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-slate-500">
              Simulicold é uma ferramenta de treinamento de vendas com IA desenvolvida pela CONSELT Empresa Júnior.
            </span>
            <span className="text-slate-600 text-xs text-center">
              © 2026 SIMULICOLD. Todos os direitos reservados.
            </span>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-3">
             <a href="https://www.conselt.com.br" target="_blank" rel="noreferrer" className="group flex flex-col items-center md:items-end gap-1 opacity-80 hover:opacity-100 transition-opacity">
               <Image src="/CONSELT_LOGO.png" alt="CONSELT" width={320} height={90} className="h-20 md:h-28 w-auto object-contain" />
             </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
