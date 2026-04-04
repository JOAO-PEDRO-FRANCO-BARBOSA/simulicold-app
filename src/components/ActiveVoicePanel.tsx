'use client';

import { useState, useEffect } from 'react';
import { Mic, PhoneOff } from 'lucide-react';

interface Props {
  onEnd: () => void;
}

export function ActiveVoicePanel({ onEnd }: Props) {
  // Tempo inicial de 5 minutos (300 segundos) e contagem regressiva
  const [timeLeft, setTimeLeft] = useState(300);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onEnd();
          return 0; // Finaliza ao chegar a zero
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onEnd]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Alturas dinâmicas das ondas renderizadas (iniciam como 5 pontinhos de 6px)
  const [waveHeights, setWaveHeights] = useState([6, 6, 6, 6, 6]);

  useEffect(() => {
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let microphone: MediaStreamAudioSourceNode;
    let animationFrame: number;
    let stream: MediaStream;

    const startRecording = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Inicialização do AudioContext (suporte a navegadores antigos)
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContext = new AudioContextClass();
        
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.minDecibels = -85; // Ignora ruído de fundo (hiss e chiados estáticos do microfone)
        analyser.smoothingTimeConstant = 0.3; // Extremamente responsivo (taxa de decaimento/fall-off mais rígida)
        
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateWaves = () => {
          analyser.getByteFrequencyData(dataArray);
          
          // Cálculo usando RMS (Root Mean Square) para um volume mais estável
          let sumSquares = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sumSquares += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sumSquares / dataArray.length);

          // Limiar de silêncio para ignorar ruído de fundo (noise gate)
          const NOISE_GATE = 8;
          
          if (rms > NOISE_GATE) {
            // Normalizamos RMS: a fala forte geralmente bate 70~100 de RMS máximo no microfone padrão
            const normalized = Math.min((rms - NOISE_GATE) / 60, 1);
            
            // Altura base (pontinho) = 6px. Altura máxima adicional = 40px
            const maxH = 40;
            const hCenter = 6 + (normalized * maxH);
            const hSide1 = 6 + (normalized * (maxH * 0.6));
            const hSide2 = 6 + (normalized * (maxH * 0.3));

            // Estilo simétrico tipo WhatsApp: [Mínimo, Médio, Máximo, Médio, Mínimo]
            setWaveHeights([hSide2, hSide1, hCenter, hSide1, hSide2]);
          } else {
            // Em silêncio absoluto, mantemos as barras reduzidas a simples bolinhas
            setWaveHeights([6, 6, 6, 6, 6]);
          }

          animationFrame = requestAnimationFrame(updateWaves);
        };

        updateWaves();

      } catch (err) {
        console.error("Erro ao acessar o microfone para visualização de volume:", err);
        // Fallback pra silêncio se usuário negar acesso
        setWaveHeights([6, 6, 6, 6, 6]);
      }
    };

    startRecording();

    // Cleanup completo ao desmontar o componente ou a chamada encerrar
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (microphone && analyser) microphone.disconnect(analyser);
      if (analyser) analyser.disconnect();
      if (audioContext && audioContext.state !== 'closed') audioContext.close();
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 relative rounded-3xl border border-border bg-panel overflow-hidden animate-in fade-in duration-500 shadow-sm h-full">
      
      {/* Container Relativo do Microfone com Cronômetro Inserido no Topo */}
      <div className="relative mb-8 mt-12 flex justify-center w-full">
        {/* Halo Pulsante no Fundo */}
        <div className="absolute inset-0 max-w-[14rem] mx-auto bg-blue-500/10 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
        
        {/* O Círculo Central do Microfone */}
        <div className="relative w-44 h-44 bg-[#050505] rounded-full border border-border flex items-center justify-center shadow-2xl z-10 overflow-visible">
          
          {/* Cápsula de Cronômetro Inserida Margeando o Círculo pelo Topo */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#101010] border border-border/80 px-4 py-1.5 rounded-full z-20 shadow-md">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-sm tracking-[0.2em] font-semibold text-foreground/90">{formatTime(timeLeft)}</span>
          </div>

          <Mic className="w-12 h-12 text-blue-400 stroke-[2.5]" />
        </div>
      </div>

      <h3 className="text-3xl font-bold mb-3 tracking-tight">Sua vez de falar</h3>
      <p className="text-foreground/50 text-base mb-16 select-none">
        Fale naturalmente...
      </p>
      
      {/* Visualizador de Ondas Baseadas no Som em Tempo Real */}
      <div className="flex items-center gap-2 mb-16 h-[50px] justify-center min-w-[80px]">
         {waveHeights.map((h, i) => (
           <div 
             key={i} 
             className="w-2.5 rounded-full bg-blue-400" 
             style={{ 
               height: `${h}px`
               // CSS Transition removido! Deixamos o math e o smoothingTimeConstant ditar a suavidade 100% natural, matando todo o lag residual
             }} 
           />
         ))}
      </div>

      {/* Botão de Encerrar */}
      <button 
        onClick={onEnd}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-10 py-3.5 rounded-full font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-600/20 cursor-pointer mt-auto tracking-wide"
      >
        <PhoneOff className="w-5 h-5 mr-1" />
        <span>Encerrar</span>
      </button>
    </div>
  );
}
