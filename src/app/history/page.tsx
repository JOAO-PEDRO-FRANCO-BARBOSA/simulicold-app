'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, TrendingUp, Trophy, Hash, Star, Trash2, Loader2,
  Calendar, User as UserIcon, Building, Crown, Briefcase, Target, ExternalLink
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { supabase } from '@/lib/supabase';

// ========================== TYPES ==========================
interface SavedSimulation {
  id: string;
  created_at: string;
  analysis_data: any;
  difficulty_level: string;
  persona_id: string;
  persona_name?: string;
  persona_description?: string;
}

// ========================== UTILITY: Score Color ==========================
function getScoreColorScheme(score: number) {
  if (score >= 8) return { stroke: '#22c55e', text: 'text-green-400', border: 'border-green-500/40', label: 'Excelente' };
  if (score >= 5) return { stroke: '#eab308', text: 'text-yellow-400', border: 'border-yellow-500/40', label: score >= 6 ? 'Bom' : 'Regular' };
  return { stroke: '#ef4444', text: 'text-red-400', border: 'border-red-500/40', label: 'Precisa melhorar' };
}

// ========================== MINI SCORE CIRCLE ==========================
function MiniScoreCircle({ score, size = 56 }: { score: number; size?: number }) {
  const safeScore = Math.max(0, Math.min(10, score || 0));
  const colors = getScoreColorScheme(safeScore);
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeScore / 10) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={colors.stroke} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-black ${colors.text}`}>{safeScore}</span>
      </div>
    </div>
  );
}

// ========================== LARGE SCORE CIRCLE ==========================
function LargeScoreCircle({ score, label }: { score: number; label: string }) {
  const safeScore = Math.max(0, Math.min(10, Math.round(score * 10) / 10));
  const colors = getScoreColorScheme(safeScore);
  const size = 100;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeScore / 10) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90" style={{ filter: `drop-shadow(0 0 8px ${colors.stroke}25)` }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={colors.stroke} strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-black ${colors.text}`}>{safeScore.toFixed(1)}</span>
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500/70">{label}</span>
    </div>
  );
}

