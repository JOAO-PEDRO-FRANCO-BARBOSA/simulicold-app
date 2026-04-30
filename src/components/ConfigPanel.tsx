'use client';

import { useState, useEffect } from 'react';
import {
  Briefcase, Building, Users, UserX, Crown, Settings, LucideIcon,
  TrendingUp, DollarSign, Shield, Target, Zap, User, Shuffle, Stethoscope
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const RANDOM_MODE_ID = 'random-mode';

// Map de ícones string-to-component — expandido para mais opções
const ICON_MAP: Record<string, LucideIcon> = {
  UserX,
  Users,
  Crown,
  Building,
  Briefcase,
  'trending-up': TrendingUp,
  'dollar-sign': DollarSign,
  'stethoscope': Stethoscope,
  'briefcase': Briefcase,
  Shield,
  Target,
  Zap,
  User,
  Stethoscope,
};

const DIFFICULTIES = [
  { id: 'facil', label: 'Fácil', description: 'Receptivo e com tempo' },
  { id: 'medio', label: 'Médio', description: 'Neutro, vai fazer perguntas' },
  { id: 'dificil', label: 'Difícil', description: 'Apressado e resistente' },
];

interface ConfigPanelProps {
  onPersonaSelect: (id: string) => void;
  onDifficultySelect: (diff: string) => void;
  onPersonasLoaded: (personas: any[]) => void;
}

export function ConfigPanel({ onPersonaSelect, onDifficultySelect, onPersonasLoaded }: ConfigPanelProps) {
  const [personas, setPersonas] = useState<any[]>([]);
  const [selectedScenario, setSelectedScenario] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('medio');
  const [productContext, setProductContext] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch das personas via Supabase Client no Mount
  useEffect(() => {
    async function fetchPersonas() {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        setUserId(authData.user.id);

        const { data: userPreferences, error: userPreferencesError } = await supabase
          .from('user_preferences')
          .select('product_context')
          .eq('user_id', authData.user.id)
          .maybeSingle();

        if (userPreferencesError) {
          console.error('Erro ao buscar preferências do usuário:', userPreferencesError);
        } else if (typeof userPreferences?.product_context === 'string') {
          setProductContext(userPreferences.product_context);
        }
      }

      const { data, error } = await supabase.from('personas').select('*');
      if (error) {
        console.error('Erro ao buscar personas:', error);
      } else if (data && data.length > 0) {
        setPersonas(data);
        onPersonasLoaded(data);
        const defaultId = data[0].id;
        setSelectedScenario(defaultId);
        onPersonaSelect(defaultId);
        onDifficultySelect('medio');
      }
      setLoading(false);
    }
    fetchPersonas();
  }, [onPersonaSelect, onDifficultySelect]);

  const handleSavePreferences = async () => {
    if (!userId) {
      setSaveMessage('Você precisa estar autenticado para salvar.');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setSavingPreferences(true);
    setSaveMessage('');

    const contextToSave = productContext.trim();

    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: userId,
          product_context: contextToSave,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      );

    if (error) {
      console.error('Erro ao salvar preferências:', error);
      setSaveMessage('Falha ao salvar. Tente novamente.');
    } else {
      setSaveMessage('Preferências salvas com sucesso!');
    }

    setSavingPreferences(false);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handlePersonaClick = (id: string) => {
    setSelectedScenario(id);
    onPersonaSelect(id);
  };

  const handleDifficultyClick = (id: string) => {
    setSelectedDifficulty(id);
    onDifficultySelect(id);
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
            <button
              onClick={() => handlePersonaClick(RANDOM_MODE_ID)}
              className={`relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all gap-1 ${
                selectedScenario === RANDOM_MODE_ID
                  ? 'border-primary bg-primary/5 text-primary shadow-inner shadow-primary/10'
                  : 'border-border bg-background hover:border-foreground/30 text-foreground/70'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
                selectedScenario === RANDOM_MODE_ID
                  ? 'bg-primary/15 border border-primary/30'
                  : 'bg-foreground/5 border border-border'
              }`}>
                <Shuffle className={`w-5 h-5 ${selectedScenario === RANDOM_MODE_ID ? 'text-primary' : 'text-foreground/50'}`} />
              </div>
              <span className="text-xs font-bold text-center leading-tight">Modo Aleatório</span>
              <span className={`text-[9px] text-center leading-tight mt-0.5 line-clamp-2 ${
                selectedScenario === RANDOM_MODE_ID ? 'text-primary/60' : 'text-foreground/35'
              }`}>
                Seleciona uma persona real ao iniciar
              </span>
            </button>

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

      {/* Product Context */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-foreground/60 uppercase tracking-wider">Contexto do Produto/Serviço</h3>
        <textarea
          value={productContext}
          onChange={(e) => setProductContext(e.target.value)}
          placeholder="Ex: Vendo um software de gestão para clínicas médicas. O ticket médio é R$ 500/mês. As principais objeções são preço e tempo de implantação..."
          className="w-full min-h-[120px] rounded-xl border border-border bg-background/70 text-foreground placeholder:text-foreground/40 p-4 outline-none focus:border-accent/70 focus:ring-1 focus:ring-accent/30 transition-colors resize-y"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handleSavePreferences}
            disabled={savingPreferences || !userId}
            aria-busy={savingPreferences}
            className="bg-accent text-accent-foreground font-bold py-2 px-5 rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingPreferences ? 'Salvando...' : 'Salvar Alterações'}
          </button>
          {saveMessage && (
            <span className={`text-xs font-medium ${saveMessage.includes('sucesso') ? 'text-green-500' : 'text-red-400'}`}>
              {saveMessage}
            </span>
          )}
        </div>
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
    </div>
  );
}
