'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, PhoneOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
  onEnd: () => void;
  userId: string;
  personaId: string;
  difficulty: string;
}

export function ActiveVoicePanel({ onEnd, userId, personaId, difficulty }: Props) {
  const [timeLeft, setTimeLeft] = useState(300);
  const [waveHeights, setWaveHeights] = useState([6, 6, 6, 6, 6]);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Parar automaticamente quando o timer chegar a 0
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleForceEnd(); // Dispara o stop do gravador e upload
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let microphone: MediaStreamAudioSourceNode;
    let animationFrame: number;
    let stream: MediaStream;

    const startRecordingAndVisualizing = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
        });
        
        if (mediaRecorderRef.current) return; // Previne múltiplas instâncias
        audioChunksRef.current = []; // Garante a limpeza do gravador anterior
        
        // 1. Setup da Gravação
        // Gravamos em WEBM nativamente no navegador
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        
        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        // 2. Evento disparado quando .stop() for chamado manual ou temporalmente
        mediaRecorderRef.current.onstop = async () => {
          setIsProcessing(true); // Trava a ui enquanto sobe a gravação
          
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const filename = `${userId}/${Date.now()}.webm`;
          
          try {
            // Fazer upload para o Storage
            const { error: uploadError } = await supabase.storage
              .from('simulations_audio')
              .upload(filename, audioBlob, { contentType: 'audio/webm' });
            
            if (uploadError) throw uploadError;

            // Conseguir Link Público
            const { data: { publicUrl } } = supabase.storage
              .from('simulations_audio')
              .getPublicUrl(filename);

            // Inserir registro na Tabela de Simulações do Postgres
            const { error: insertError } = await supabase.from('simulations').insert({
              user_id: userId,
              persona_id: personaId,
              difficulty_level: difficulty,
              audio_recording_url: publicUrl,
              status: 'completed'
            });

            if (insertError) throw insertError;

          } catch (err: any) {
            console.error(err);
            alert('Falha ao processar simulação: ' + err.message);
          } finally {
            setIsProcessing(false);
            onEnd(); // Retorna a interface do dashboard
          }
        };

        // Inicia a gravação capturando audio em pedaços de 1 segundo (pra segurança/memória)
        mediaRecorderRef.current.start(1000);

        // 3. Setup do Visualizador WebAudioAPI
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContext = new AudioContextClass();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.minDecibels = -85;
        analyser.smoothingTimeConstant = 0.3;
        
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateWaves = () => {
          if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

          analyser.getByteFrequencyData(dataArray);
          let sumSquares = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sumSquares += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sumSquares / dataArray.length);
          const NOISE_GATE = 8;
          
          if (rms > NOISE_GATE) {
            const normalized = Math.min((rms - NOISE_GATE) / 60, 1);
            const maxH = 40;
            const hCenter = 6 + (normalized * maxH);
            const hSide1 = 6 + (normalized * (maxH * 0.6));
            const hSide2 = 6 + (normalized * (maxH * 0.3));
            setWaveHeights([hSide2, hSide1, hCenter, hSide1, hSide2]);
          } else {
            setWaveHeights([6, 6, 6, 6, 6]);
          }
          animationFrame = requestAnimationFrame(updateWaves);
        };

        updateWaves();

      } catch (err) {
        console.error("Erro na permissão de áudio:", err);
      }
    };

    startRecordingAndVisualizing();

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (microphone && analyser) microphone.disconnect(analyser);
      if (analyser) analyser.disconnect();
      if (audioContext && audioContext.state !== 'closed') audioContext.close();
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleForceEnd = () => {
    // Somente manda fechar e processar uma vez
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 relative rounded-[2rem] border border-border bg-panel overflow-hidden animate-in fade-in duration-500 shadow-sm h-full">
      
      {/* Overlay de carregamento ao encerrar */}
      {isProcessing && (
         <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in">
           <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
           <p className="text-foreground/80 font-bold uppercase tracking-widest text-sm">Transferindo Áudio...</p>
         </div>
      )}

      {/* Relativo e Gráfico Central */}
      <div className={`relative mb-8 mt-12 flex justify-center w-full transition-opacity duration-300 ${isProcessing ? 'opacity-30' : 'opacity-100'}`}>
        <div className="absolute inset-0 max-w-[14rem] mx-auto bg-blue-500/10 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
        
        <div className="relative w-44 h-44 bg-[#050505] rounded-full border border-border flex items-center justify-center shadow-2xl z-10 overflow-visible">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#101010] border border-border/80 px-4 py-1.5 rounded-full z-20 shadow-md">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-sm tracking-[0.2em] font-semibold text-foreground/90">{formatTime(timeLeft)}</span>
          </div>
          <Mic className="w-12 h-12 text-blue-400 stroke-[2.5]" />
        </div>
      </div>

      <h3 className="text-3xl font-bold mb-3 tracking-tight">Sua vez de falar</h3>
      <p className="text-foreground/50 text-base mb-16 select-none">
        {isProcessing ? 'Processando voz...' : 'Fale naturalmente...'}
      </p>
      
      {/* Visualizador de Ondas */}
      <div className="flex items-center gap-2 mb-16 h-[50px] justify-center min-w-[80px]">
         {waveHeights.map((h, i) => (
           <div 
             key={i} 
             className="w-2.5 rounded-full bg-blue-400" 
             style={{ height: `${h}px` }} 
           />
         ))}
      </div>

      {/* Botão de Encerrar */}
      <button 
        onClick={handleForceEnd}
        disabled={isProcessing}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-10 py-3.5 rounded-full font-bold transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-red-600/20 cursor-pointer mt-auto tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <PhoneOff className="w-5 h-5 mr-1" />
        <span>Encerrar</span>
      </button>
    </div>
  );
}
