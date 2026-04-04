'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Volume2, Play, Pause, RotateCcw, Target, TrendingUp, MessageSquare, Sparkles, ChevronUp, ThumbsUp, ThumbsDown, Lightbulb, ChevronLeft, Download, Loader2 } from 'lucide-react';

function CustomAudioPlayer({ audioUrl, userId }: { audioUrl: string; userId: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const curr = audioRef.current.currentTime;
    setCurrentTime(curr);
    if (isFinite(duration) && duration > 0) {
      setProgress((curr / duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    
    // O WebM gerado por MediaRecorder frequentemente não tem a métrica de duração no Header. 
    // O Chromium lê como Infinity. A solução genial é forçar o pulo pro fim!
    if (audio.duration === Infinity || isNaN(audio.duration)) {
      audio.currentTime = 1e6; // Hack: vai lá pra frente
      const retrieveDuration = () => {
        setDuration(audio.duration);
        audio.currentTime = 0; // Volta
        audio.removeEventListener('seeked', retrieveDuration);
      };
      audio.addEventListener('seeked', retrieveDuration);
    } else {
      setDuration(audio.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current || !isFinite(duration)) return;
    const value = parseFloat(e.target.value);
    const newTime = (value / 100) * duration;
    audioRef.current.currentTime = newTime;
    setProgress(value);
  };

  const formatTime = (time: number) => {
    // Corrige os textos "Infinity" ou "NaN" mostrando zerado visualmente até carregar
    if (!time || !isFinite(time) || isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex flex-col gap-3 mt-4">
      {/* Title Header */}
      <div className="flex items-center gap-2 text-primary ml-1">
        <Volume2 className="w-5 h-5 fill-primary stroke-none" />
        <h3 className="font-serif font-bold text-lg tracking-wide text-foreground">Ouvir gravação</h3>
      </div>

      {/* Main Player Box Minimalista */}
      <div className="bg-[#151515] rounded-[1.5rem] py-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full relative px-4">
        {/* Hidden Audio */}
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          className="hidden" 
          preload="metadata"
        />

        {/* Play/Pause icon (sem bolha preenchida) */}
        <button 
          onClick={togglePlay}
          className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0 cursor-pointer text-foreground/80 hover:text-white transition-colors hover:scale-105 active:scale-95"
          title={isPlaying ? "Pausar" : "Tocar"}
        >
          {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
        </button>

        {/* Timeline Component Estilo YouTube c/ Time Lado a Lado */}
        <div className="flex-1 flex items-center gap-3 w-full">
           <span className="text-[11px] sm:text-xs font-mono text-primary/70 opacity-90 w-8 text-right">
             {formatTime(currentTime)}
           </span>
           
           <input 
             type="range" 
             min="0" 
             max="100" 
             step="0.1"
             value={progress || 0} 
             onChange={handleSeek}
             style={{ background: `linear-gradient(to right, var(--primary) ${progress}%, #3f3f46 ${progress}%)` }}
             className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer slider-thumb-blue focus:outline-none z-10 bg-[#3f3f46]"
           />
           
           <span className="text-[11px] sm:text-xs font-mono text-primary/70 opacity-90 w-8">
             {formatTime(duration)}
           </span>
        </div>

        {/* Action icons (Icones finais vazados) */}
        <div className="flex items-center justify-center gap-5 shrink-0 sm:ml-2 text-foreground/50 w-full sm:w-auto mt-2 sm:mt-0">
           <button 
              onClick={() => { if(audioRef.current) audioRef.current.currentTime = 0; }} 
              className="hover:text-foreground transition-colors cursor-pointer hover:rotate-[-45deg] duration-300"
              title="Reiniciar"
           >
              <RotateCcw className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px]" />
           </button>
           
           <a 
              href={audioUrl} 
              download={`simulacao_user_${userId.substring(0, 6)}.webm`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors cursor-pointer"
              title="Baixar Gravação"
           >
              <Download className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px]" />
           </a>
        </div>
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  const [expandedTurns, setExpandedTurns] = useState<Record<number, boolean>>({
    7: true,
    8: false
  });

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(true);

  useEffect(() => {
    async function loadSimulationData() {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        setActiveUserId(authData.user.id);

        const { data, error } = await supabase
          .from('simulations')
          .select('audio_recording_url')
          .eq('user_id', authData.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data?.audio_recording_url) {
          setAudioUrl(data.audio_recording_url);
        }
      }
      setIsLoadingAudio(false);
    }
    loadSimulationData();
  }, []);

  const toggleTurn = (turnId: number) => {
    setExpandedTurns(prev => ({ ...prev, [turnId]: !prev[turnId] }));
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground pb-20 fade-in animate-in duration-500">
      {/* Header Minimalista (Voltar) */}
      <header className="p-4 px-6 border-b border-border/50 bg-panel flex items-center shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-colors cursor-pointer group">
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold text-sm">Voltar para o Simulador B2B</span>
        </Link>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8 flex flex-col gap-6 mt-4">
        
        {/* Banner de Resultado */}
        <div className="bg-[#2a1111] border border-red-900/50 rounded-3xl p-5 flex items-start gap-4 shadow-lg shadow-red-900/10">
          <div className="bg-red-500/20 p-2.5 rounded-full shrink-0 mt-1 border border-red-500/30">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div className="pt-1">
            <h2 className="text-xl font-bold text-red-500 mb-1 tracking-wide">Não foi dessa vez</h2>
            <p className="text-foreground/60 text-sm">A conversa esfriou, a conexão foi perdida, mas isso é puro aprendizado no Outbound.</p>
          </div>
        </div>

        {/* ======================= MÓDULO DE ÁUDIO ===================== */}
        {isLoadingAudio ? (
           <div className="bg-[#121212] rounded-[1.5rem] p-6 flex items-center justify-center gap-3 w-full mt-4 animate-pulse h-[100px]">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <p className="text-foreground/70 font-bold uppercase tracking-widest text-xs">Carregando Gravação...</p>
           </div>
        ) : audioUrl && activeUserId ? (
           <CustomAudioPlayer audioUrl={audioUrl} userId={activeUserId} />
        ) : (
           <div className="bg-[#121212] rounded-[1.5rem] p-6 flex flex-col items-center justify-center gap-2 w-full mt-4 h-[100px] opacity-70">
              <Volume2 className="w-6 h-6 text-foreground/20" />
              <p className="text-foreground/40 font-semibold italic text-sm">Áudio indisponível</p>
           </div>
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-3 gap-4 mt-2">
          <div className="bg-panel border border-border rounded-3xl p-5 flex flex-col justify-center items-center sm:items-start transition-colors hover:border-foreground/20">
            <div className="flex items-center gap-2 text-foreground/60 mb-2">
              <Target className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent/80">Cenário</span>
            </div>
            <span className="font-bold text-base sm:text-lg">Técnico de TI</span>
          </div>
          
          <div className="bg-panel border border-border rounded-3xl p-5 flex flex-col justify-center items-center sm:items-start transition-colors hover:border-foreground/20">
            <div className="flex items-center gap-2 text-foreground/60 mb-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent/80">Dificuldade</span>
            </div>
            <span className="font-bold text-base sm:text-lg">Difícil</span>
          </div>
          
          <div className="bg-panel border border-border rounded-3xl p-5 flex flex-col justify-center items-center sm:items-start transition-colors hover:border-foreground/20">
            <div className="flex items-center gap-2 text-foreground/60 mb-2">
              <MessageSquare className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent/80">Mensagens</span>
            </div>
            <span className="font-bold text-base sm:text-lg">8 trocas</span>
          </div>
        </div>

        {/* Bloco de "Nota Geral" */}
        <div className="bg-[#1e1313] border border-red-900/30 rounded-[2rem] p-8 relative overflow-hidden mt-4 shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          
          <div className="flex items-center justify-between mb-8 relative">
            <div className="flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-accent" />
              <h3 className="text-3xl font-serif font-bold text-foreground">Nota Geral</h3>
            </div>
            <div className="text-6xl font-black text-red-500 tracking-tighter drop-shadow-sm">1.0</div>
          </div>
          
          <div className="w-full h-2.5 bg-background/50 rounded-full mb-8 overflow-hidden relative border border-black/20">
            <div className="h-full bg-red-500 w-[10%] rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
          </div>

          <p className="text-foreground/70 leading-relaxed text-sm sm:text-base relative z-10 font-medium">
            A conversa foi um fracasso completo, pois o SDR nunca estabeleceu um frame de interação profissional de valor, agindo como um tirador de pedidos. O famoso "Pitch Prematuro" gerou atrito imediato com o Líder Técnico. Faltaram perguntas abertas do framework SPIN. 
          </p>
        </div>

        {/* Analise Turn-by-Turn expansiva */}
        <div className="mt-8 flex flex-col gap-6">
          <h3 className="font-semibold text-lg ml-2 mb-2 tracking-wide">Linha do Tempo</h3>

          {/*================= Card Mock de Fala Expansível 1 (Turno 7) ==================*/}
          <div className="bg-panel border border-border hover:border-accent/30 transition-colors rounded-[2rem] p-6 sm:p-8 shadow-lg shadow-accent/5 overflow-hidden">
             
             {/* Header clicável */}
             <div 
                className="flex items-start gap-4 cursor-pointer select-none group"
                onClick={() => toggleTurn(7)}
             >
               <div className="w-12 h-12 rounded-full bg-accent/20 text-accent text-lg font-bold flex items-center justify-center shrink-0 mt-1 border border-accent/30 shadow-inner group-hover:bg-accent/30 transition-colors">
                 7
               </div>
               
               <div className="flex-1 mt-2">
                 <p className="font-bold text-lg leading-relaxed text-white">
                   "Olá Líder Técnico, desculpa interromper, mas não podia deixar de notar que a equipe cresceu muito rápido."
                 </p>
                 
                 <div className="flex gap-3 mt-5">
                   <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-green-500/20 bg-green-500/10 text-green-500 text-xs font-bold font-mono">
                     <ThumbsUp className="w-3.5 h-3.5" /> 2
                   </div>
                   <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-500/20 bg-red-500/10 text-red-500 text-xs font-bold font-mono">
                     <ThumbsDown className="w-3.5 h-3.5" /> 1
                   </div>
                 </div>
               </div>
               
               {/* Seta Dinamica Baseada no Estado */}
               <button className="text-foreground/40 p-2 transition-colors mt-2">
                 <ChevronUp className={`w-5 h-5 transition-transform duration-300 ${expandedTurns[7] ? 'rotate-0' : 'rotate-180'}`} />
               </button>
             </div>

             {/* Corpo Expansível */}
             <div className={`transition-all duration-300 flex flex-col gap-6 ${expandedTurns[7] ? 'max-h-[1000px] border-t border-border/60 mt-8 pt-8 opacity-100' : 'max-h-0 min-h-0 border-t-0 p-0 m-0 opacity-0 overflow-hidden'}`}>
               <div>
                 <h4 className="text-xs font-black tracking-[0.1em] text-green-500 uppercase mb-4 opacity-90">Pontos Positivos</h4>
                 <ul className="flex flex-col gap-3">
                   <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed font-medium">
                     <ThumbsUp className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                     Elogio contextual, o que seta um bom rapport de observação para Outbound.
                   </li>
                 </ul>
               </div>

               <div>
                 <h4 className="text-xs font-black tracking-[0.1em] text-red-500 uppercase mb-4 opacity-90">Pontos Negativos</h4>
                 <ul className="flex flex-col gap-3">
                   <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed font-medium">
                     <ThumbsDown className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                     O "Desculpa interromper" destrói sua autoridade como especialista nos primeiros segundos de uma ligação complexa.
                   </li>
                 </ul>
               </div>

               <div className="bg-[#241c0e] border border-accent/20 rounded-2xl p-5 mt-2 shadow-inner">
                 <div className="flex items-center gap-2 mb-3 text-accent opacity-90">
                   <Lightbulb className="w-4 h-4 fill-accent" />
                   <h4 className="text-xs font-bold uppercase tracking-widest">Sugestão de Alternativa</h4>
                 </div>
                 <p className="text-sm font-bold text-foreground/90 italic leading-relaxed">
                   "Olá! Notei a rodada de contratações recente de vocês, o que sempre traz desafios de escalabilidade..."
                 </p>
               </div>
             </div>
          </div>

          {/*================= Card Mock de Fala Expansível 2 (Turno 8) ==================*/}
          <div className="bg-panel border border-border hover:border-accent/30 transition-colors rounded-[2rem] p-6 sm:p-8 shadow-lg shadow-accent/5 overflow-hidden">
             
             {/* Header clicável */}
             <div 
                className="flex items-start gap-4 cursor-pointer select-none group"
                onClick={() => toggleTurn(8)}
             >
               <div className="w-12 h-12 rounded-full bg-accent/10 border border-border text-accent/70 text-lg font-bold flex items-center justify-center shrink-0 mt-1 transition-colors">
                 8
               </div>
               
               <div className="flex-1 mt-2">
                 <p className={`font-bold text-lg leading-relaxed text-foreground/70 italic ${!expandedTurns[8] ? 'line-clamp-2' : ''}`}>
                   "Certo Líder... bom, não tem budget. Tem como eu ligar semana que vem pra reavaliarmos se entra uma verba nova pra tentar fechar o negócio?"
                 </p>
                 
                 <div className="flex gap-3 mt-5">
                   <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-green-500/10 bg-green-500/5 text-green-500/50 text-xs font-bold font-mono">
                     <ThumbsUp className="w-3.5 h-3.5" /> 0
                   </div>
                   <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-accent/10 bg-accent/5 text-accent/50 text-xs font-bold font-mono">
                     <Lightbulb className="w-3.5 h-3.5" /> Dica
                   </div>
                 </div>
               </div>
               
               <button className="text-foreground/40 p-2 transition-colors mt-2">
                 <ChevronUp className={`w-5 h-5 transition-transform duration-300 ${expandedTurns[8] ? 'rotate-0' : 'rotate-180'}`} />
               </button>
             </div>

             {/* Corpo Expansível */}
             <div className={`transition-all duration-300 flex flex-col gap-6 ${expandedTurns[8] ? 'max-h-[1000px] border-t border-border/60 mt-8 pt-8 opacity-100' : 'max-h-0 min-h-0 border-t-0 p-0 m-0 opacity-0 overflow-hidden'}`}>
               <div>
                 <h4 className="text-xs font-black tracking-[0.1em] text-red-500 uppercase mb-4 opacity-90">Pontos Negativos</h4>
                 <ul className="flex flex-col gap-3">
                   <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed font-medium">
                     <ThumbsDown className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                     Pedir uma revisão de budget na semana seguinte soa desesperado e ingênuo num ciclo de vendas complexo.
                   </li>
                 </ul>
               </div>

               <div className="bg-[#241c0e] border border-accent/20 rounded-2xl p-5 mt-2 shadow-inner">
                 <div className="flex items-center gap-2 mb-3 text-accent opacity-90">
                   <Lightbulb className="w-4 h-4 fill-accent" />
                   <h4 className="text-xs font-bold uppercase tracking-widest">Sugestão de Alternativa</h4>
                 </div>
                 <p className="text-sm font-bold text-foreground/90 italic leading-relaxed">
                   "Entendo completamente. Sem problemas. Pra não desperdiçarmos o tempo um do outro, faz sentido marcarmos apenas para H2? Aí os projetos e o budget da AWS já estarão melhor alinhados."
                 </p>
               </div>
             </div>
          </div>

        </div>

      </main>
    </div>
  );
}