// ========================== MAIN PAGE ==========================
export default function HistoryPage() {
  const [isLoading, setIsLoading] = useState(true);

  // Summary data
  const [averageScore, setAverageScore] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  // Last 5 scores
  const [recentScores, setRecentScores] = useState<{ score: number; date: string }[]>([]);

  // Saved simulations
  const [savedSims, setSavedSims] = useState<SavedSimulation[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    loadHistoryData();
  }, []);

  const loadHistoryData = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      setIsLoading(false);
      return;
    }

    const userId = authData.user.id;

    // 1. Fetch ALL simulations for summary stats
    const { data: allSims } = await supabase
      .from('simulations')
      .select('id, analysis_data, created_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (allSims && allSims.length > 0) {
      setTotalSessions(allSims.length);

      // Extract scores from analysis_data
      const scores = allSims
        .map(s => {
          const ad = s.analysis_data;
          if (ad && typeof ad === 'object' && typeof ad.overall_score === 'number') {
            return ad.overall_score;
          }
          return null;
        })
        .filter((s): s is number => s !== null);

      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        setAverageScore(Math.round(avg * 10) / 10);
        setBestScore(Math.max(...scores));
      }

      // Last 5 scores
      const recent5 = allSims.slice(0, 5)
        .map(s => ({
          score: s.analysis_data?.overall_score ?? 0,
          date: s.created_at,
        }))
        .reverse(); // Oldest first for chronological display
      setRecentScores(recent5);
    }

    // 2. Fetch SAVED simulations with persona data
    const { data: saved } = await supabase
      .from('simulations')
      .select('id, created_at, analysis_data, difficulty_level, persona_id')
      .eq('user_id', userId)
      .eq('is_saved', true)
      .order('created_at', { ascending: false });

    if (saved && saved.length > 0) {
      // Fetch persona names for all unique persona_ids
      const personaIds = [...new Set(saved.map(s => s.persona_id))];
      const { data: personas } = await supabase
        .from('personas')
        .select('id, name, description')
        .in('id', personaIds);

      const personaMap = new Map(personas?.map(p => [p.id, p]) || []);

      const enriched: SavedSimulation[] = saved.map(s => ({
        ...s,
        persona_name: personaMap.get(s.persona_id)?.name || 'Desconhecido',
        persona_description: personaMap.get(s.persona_id)?.description || '',
      }));

      setSavedSims(enriched);
    }

    setIsLoading(false);
  };

  const handleUnsave = async (simId: string) => {
    setRemovingId(simId);
    try {
      const { error } = await supabase
        .from('simulations')
        .update({ is_saved: false })
        .eq('id', simId);

      if (!error) {
        setSavedSims(prev => prev.filter(s => s.id !== simId));
      }
    } catch (err) {
      console.error('Erro ao remover favorito:', err);
    } finally {
      setRemovingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Extract sector from persona description (first sentence after the period context)
  const extractSector = (description: string) => {
    if (!description) return 'B2B';
    const match = description.match(/(?:de|do|da)\s+([\w\s]+?)(?:\.|,|$)/i);
    if (match) {
      const sector = match[1].trim();
      return sector.length > 20 ? sector.substring(0, 18) + '...' : sector;
    }
    return 'B2B';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
          <p className="text-foreground/60 font-bold uppercase tracking-widest text-xs">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground pb-20 fade-in animate-in duration-500">
      {/* Header */}
      <header className="p-4 px-6 border-b border-yellow-900/30 bg-panel flex items-center shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-colors cursor-pointer group">
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold text-sm">Voltar para o Simulador</span>
        </Link>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8 flex flex-col gap-8 mt-4">

        {/* ======================== TITLE ======================== */}
        <div className="flex items-center gap-3">
          <div className="bg-yellow-500/15 p-2.5 rounded-full border border-yellow-500/25">
            <Trophy className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-yellow-400 tracking-wide">Histórico de Performance</h1>
            <p className="text-foreground/40 text-sm">Acompanhe sua evolução no treinamento de cold calls B2B.</p>
          </div>
        </div>

        {/* ======================== SUMMARY CARDS ======================== */}
        <div className="grid grid-cols-3 gap-4">
          {/* Média Geral */}
          <div className="bg-[#0c0c0c] border border-yellow-900/30 rounded-3xl p-6 flex flex-col items-center justify-center gap-3">
            <LargeScoreCircle score={averageScore} label="Média Geral" />
          </div>

          {/* Total de Sessões */}
          <div className="bg-[#0c0c0c] border border-yellow-900/30 rounded-3xl p-6 flex flex-col items-center justify-center gap-3">
            <div className="w-[100px] h-[100px] rounded-full border-[5px] border-yellow-500/20 flex flex-col items-center justify-center" style={{ filter: 'drop-shadow(0 0 8px rgba(234,179,8,0.15))' }}>
              <span className="text-3xl font-black text-yellow-400">{totalSessions}</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500/70">Sessões</span>
          </div>

          {/* Melhor Nota */}
          <div className="bg-[#0c0c0c] border border-yellow-900/30 rounded-3xl p-6 flex flex-col items-center justify-center gap-3">
            <LargeScoreCircle score={bestScore} label="Melhor Nota" />
          </div>
        </div>

        {/* ======================== EVOLUÇÃO RECENTE ======================== */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5 ml-1">
            <TrendingUp className="w-5 h-5 text-yellow-400" />
            <h3 className="font-serif font-bold text-lg tracking-wide text-foreground">Evolução Recente</h3>
            <span className="text-[10px] font-bold text-foreground/30 bg-foreground/5 px-2.5 py-1 rounded-full ml-auto">
              Últimas {recentScores.length} sessões
            </span>
          </div>

          {recentScores.length > 0 ? (
            <div className="bg-[#0c0c0c] border border-yellow-900/30 rounded-3xl p-6 pr-2">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={recentScores.map(item => ({
                  date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                  nota: item.score,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'monospace' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 10]}
                    ticks={[0, 2, 4, 6, 8, 10]}
                    tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid rgba(234,179,8,0.25)',
                      borderRadius: '12px',
                      padding: '8px 14px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    }}
                    itemStyle={{ color: '#eab308', fontWeight: 700, fontSize: 13 }}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}
                    formatter={(value: any) => [`${value} / 10`, 'Nota']}
                    cursor={{ stroke: 'rgba(234,179,8,0.2)', strokeWidth: 1 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="nota"
                    stroke="#eab308"
                    strokeWidth={2.5}
                    dot={{ fill: '#eab308', r: 5, strokeWidth: 2, stroke: '#0c0c0c' }}
                    activeDot={{ fill: '#facc15', r: 7, strokeWidth: 2, stroke: '#0c0c0c' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-[#0c0c0c] border border-yellow-900/20 rounded-3xl p-8 flex items-center justify-center">
              <p className="text-foreground/30 text-sm font-semibold">Nenhuma sessão registrada ainda.</p>
            </div>
          )}
        </div>

        {/* ======================== ANÁLISES SALVAS ======================== */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5 ml-1">
            <Star className="w-5 h-5 text-yellow-400" />
            <h3 className="font-serif font-bold text-lg tracking-wide text-foreground">Análises Salvas</h3>
            <span className="text-[10px] font-bold text-foreground/30 bg-foreground/5 px-2.5 py-1 rounded-full ml-auto">
              {savedSims.length} {savedSims.length === 1 ? 'salva' : 'salvas'}
            </span>
          </div>

          {savedSims.length > 0 ? (
            <div className="flex flex-col gap-3">
              {savedSims.map((sim) => {
                const score = sim.analysis_data?.overall_score ?? 0;
                const sector = extractSector(sim.persona_description || '');

                return (
                  <Link
                    key={sim.id}
                    href={`/analysis?id=${sim.id}`}
                    className="bg-[#0c0c0c] border border-yellow-900/25 rounded-2xl p-5 flex items-center gap-5 hover:border-yellow-600/30 transition-all duration-300 group cursor-pointer no-underline"
                  >
                    {/* Score circle (golden-themed) */}
                    <MiniScoreCircle score={score} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {/* Date & Time */}
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-3.5 h-3.5 text-yellow-500/50" />
                        <span className="text-sm font-semibold text-foreground/70">
                          {formatDate(sim.created_at)} às {formatTime(sim.created_at)}
                        </span>
                      </div>

                      {/* Tags */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Persona name tag */}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-400/80 border border-yellow-500/20">
                          <UserIcon className="w-3 h-3" />
                          {sim.persona_name}
                        </span>

                        {/* Sector tag */}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-foreground/5 text-foreground/40 border border-border">
                          <Building className="w-3 h-3" />
                          {sector}
                        </span>
                      </div>
                    </div>

                    {/* Arrow icon hint */}
                    <ExternalLink className="w-4 h-4 text-foreground/10 group-hover:text-yellow-500/40 transition-colors shrink-0" />

                    {/* Delete/unsave button — stopPropagation prevents Link navigation */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleUnsave(sim.id);
                      }}
                      disabled={removingId === sim.id}
                      className="p-2.5 rounded-xl text-foreground/20 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      title="Remover dos favoritos"
                    >
                      {removingId === sim.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#0c0c0c] border border-yellow-900/20 rounded-3xl p-8 flex flex-col items-center justify-center gap-3">
              <Star className="w-8 h-8 text-yellow-500/20" />
              <p className="text-foreground/30 text-sm font-semibold text-center">
                Nenhuma análise salva ainda.<br />
                <span className="text-foreground/20 text-xs">Use o botão de Salvar na tela de Análise para marcar suas melhores simulações.</span>
              </p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
