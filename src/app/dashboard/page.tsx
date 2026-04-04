'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { ConfigPanel } from '@/components/ConfigPanel';
import { CallPanelIdle } from '@/components/CallPanelIdle';
import { ActiveVoicePanel } from '@/components/ActiveVoicePanel';
import { TranscriptionPanel } from '@/components/TranscriptionPanel';
import { SupportPopup } from '@/components/SupportPopup';
import { EndCallModal } from '@/components/EndCallModal';

export default function DashboardPage() {
  const [callState, setCallState] = useState<'idle' | 'active' | 'ended'>('idle');

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[400px_1fr] xl:grid-cols-[450px_1fr] h-full lg:h-[calc(100vh-120px)] gap-6">
          
          {/* Lado Esquerdo condicional: Painel de Configurações ou Painel Ativo de Voz */}
          <section className="h-full flex flex-col shrink-0">
            {callState === 'idle' ? (
              <ConfigPanel />
            ) : (
              <ActiveVoicePanel onEnd={() => setCallState('ended')} />
            )}
          </section>

          {/* Lado Direito condicional: Transcrição ao vivo ou Call to action */}
          <section className="h-full flex flex-col min-h-[600px]">
            {callState === 'idle' ? (
              <CallPanelIdle onStart={() => setCallState('active')} />
            ) : (
               <TranscriptionPanel />
            )}
          </section>

        </div>
      </main>

      <SupportPopup />

      {callState === 'ended' && (
        <EndCallModal onRetry={() => setCallState('idle')} />
      )}
    </div>
  );
}
