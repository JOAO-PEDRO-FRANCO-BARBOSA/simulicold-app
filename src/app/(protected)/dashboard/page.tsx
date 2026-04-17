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
import { useUserSimulations } from '@/hooks/useUserSimulations';

export default function Dashboard() {
  const [callState, setCallState] = useState<'idle' | 'active' | 'ended'>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('medio');
  
  // Guardamos a sessão do Usuário logado
  const [userId, setUserId] = useState('');
  const { simulations } = useUserSimulations();

  // Mensagens da Conversa (STT / Gemini)
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([]);
  const [upsellModalOpen, setUpsellModalOpen] = useState(false);
  const [upsellMessage, setUpsellMessage] = useState('Simulações esgotadas');

  const handleUpsellRequired = (message: string) => {
    setUpsellMessage(message);
    setUpsellModalOpen(true);
  };

  useEffect(() => {
    // Tenta pegar a sessão atual limpa do Auth
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id);
      }
    });
  }, []);

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
              />
            ) : (
              <ActiveVoicePanel 
                onEnd={() => {
                  setSessionId(null);
                  setCallState('ended');
                }}
                onUpsellRequired={handleUpsellRequired}
                personaId={selectedPersonaId}
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
                simulations={simulations}
                hasPersona={Boolean(selectedPersonaId)}
                onUpsellRequired={handleUpsellRequired}
                onStart={() => {
                  setSessionId(crypto.randomUUID());
                  setMessages([]); // Reset messages on new call
                  setCallState('active');
                }} 
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
