'use client';

import { useState } from 'react';
import { Briefcase, Building, Users, UserX, Crown, Settings } from 'lucide-react';

const SCENARIOS = [
  { id: 'director', label: 'Diretor Estressado', icon: UserX },
  { id: 'hr', label: 'RH Técnico', icon: Users },
  { id: 'ceo', label: 'CEO Sem Tempo', icon: Crown },
  { id: 'buyer', label: 'Comprador Frio', icon: Building },
  { id: 'manager', label: 'Gerente Amigável', icon: Briefcase },
];

const DIFFICULTIES = [
  { id: 'easy', label: 'Fácil', description: 'Receptivo e com tempo' },
  { id: 'medium', label: 'Médio', description: 'Neutro, vai fazer perguntas' },
  { id: 'hard', label: 'Difícil', description: 'Apressado e resistente' },
];

export function ConfigPanel() {
  const [selectedScenario, setSelectedScenario] = useState('director');
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');

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
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-medium text-foreground/60 uppercase tracking-wider">Perfil do Cliente</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {SCENARIOS.map((scenario) => {
            const Icon = scenario.icon;
            const isActive = selectedScenario === scenario.id;
            return (
              <button
                key={scenario.id}
                onClick={() => setSelectedScenario(scenario.id)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                  isActive 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-border bg-background hover:border-foreground/30 text-foreground/70'
                }`}
              >
                <Icon className={`w-6 h-6 mb-2 ${isActive ? 'text-primary' : 'text-foreground/50'}`} />
                <span className="text-xs font-medium text-center">{scenario.label}</span>
              </button>
            );
          })}
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
                onClick={() => setSelectedDifficulty(diff.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  isActive 
                    ? 'border-accent bg-accent/5 text-accent' 
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
