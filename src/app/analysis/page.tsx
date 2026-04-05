'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Volume2, Play, Pause, RotateCcw, Target, TrendingUp, MessageSquare, Sparkles, ChevronLeft, Download, Loader2, User, Bot } from 'lucide-react';

// ========================== AUDIO PLAYER ==========================
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

      {/* Main Player Box */}
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

        {/* Play/Pause */}
        <button 
          onClick={togglePlay}
          className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0 cursor-pointer text-foreground/80 hover:text-white transition-colors hover:scale-105 active:scale-95"
          title={isPlaying ? "Pausar" : "Tocar"}
        >
          {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
        </button>

        {/* Timeline */}
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

        {/* Actions */}
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

// ========================== TRANSCRIPT CHAT BUBBLES ==========================
interface TranscriptMessage {
  role: string;
  content: string;
}

function TranscriptChat({ messages }: { messages: TranscriptMessage[] }) {
  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-foreground/30">
        <MessageSquare className="w-10 h-10 mb-3" />
        <p className="text-sm font-semibold">Nenhuma transcrição disponível</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg, i) => {
        const isUser = msg.role === 'user';
        return (
          <div
            key={i}
            className={`flex items-end gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white shadow-md ${
              isUser 
                ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' 
                : 'bg-gradient-to-br from-slate-600 to-slate-800 border border-border'
            }`}>
              {isUser 
                ? <User className="w-4 h-4" /> 
                : <Bot className="w-4 h-4" />
              }
            </div>

            {/* Bubble */}
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
              isUser
                ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-100 rounded-br-md'
                : 'bg-[#1a1a1a] border border-border text-foreground/85 rounded-bl-md'
            }`}>
              {/* Label */}
              <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${
                isUser ? 'text-emerald-400/80' : 'text-foreground/40'
              }`}>
                {isUser ? 'Vendedor' : 'Cliente'}
              </span>
              <p className="font-medium">{msg.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ========================== MAIN PAGE ==========================
interface SimulationData {
  audio_recording_url: string | null;
  transcript: TranscriptMessage[] | null;
  difficulty_level: string;
  persona_id: string;
  created_at: string;
}

export default function AnalysisPage() {
  const [simulation, setSimulation] = useState<SimulationData | null>(null);
  const [personaName, setPersonaName] = useState('—');
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSimulationData() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        setIsLoading(false);
        return;
      }

      setActiveUserId(authData.user.id);

      // Buscar a última simulação
      const { data, error } = await supabase
        .from('simulations')
        .select('audio_recording_url, transcript, difficulty_level, persona_id, created_at')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        // Parsear o transcript — pode vir como string JSON ou já como array
        let parsedTranscript: TranscriptMessage[] | null = null;
        if (data.transcript) {
          if (typeof data.transcript === 'string') {
            try {
              parsedTranscript = JSON.parse(data.transcript);
            } catch {
              parsedTranscript = null;
            }
          } else if (Array.isArray(data.transcript)) {
            parsedTranscript = data.transcript as TranscriptMessage[];
          }
        }

        setSimulation({
          audio_recording_url: data.audio_recording_url,
          transcript: parsedTranscript,
          difficulty_level: data.difficulty_level,
          persona_id: data.persona_id,
          created_at: data.created_at,
        });

        // Busca o nome da persona
        if (data.persona_id) {
          const { data: persona } = await supabase
            .from('personas')
            .select('name')
            .eq('id', data.persona_id)
            .single();
          if (persona) setPersonaName(persona.name);
        }
      }

      if (error) console.error('Erro ao buscar simulação:', error);
      setIsLoading(false);
    }
    loadSimulationData();
  }, []);

  const difficultyLabel = (d: string) => {
    const map: Record<string, string> = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
    return map[d] || d;
  };

  const messageCount = simulation?.transcript?.length ?? 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-foreground/60 font-bold uppercase tracking-widest text-xs">Carregando análise...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground pb-20 fade-in animate-in duration-500">
      {/* Header */}
      <header className="p-4 px-6 border-b border-border/50 bg-panel flex items-center shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-colors cursor-pointer group">
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold text-sm">Voltar para o Simulador B2B</span>
        </Link>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8 flex flex-col gap-6 mt-4">
        
        {/* Banner de Resultado */}
        <div className="bg-[#111827] border border-blue-900/50 rounded-3xl p-5 flex items-start gap-4 shadow-lg shadow-blue-900/10">
          <div className="bg-blue-500/20 p-2.5 rounded-full shrink-0 mt-1 border border-blue-500/30">
            <Sparkles className="w-6 h-6 text-blue-400" />
          </div>
          <div className="pt-1">
            <h2 className="text-xl font-bold text-blue-400 mb-1 tracking-wide">Análise da Simulação</h2>
            <p className="text-foreground/60 text-sm">Revise sua performance — ouça o áudio e releia a conversa completa.</p>
          </div>
        </div>

        {/* ======================= MÓDULO DE ÁUDIO ===================== */}
        {simulation?.audio_recording_url && activeUserId ? (
           <CustomAudioPlayer audioUrl={simulation.audio_recording_url} userId={activeUserId} />
        ) : (
           <div className="bg-[#121212] rounded-[1.5rem] p-6 flex flex-col items-center justify-center gap-2 w-full mt-4 h-[100px] opacity-70">
              <Volume2 className="w-6 h-6 text-foreground/20" />
              <p className="text-foreground/40 font-semibold italic text-sm">Áudio indisponível para esta simulação</p>
           </div>
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-3 gap-4 mt-2">
          <div className="bg-panel border border-border rounded-3xl p-5 flex flex-col justify-center items-center sm:items-start transition-colors hover:border-foreground/20">
            <div className="flex items-center gap-2 text-foreground/60 mb-2">
              <Target className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent/80">Cenário</span>
            </div>
            <span className="font-bold text-base sm:text-lg">{personaName}</span>
          </div>
          
          <div className="bg-panel border border-border rounded-3xl p-5 flex flex-col justify-center items-center sm:items-start transition-colors hover:border-foreground/20">
            <div className="flex items-center gap-2 text-foreground/60 mb-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent/80">Dificuldade</span>
            </div>
            <span className="font-bold text-base sm:text-lg">{simulation ? difficultyLabel(simulation.difficulty_level) : '—'}</span>
          </div>
          
          <div className="bg-panel border border-border rounded-3xl p-5 flex flex-col justify-center items-center sm:items-start transition-colors hover:border-foreground/20">
            <div className="flex items-center gap-2 text-foreground/60 mb-2">
              <MessageSquare className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent/80">Mensagens</span>
            </div>
            <span className="font-bold text-base sm:text-lg">{messageCount} trocas</span>
          </div>
        </div>

        {/* ======================= TRANSCRIÇÃO ===================== */}
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center gap-2.5 ml-1">
            <MessageSquare className="w-5 h-5 text-accent" />
            <h3 className="font-serif font-bold text-lg tracking-wide text-foreground">Transcrição Completa</h3>
          </div>

          <div className="bg-panel border border-border rounded-[2rem] p-6 sm:p-8 shadow-lg overflow-hidden">
            <TranscriptChat messages={simulation?.transcript ?? []} />
          </div>
        </div>

      </main>
    </div>
  );
}
