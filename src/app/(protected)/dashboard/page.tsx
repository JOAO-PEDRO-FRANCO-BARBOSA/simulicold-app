'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { ConfigPanel } from '@/components/ConfigPanel';
import { CallPanelIdle } from '@/components/CallPanelIdle';
import { ActiveVoicePanel } from '@/components/ActiveVoicePanel';
import { TranscriptionPanel } from '@/components/TranscriptionPanel';
import { SupportPopup } from '@/components/SupportPopup';
import { EndCallModal } from '@/components/EndCallModal';
import { CreditsUpsellModal } from '@/components/CreditsUpsellModal';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const [callState, setCallState] = useState<'idle' | 'active' | 'ended'>('idle');
  
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('medio');
  
  // Guardamos a sessão do Usuário logado
  const [userId, setUserId] = useState('');

  // Mensagens da Conversa (STT / Gemini)
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([]);
  const [upsellModalOpen, setUpsellModalOpen] = useState(false);
  const [upsellMessage, setUpsellMessage] = useState('Créditos esgotados');

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
      <Header />
      
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
                onEnd={() => setCallState('ended')} 
                onUpsellRequired={handleUpsellRequired}
                personaId={selectedPersonaId}
                difficulty={selectedDifficulty}
                userId={userId}
                messages={messages}
                setMessages={setMessages}
              />
            )}
          </section>

          <section className="h-full flex flex-col min-h-[600px]">
            {callState === 'idle' ? (
              <CallPanelIdle 
                disabled={!selectedPersonaId}
                onStart={() => {
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
        <EndCallModal onRetry={() => setCallState('idle')} />
      )}

      <CreditsUpsellModal
        isOpen={upsellModalOpen}
        message={upsellMessage}
        onClose={() => setUpsellModalOpen(false)}
      />
    </div>
  );
}
