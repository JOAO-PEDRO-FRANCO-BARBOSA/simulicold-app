'use client';

import { useState, useEffect } from 'react';
import { Briefcase, Building, Users, UserX, Crown, Settings, LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Map de ícones string-to-component
const ICON_MAP: Record<string, LucideIcon> = {
  UserX,
  Users,
  Crown,
  Building,
  Briefcase
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

  // Fetch das personas via Supabase Client no Mount
  useEffect(() => {
    async function fetchPersonas() {
      const { data, error } = await supabase.from('personas').select('*');
      if (error) {
        console.error('Erro ao buscar personas:', error);
      } else if (data && data.length > 0) {
        setPersonas(data);
        const defaultId = data[0].id;
        setSelectedScenario(defaultId);
        onPersonaSelect(defaultId);
        onDifficultySelect('medio');
      }
      setLoading(false);
    }
    fetchPersonas();
  }, [onPersonaSelect, onDifficultySelect]);

  const handlePersonaClick = (id: string) => {
    setSelectedScenario(id);
    onPersonaSelect(id);
  };

  const handleDifficultyClick = (id: string) => {
    setSelectedDifficulty(id);
    onDifficultySelect(id);
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
              
              return (
                <button
                  key={persona.id}
                  onClick={() => handlePersonaClick(persona.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                    isActive 
                      ? 'border-primary bg-primary/5 text-primary shadow-inner shadow-primary/10' 
                      : 'border-border bg-background hover:border-foreground/30 text-foreground/70'
                  }`}
                >
                  {isActive && persona.is_pro && <Crown className="absolute w-3 h-3 text-yellow-400 top-2 right-2"/>}
                  <Icon className={`w-6 h-6 mb-2 ${isActive ? 'text-primary' : 'text-foreground/50'}`} />
                  <span className="text-xs font-medium text-center">{persona.name}</span>
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
    </div>
  );
}
