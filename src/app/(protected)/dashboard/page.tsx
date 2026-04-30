'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { ConfigPanel } from '@/components/ConfigPanel';
import { CallPanelIdle } from '@/components/CallPanelIdle';
import { ActiveVoicePanel } from '@/components/ActiveVoicePanel';
import { TranscriptionPanel } from '@/components/TranscriptionPanel';
import { SupportPopup } from '@/components/SupportPopup';
import { EndCallModal } from '@/components/EndCallModal';
import { SimulationsUpsellModal } from '@/components/SimulationsUpsellModal';
import { supabase } from '@/lib/supabase';
import { useUserCredits } from '@/hooks/useUserCredits';

export default function Dashboard() {
  const [callState, setCallState] = useState<'idle' | 'active' | 'ended'>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const [activePersonaId, setActivePersonaId] = useState('');
  const [personas, setPersonas] = useState<any[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState('medio');
  
  // Guardamos a sessão do Usuário logado
  const [userId, setUserId] = useState('');
  const { credits } = useUserCredits();

  // Mensagens da Conversa (STT / Gemini)
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([]);
  const [upsellModalOpen, setUpsellModalOpen] = useState(false);
  const [upsellMessage, setUpsellMessage] = useState('Simulações esgotadas');

  const handleUpsellRequired = (message: string) => {
    setUpsellMessage(message);
    setUpsellModalOpen(true);
  };

  const handleStartCall = () => {
    if (!selectedPersonaId) {
      return;
    }

    const personaToUse = selectedPersonaId === 'random-mode'
      ? personas[Math.floor(Math.random() * personas.length)]
      : personas.find((persona) => persona.id === selectedPersonaId);

    if (!personaToUse) {
      return;
    }

    setActivePersonaId(personaToUse.id);
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setCallState('active');
  };

  useEffect(() => {
    // Tenta pegar a sessão atual limpa do Auth
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id);
      }
    });
  }, []);

  useEffect(() => {
    if (credits === 0) {
      setUpsellMessage('Você está sem créditos. Compre um novo pacote para continuar usando o simulador.');
      setUpsellModalOpen(true);
    }
  }, [credits]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header onExitSimulator={() => setSessionId(null)} />
      
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[400px_1fr] xl:grid-cols-[450px_1fr] h-full lg:h-[calc(100vh-120px)] gap-6">
          
          <section className="h-full flex flex-col shrink-0">
            {callState === 'idle' ? (
              <ConfigPanel 
                onPersonaSelect={setSelectedPersonaId}
                onDifficultySelect={setSelectedDifficulty}
                onPersonasLoaded={setPersonas}
              />
            ) : (
              <ActiveVoicePanel 
                onEnd={() => {
                  setSessionId(null);
                  setCallState('ended');
                }}
                onUpsellRequired={handleUpsellRequired}
                personaId={activePersonaId}
                difficulty={selectedDifficulty}
                userId={userId}
                sessionId={sessionId}
                messages={messages}
                setMessages={setMessages}
              />
            )}
          </section>

          <section className="h-full flex flex-col min-h-[600px]">
            {callState === 'idle' ? (
              <CallPanelIdle 
                simulations={credits}
                hasPersona={Boolean(selectedPersonaId) && (selectedPersonaId !== 'random-mode' || personas.length > 0)}
                onUpsellRequired={handleUpsellRequired}
                onStart={handleStartCall} 
              />
            ) : (
               <TranscriptionPanel messages={messages} />
            )}
          </section>

        </div>
      </main>

      <SupportPopup />

      {callState === 'ended' && (
        <EndCallModal
          onRetry={() => {
            setSessionId(null);
            setCallState('idle');
          }}
        />
      )}

      <SimulationsUpsellModal
        isOpen={upsellModalOpen}
        message={upsellMessage}
        onClose={() => setUpsellModalOpen(false)}
      />
    </div>
  );
}
