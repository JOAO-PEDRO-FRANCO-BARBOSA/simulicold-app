'use client';

import { useState, useEffect } from 'react';
import {
  Briefcase, Building, Users, UserX, Crown, Settings, LucideIcon,
  TrendingUp, DollarSign, Shield, Target, Zap, User, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Map de ícones string-to-component — expandido para mais opções
const ICON_MAP: Record<string, LucideIcon> = {
  UserX,
  Users,
  Crown,
  Building,
  Briefcase,
  'trending-up': TrendingUp,
  'dollar-sign': DollarSign,
  Shield,
  Target,
  Zap,
  User,
};

const DIFFICULTIES = [
  { id: 'facil', label: 'Fácil', description: 'Receptivo e com tempo' },
  { id: 'medio', label: 'Médio', description: 'Neutro, vai fazer perguntas' },
  { id: 'dificil', label: 'Difícil', description: 'Apressado e resistente' },
];

interface ConfigPanelProps {
  onPersonaSelect: (id: string) => void;
  onDifficultySelect: (diff: string) => void;
}

export function ConfigPanel({ onPersonaSelect, onDifficultySelect }: ConfigPanelProps) {
  const [personas, setPersonas] = useState<any[]>([]);
  const [selectedScenario, setSelectedScenario] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('medio');
  const [loading, setLoading] = useState(true);
  const [productContext, setProductContext] = useState('');
  const [contextLoading, setContextLoading] = useState(false);
  const [savingContext, setSavingContext] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 4000);
  };

  // Fetch das personas via Supabase Client no Mount
  useEffect(() => {
    let isMounted = true;

    async function fetchPersonas() {
      const { data, error } = await supabase.from('personas').select('*');

      if (error) {
        console.error('Erro ao buscar personas:', error);
      } else if (data && data.length > 0) {
        if (!isMounted) return;

        setPersonas(data);
        const defaultId = data[0].id;
        setSelectedScenario(defaultId);
        onPersonaSelect(defaultId);
        onDifficultySelect('medio');
      }
    }

    async function fetchProductContext() {
      setContextLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (user) {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('product_context')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Erro ao buscar contexto do produto:', error);
        } else if (isMounted) {
          setProductContext(data?.product_context || '');
        }
      }

      if (isMounted) {
        setContextLoading(false);
      }
    }

    Promise.all([fetchPersonas(), fetchProductContext()]).finally(() => {
      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [onPersonaSelect, onDifficultySelect]);

  const handlePersonaClick = (id: string) => {
    setSelectedScenario(id);
    onPersonaSelect(id);
  };

  const handleDifficultyClick = (id: string) => {
    setSelectedDifficulty(id);
    onDifficultySelect(id);
  };

  const handleSaveContext = async () => {
    setSavingContext(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData?.user) {
        showToast('error', 'Não foi possível identificar seu usuário.');
        return;
      }

      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: authData.user.id,
            product_context: productContext.trim(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('Erro ao salvar contexto do produto:', error);
        showToast('error', 'Falha ao salvar as configurações.');
        return;
      }

      showToast('success', 'Configurações salvas com sucesso.');
    } catch (error) {
      console.error('Erro inesperado ao salvar contexto do produto:', error);
      showToast('error', 'Falha inesperada ao salvar as configurações.');
    } finally {
      setSavingContext(false);
    }
  };

  // Extrair cargo/setor da description (ex: "Diretor de Operações de indústria..." → "Dir. Operações | Indústria")
  const extractRole = (description: string | null): string => {
    if (!description) return '';
    // Pegar a primeira frase antes do ponto
    const firstSentence = description.split('.')[0] || description;
    // Limitar tamanho
    return firstSentence.length > 50 ? firstSentence.substring(0, 47) + '...' : firstSentence;
  };

  return (
    <div className="p-6 bg-panel rounded-2xl border border-border flex flex-col gap-8 h-full">
      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Configure</h2>
        </div>
        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">
          PRO
        </span>
      </div>

      {/* Scenario Selection */}
      <div className="flex flex-col gap-4 relative min-h-[150px]">
        <h3 className="text-sm font-medium text-foreground/60 uppercase tracking-wider">Perfil do Cliente</h3>

        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center pt-8">
            <div className="w-8 h-8 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {personas.map((persona) => {
              const Icon = ICON_MAP[persona.icon_name] || UserX; // Fallback Icon
              const isActive = selectedScenario === persona.id;
              const roleText = extractRole(persona.description);

              return (
                <button
                  key={persona.id}
                  onClick={() => handlePersonaClick(persona.id)}
                  className={`relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all gap-1 ${
                    isActive
                      ? 'border-primary bg-primary/5 text-primary shadow-inner shadow-primary/10'
                      : 'border-border bg-background hover:border-foreground/30 text-foreground/70'
                  }`}
                >
                  {/* PRO badge */}
                  {persona.is_pro && (
                    <div className={`absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                      isActive ? 'bg-yellow-400/20 text-yellow-400' : 'bg-foreground/5 text-foreground/30'
                    }`}>
                      <Crown className="w-2.5 h-2.5" />
                      PRO
                    </div>
                  )}

                  {/* Avatar circle with icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
                    isActive
                      ? 'bg-primary/15 border border-primary/30'
                      : 'bg-foreground/5 border border-border'
                  }`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-foreground/50'}`} />
                  </div>

                  {/* Name */}
                  <span className="text-xs font-bold text-center leading-tight">{persona.name}</span>

                  {/* Role/Sector subtitle */}
                  {roleText && (
                    <span className={`text-[9px] text-center leading-tight mt-0.5 line-clamp-2 ${
                      isActive ? 'text-primary/60' : 'text-foreground/35'
                    }`}>
                      {roleText}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Difficulty Selection */}
      <div className="flex flex-col gap-4 mt-auto">
        <h3 className="text-sm font-medium text-foreground/60 uppercase tracking-wider">Dificuldade</h3>
        <div className="grid grid-cols-3 gap-3">
          {DIFFICULTIES.map((diff) => {
            const isActive = selectedDifficulty === diff.id;
            return (
              <button
                key={diff.id}
                onClick={() => handleDifficultyClick(diff.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  isActive
                    ? 'border-accent bg-accent/5 text-accent shadow-inner shadow-accent/10'
                    : 'border-border bg-background hover:border-foreground/30 text-foreground/70'
                }`}
              >
                <span className="text-sm font-bold">{diff.label}</span>
                <span className="text-[10px] text-center mt-1 opacity-70 hidden xl:block">{diff.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Context */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-foreground/60 uppercase tracking-wider">Contexto do Produto/Serviço</h3>
          {contextLoading && (
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-foreground/40">
              <Loader2 className="w-3 h-3 animate-spin" /> Carregando
            </span>
          )}
        </div>

        <textarea
          value={productContext}
          onChange={(e) => setProductContext(e.target.value)}
          placeholder="Descreva o que você vende, seu público-alvo, preço e os principais benefícios..."
          rows={5}
          className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/30 focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-foreground/40">
            Esse contexto será usado na avaliação da IA para entender melhor seu mercado.
          </p>

          <button
            onClick={handleSaveContext}
            disabled={savingContext}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingContext ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {savingContext ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>

      {toast && (
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${toast.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
