'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  AlertTriangle, Volume2, Play, Pause, RotateCcw, Target, TrendingUp,
  MessageSquare, Sparkles, ChevronLeft, Download, Loader2, User, Bot,
  Award, BookOpen, Shield, Zap, Star, ArrowUpRight, BarChart3, RefreshCw,
  ThumbsUp, ThumbsDown, Lightbulb
} from 'lucide-react';

// ========================== TYPES ==========================
interface TranscriptMessage {
  role: string;
  content: string;
}

interface FeedbackDetail {
  pontos_positivos: string[];
  pontos_negativos: string[];
  sugestao_alternativa: string;
}

interface MessageFeedback {
  message_index: number;
  score: number;
  feedback: FeedbackDetail | string; // Suporta formato antigo (string) e novo (objeto)
  category: 'Abertura' | 'Qualificação' | 'Contorno de Objeção' | 'Fechamento' | 'Rapport';
}

interface AnalysisData {
  overall_score: number;
  overall_feedback: string;
  messages_feedback: MessageFeedback[];
}

interface SimulationData {
  id: string;
  audio_recording_url: string | null;
  transcript: TranscriptMessage[] | null;
  analysis_data: AnalysisData | null;
  difficulty_level: string;
  persona_id: string;
  created_at: string;
}

// ========================== UTILITY: Score Color ==========================
// Função utilitária centralizada para calcular cores baseadas na nota (0-10)
function getScoreColorScheme(score: number) {
  if (score >= 8) return {
    stroke: '#22c55e', // green-500
    text: 'text-green-400',
    bg: 'from-emerald-500/20 to-emerald-600/10',
    border: 'border-emerald-500/40',
    glow: 'shadow-emerald-500/20',
    label: 'Excelente',
    tailwindText: 'text-emerald-400',
  };
  if (score >= 5) return {
    stroke: '#eab308', // yellow-500
    text: 'text-yellow-400',
    bg: 'from-amber-500/20 to-amber-600/10',
    border: 'border-amber-500/40',
    glow: 'shadow-amber-500/20',
    label: score >= 6 ? 'Bom' : 'Regular',
    tailwindText: 'text-amber-400',
  };
  return {
    stroke: '#ef4444', // red-500
    text: 'text-red-400',
    bg: 'from-red-500/20 to-red-600/10',
    border: 'border-red-500/40',
    glow: 'shadow-red-500/20',
    label: 'Precisa melhorar',
    tailwindText: 'text-red-400',
  };
}

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

    if (audio.duration === Infinity || isNaN(audio.duration)) {
      audio.currentTime = 1e6;
      const retrieveDuration = () => {
        setDuration(audio.duration);
        audio.currentTime = 0;
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
      <div className="flex items-center gap-2 text-primary ml-1">
        <Volume2 className="w-5 h-5 fill-primary stroke-none" />
        <h3 className="font-serif font-bold text-lg tracking-wide text-foreground">Ouvir gravação</h3>
      </div>

      <div className="bg-[#151515] rounded-[1.5rem] py-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full relative px-4">
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
          preload="metadata"
        />

        <button
          onClick={togglePlay}
          className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0 cursor-pointer text-foreground/80 hover:text-white transition-colors hover:scale-105 active:scale-95"
          title={isPlaying ? "Pausar" : "Tocar"}
        >
          {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
        </button>

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

        <div className="flex items-center justify-center gap-5 shrink-0 sm:ml-2 text-foreground/50 w-full sm:w-auto mt-2 sm:mt-0">
          <button
            onClick={() => { if (audioRef.current) audioRef.current.currentTime = 0; }}
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

// ========================== SVG SCORE CIRCLE ==========================
// Círculo dinâmico com progresso SVG — cor muda conforme nota (0-10)
function ScoreCircle({ score }: { score: number }) {
  const safeScore = Math.max(0, Math.min(10, score || 0));
  const colors = getScoreColorScheme(safeScore);

  // SVG circle math
  const size = 144; // px
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (safeScore / 10) * circumference;
  const dashOffset = circumference - progress;

  return (
    <div className={`relative flex flex-col items-center justify-center shrink-0`}>
      <svg width={size} height={size} className="transform -rotate-90" style={{ filter: `drop-shadow(0 0 12px ${colors.stroke}30)` }}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Score number + label (inside the circle) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl sm:text-5xl font-black leading-none ${colors.tailwindText}`}>
          {safeScore}
        </span>
        <span className={`text-[10px] font-bold uppercase tracking-widest ${colors.tailwindText} opacity-80 mt-1`}>
          {colors.label}
        </span>
      </div>
      {/* Star badge */}
      <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#0a0a0a] border ${colors.border} flex items-center justify-center`}>
        <Star className={`w-4 h-4 ${colors.tailwindText}`} />
      </div>
    </div>
  );
}

// ========================== CATEGORY BADGE ==========================
function CategoryBadge({ category }: { category: string }) {
  const categoryConfig: Record<string, { icon: typeof Zap; color: string }> = {
    'Abertura': { icon: Zap, color: 'text-blue-400 bg-blue-500/15 border-blue-500/30' },
    'Qualificação': { icon: Target, color: 'text-purple-400 bg-purple-500/15 border-purple-500/30' },
    'Contorno de Objeção': { icon: Shield, color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
    'Fechamento': { icon: Award, color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
    'Rapport': { icon: BookOpen, color: 'text-pink-400 bg-pink-500/15 border-pink-500/30' },
  };

  const config = categoryConfig[category] || { icon: MessageSquare, color: 'text-gray-400 bg-gray-500/15 border-gray-500/30' };
  const IconComponent = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${config.color}`}>
      <IconComponent className="w-3 h-3" />
      {category}
    </span>
  );
}

// ========================== DYNAMIC SCORE PILL ==========================
function ScorePill({ score }: { score: number }) {
  const safeScore = Math.max(1, Math.min(10, score || 1));
  const colors = getScoreColorScheme(safeScore);

  return (
    <div
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold text-xs font-mono shrink-0 transition-all duration-500 border ${colors.border}`}
      style={{ backgroundColor: `${colors.stroke}18`, color: colors.stroke }}
    >
      <span>{safeScore}</span>
      <span style={{ opacity: 0.6 }}>/10</span>
    </div>
  );
}

// ========================== FEEDBACK CARD (STRUCTURED) ==========================
function FeedbackCard({
  feedback,
  originalMessage,
  index
}: {
  feedback: MessageFeedback;
  originalMessage: string;
  index: number;
}) {
  const safeScore = Math.max(1, Math.min(10, feedback?.score || 1));
  const colors = getScoreColorScheme(safeScore);

  // Normalizar feedback: suporta formato antigo (string) e novo (objeto)
  const feedbackData: FeedbackDetail = typeof feedback?.feedback === 'string'
    ? { pontos_positivos: [], pontos_negativos: [feedback.feedback], sugestao_alternativa: '' }
    : (feedback?.feedback || { pontos_positivos: [], pontos_negativos: [], sugestao_alternativa: '' });

  return (
    <div
      className="bg-[#0f0f0f] border border-border/60 rounded-2xl p-5 hover:border-foreground/15 transition-all duration-300 group"
      style={{ borderLeftWidth: '3px', borderLeftColor: colors.stroke }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[10px] font-bold text-foreground/30 font-mono">#{index + 1}</span>
          <CategoryBadge category={feedback?.category || 'Rapport'} />
        </div>
        <ScorePill score={safeScore} />
      </div>

      {/* Fala original do vendedor */}
      <div className="bg-emerald-600/8 border border-emerald-500/15 rounded-xl px-4 py-3 mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/60 block mb-1">Sua fala</span>
        <p className="text-sm text-emerald-100/80 leading-relaxed">{originalMessage}</p>
      </div>

      {/* === PONTOS POSITIVOS === */}
      {feedbackData.pontos_positivos.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <ThumbsUp className="w-3.5 h-3.5 text-green-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-green-400/80">Pontos Positivos</span>
          </div>
          <ul className="space-y-1.5 ml-5">
            {feedbackData.pontos_positivos.map((ponto, i) => (
              <li key={i} className="text-sm text-green-300/80 leading-relaxed flex items-start gap-2">
                <span className="text-green-500 mt-1 text-[8px]">●</span>
                <span>{ponto}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* === PONTOS NEGATIVOS === */}
      {feedbackData.pontos_negativos.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <ThumbsDown className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-400/80">Pontos Negativos</span>
          </div>
          <ul className="space-y-1.5 ml-5">
            {feedbackData.pontos_negativos.map((ponto, i) => (
              <li key={i} className="text-sm text-red-300/70 leading-relaxed flex items-start gap-2">
                <span className="text-red-500 mt-1 text-[8px]">●</span>
                <span>{ponto}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* === SUGESTÃO ALTERNATIVA === */}
      {feedbackData.sugestao_alternativa && (
        <div className="bg-yellow-900/15 border border-yellow-600/25 rounded-xl px-4 py-3 mt-3">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400/80">Sugestão de Alternativa</span>
          </div>
          <p className="text-sm text-yellow-100/75 leading-relaxed italic">
            &ldquo;{feedbackData.sugestao_alternativa}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}

// ========================== SKELETON FEEDBACK CARD ==========================
function SkeletonFeedbackCard() {
  return (
    <div className="bg-[#0f0f0f] border border-border/40 rounded-2xl p-5 animate-pulse" style={{ borderLeftWidth: '3px', borderLeftColor: 'rgba(16, 185, 129, 0.15)' }}>
      {/* Header skeleton */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-3 bg-foreground/5 rounded" />
          <div className="w-24 h-5 bg-foreground/5 rounded-full" />
        </div>
        <div className="w-14 h-6 bg-emerald-500/10 rounded-full" />
      </div>

      {/* Message skeleton */}
      <div className="bg-emerald-600/5 border border-emerald-500/10 rounded-xl px-4 py-3 mb-3">
        <div className="w-12 h-2 bg-emerald-500/10 rounded mb-2" />
        <div className="space-y-1.5">
          <div className="w-full h-3 bg-emerald-500/8 rounded" />
          <div className="w-3/4 h-3 bg-emerald-500/8 rounded" />
        </div>
      </div>

      {/* Positive skeleton */}
      <div className="mb-3">
        <div className="w-28 h-3 bg-green-500/10 rounded mb-2" />
        <div className="w-full h-3 bg-green-500/5 rounded ml-5" />
      </div>

      {/* Negative skeleton */}
      <div className="mb-3">
        <div className="w-28 h-3 bg-red-500/10 rounded mb-2" />
        <div className="w-full h-3 bg-red-500/5 rounded ml-5" />
      </div>

      {/* Suggestion skeleton */}
      <div className="bg-yellow-900/10 border border-yellow-600/15 rounded-xl px-4 py-3">
        <div className="w-36 h-3 bg-yellow-500/10 rounded mb-2" />
        <div className="space-y-1.5">
          <div className="w-full h-3 bg-yellow-500/5 rounded" />
          <div className="w-2/3 h-3 bg-yellow-500/5 rounded" />
        </div>
      </div>
    </div>
  );
}

// ========================== TRANSCRIPT CHAT BUBBLES ==========================
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
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white shadow-md ${isUser
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-700'
              : 'bg-gradient-to-br from-slate-600 to-slate-800 border border-border'
              }`}>
              {isUser
                ? <User className="w-4 h-4" />
                : <Bot className="w-4 h-4" />
              }
            </div>

            {/* Bubble */}
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${isUser
              ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-100 rounded-br-md'
              : 'bg-[#1a1a1a] border border-border text-foreground/85 rounded-bl-md'
              }`}>
              {/* Label */}
              <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isUser ? 'text-emerald-400/80' : 'text-foreground/40'
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
export default function AnalysisPage() {
  const [simulation, setSimulation] = useState<SimulationData | null>(null);
  const [personaName, setPersonaName] = useState('—');
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

  const loadSimulationData = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      setIsLoading(false);
      return;
    }

    setActiveUserId(authData.user.id);

    // Buscar a última simulação (incluindo analysis_data)
    const { data, error } = await supabase
      .from('simulations')
      .select('id, audio_recording_url, transcript, analysis_data, difficulty_level, persona_id, created_at')
      .eq('user_id', authData.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      // Parsear o transcript
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

      // Parsear analysis_data — com validação forte de estrutura
      let parsedAnalysis: AnalysisData | null = null;
      if (data.analysis_data) {
        let raw: any = data.analysis_data;
        if (typeof raw === 'string') {
          try { raw = JSON.parse(raw); } catch { raw = null; }
        }
        // Validar que o objeto tem a estrutura mínima esperada
        if (raw && typeof raw === 'object' && typeof raw.overall_score === 'number' && typeof raw.overall_feedback === 'string') {
          parsedAnalysis = {
            overall_score: raw.overall_score,
            overall_feedback: raw.overall_feedback,
            messages_feedback: Array.isArray(raw.messages_feedback) ? raw.messages_feedback : [],
          };
        }
      }

      setSimulation({
        id: data.id,
        audio_recording_url: data.audio_recording_url,
        transcript: parsedTranscript,
        analysis_data: parsedAnalysis,
        difficulty_level: data.difficulty_level,
        persona_id: data.persona_id,
        created_at: data.created_at,
      });

      // Se a análise ainda está pendente, checar de novo em 5s
      if (!parsedAnalysis && Array.isArray(parsedTranscript) && parsedTranscript.length > 0) {
        setIsAnalysisLoading(true);
      }

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
  };

  useEffect(() => {
    loadSimulationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling: se analysis ainda não chegou, checar a cada 5s
  useEffect(() => {
    if (!isAnalysisLoading || !simulation?.id) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('simulations')
        .select('analysis_data')
        .eq('id', simulation.id)
        .single();

      if (data?.analysis_data) {
        let raw: any = data.analysis_data;
        if (typeof raw === 'string') {
          try { raw = JSON.parse(raw); } catch { raw = null; }
        }
        // Validar estrutura mínima antes de aceitar
        if (raw && typeof raw === 'object' && typeof raw.overall_score === 'number' && typeof raw.overall_feedback === 'string') {
          const validAnalysis: AnalysisData = {
            overall_score: raw.overall_score,
            overall_feedback: raw.overall_feedback,
            messages_feedback: Array.isArray(raw.messages_feedback) ? raw.messages_feedback : [],
          };
          setSimulation(prev => prev ? { ...prev, analysis_data: validAnalysis } : prev);
          setIsAnalysisLoading(false);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isAnalysisLoading, simulation?.id]);

  const difficultyLabel = (d: string) => {
    const map: Record<string, string> = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
    return map[d] || d;
  };

  const messageCount = simulation?.transcript?.length ?? 0;
  const analysis = simulation?.analysis_data;

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
            <p className="text-foreground/60 text-sm">Avaliação detalhada da sua performance baseada em SPIN Selling, Cialdini e Rapport.</p>
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

        {/* ======================= SEÇÃO 1: AVALIAÇÃO GERAL ===================== */}
        {/* Estado: análise em processamento OU dados vieram vazios/incompletos */}
        {!analysis && (
          <div className="mt-2 flex flex-col gap-4">
            {/* Card de status com spinner */}
            <div className="bg-panel border border-border rounded-3xl p-8 flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <BarChart3 className="w-10 h-10 text-accent/30" />
                {isAnalysisLoading && (
                  <RefreshCw className="w-5 h-5 text-accent animate-spin absolute -bottom-1 -right-1" />
                )}
              </div>
              <div className="text-center">
                <p className="text-foreground/80 font-bold text-sm">
                  {isAnalysisLoading
                    ? 'Analisando sua performance...'
                    : 'A Inteligência Artificial ainda está processando os feedbacks desta simulação.'}
                </p>
                <p className="text-foreground/40 text-xs mt-1">
                  {isAnalysisLoading
                    ? 'O Gemini está avaliando sua transcrição com SPIN Selling e Cialdini'
                    : 'Tente atualizar a página em alguns segundos.'}
                </p>
              </div>
            </div>

            {/* Skeleton placeholders para os cards de feedback */}
            {isAnalysisLoading && (
              <>
                <div className="flex items-center gap-2.5 ml-1 mt-2">
                  <BookOpen className="w-5 h-5 text-accent/30" />
                  <div className="w-48 h-5 bg-foreground/5 rounded animate-pulse" />
                </div>
                <div className="flex flex-col gap-3">
                  <SkeletonFeedbackCard />
                  <SkeletonFeedbackCard />
                  <SkeletonFeedbackCard />
                </div>
              </>
            )}
          </div>
        )}

        {analysis && (
          <>
            {/* Cabeçalho de Avaliação */}
            <div className="mt-2 flex flex-col gap-4">
              <div className="flex items-center gap-2.5 ml-1">
                <Award className="w-5 h-5 text-accent" />
                <h3 className="font-serif font-bold text-lg tracking-wide text-foreground">Avaliação Geral</h3>
                <span className="text-[10px] font-bold text-foreground/30 bg-foreground/5 px-2.5 py-1 rounded-full ml-auto">Nota: {analysis.overall_score ?? 0} / 10</span>
              </div>

              <div className="bg-panel border border-border rounded-3xl p-6 sm:p-8 shadow-lg flex flex-col sm:flex-row items-center gap-6">
                {/* SVG Score Circle */}
                <ScoreCircle score={analysis.overall_score ?? 0} />

                {/* Feedback Text */}
                <div className="flex-1">
                  <p className="text-foreground/70 text-sm leading-relaxed">{analysis.overall_feedback || 'Avaliação em processamento...'}</p>
                </div>
              </div>
            </div>

            {/* ======================= SEÇÃO 2: FEEDBACK POR MENSAGEM ===================== */}
            {(analysis.messages_feedback?.length ?? 0) > 0 && (
              <div className="mt-4 flex flex-col gap-4">
                <div className="flex items-center gap-2.5 ml-1">
                  <BookOpen className="w-5 h-5 text-accent" />
                  <h3 className="font-serif font-bold text-lg tracking-wide text-foreground">Feedback por Mensagem</h3>
                  <span className="text-[10px] font-bold text-foreground/30 bg-foreground/5 px-2.5 py-1 rounded-full ml-auto">
                    {analysis.messages_feedback?.length ?? 0} falas avaliadas
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {(analysis.messages_feedback ?? []).map((fb, idx) => {
                    // Buscar a mensagem original do vendedor
                    const originalMessage = simulation?.transcript?.[fb?.message_index]?.content || '(mensagem não encontrada)';
                    return (
                      <FeedbackCard
                        key={idx}
                        feedback={fb}
                        originalMessage={originalMessage}
                        index={idx}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ======================= SEÇÃO 3: TRANSCRIÇÃO COMPLETA ===================== */}
        {Array.isArray(simulation?.transcript) && simulation.transcript.length > 0 && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex items-center gap-2.5 ml-1">
              <MessageSquare className="w-5 h-5 text-accent" />
              <h3 className="font-serif font-bold text-lg tracking-wide text-foreground">Transcrição Completa</h3>
            </div>

            <div className="bg-panel border border-border rounded-[2rem] p-6 sm:p-8 shadow-lg overflow-hidden">
              <TranscriptChat messages={simulation.transcript} />
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
