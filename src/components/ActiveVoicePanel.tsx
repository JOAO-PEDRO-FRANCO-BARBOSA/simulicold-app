'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, PhoneOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
  onEnd: () => void;
  onUpsellRequired: (message: string) => void;
  userId: string;
  sessionId: string | null;
  personaId: string;
  difficulty: string;
  messages: { role: string, content: string }[];
  setMessages: React.Dispatch<React.SetStateAction<{ role: string, content: string }[]>>;
}

export function ActiveVoicePanel({ onEnd, onUpsellRequired, userId, sessionId, personaId, difficulty, messages, setMessages }: Props) {
  const [timeLeft, setTimeLeft] = useState(300);
  const [waveHeights, setWaveHeights] = useState([6, 6, 6, 6, 6]);
  const [isProcessing, setIsProcessing] = useState(false);

  // === Refs de controle de estado ===
  const recognitionRef = useRef<any>(null);
  const messagesRef = useRef(messages);
  const isFetchingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isActiveRef = useRef(true);
  const isEndingRef = useRef(false);
  const shouldAutoEndAfterSpeechRef = useRef(false);
  const autoEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // === Web Audio API — Mixer Architecture ===
  // AudioContext compartilhado (uma única instância para tudo)
  const audioContextRef = useRef<AudioContext | null>(null);
  // MediaStreamDestination = o "mixer" onde mic + IA se encontram
  const mixerDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  // AudioBufferSourceNode atual da IA (para poder parar se necessário)
  const currentTtsSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // MediaRecorder: agora grava do MIXER (mic + IA juntos), não do mic raw
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Stream do microfone (para cleanup)
  const micStreamRef = useRef<MediaStream | null>(null);

  const clearAutoEndTimeout = () => {
    if (autoEndTimeoutRef.current) {
      clearTimeout(autoEndTimeoutRef.current);
      autoEndTimeoutRef.current = null;
    }
  };

  const scheduleAutoEnd = (delayMs: number) => {
    clearAutoEndTimeout();
    autoEndTimeoutRef.current = setTimeout(() => {
      void handleForceEnd();
    }, delayMs);
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore cleanup errors
      }
    }
  };

  const stopCurrentAudioAndRecording = () => {
    if (currentTtsSourceRef.current) {
      try {
        currentTtsSourceRef.current.stop();
        currentTtsSourceRef.current.disconnect();
      } catch (e) {
        // ignore cleanup errors
      }
      currentTtsSourceRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore cleanup errors
      }
    }
  };

  const handleSimulationExhausted = (message: string) => {
    clearAutoEndTimeout();
    shouldAutoEndAfterSpeechRef.current = false;
    isActiveRef.current = false;
    isSpeakingRef.current = false;
    isFetchingRef.current = false;
    setIsProcessing(false);
    stopRecognition();
    stopCurrentAudioAndRecording();
    onUpsellRequired(message);
  };

  const isSimulationErrorStatus = (status?: number, message?: string): boolean => {
    return status === 402 || Boolean(message && message.includes('402'));
  };

  const recoverVoiceLoopAfterError = () => {
    if (currentTtsSourceRef.current) {
      try {
        currentTtsSourceRef.current.stop();
      } catch (e) {
        // ignore cleanup errors
      }
      try {
        currentTtsSourceRef.current.disconnect();
      } catch (e) {
        // ignore cleanup errors
      }
      currentTtsSourceRef.current = null;
    }

    isSpeakingRef.current = false;
    isFetchingRef.current = false;
    setIsProcessing(false);
    stopRecognition();

    setTimeout(() => {
      if (isActiveRef.current && !isSpeakingRef.current && !isFetchingRef.current) {
        startRecognition();
      }
    }, 400);
  };

  // Sync messages state → ref (para uso seguro dentro de callbacks)
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // ===================================================================
  // startRecognition — Reinicia o STT quando apropriado
  // ===================================================================
  const startRecognition = () => {
    if (!isActiveRef.current) return;
    if (recognitionRef.current && !isFetchingRef.current && !isSpeakingRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Ignora erro se já estiver rodando
      }
    }
  };

  // ===================================================================
  // speak — TTS via ElevenLabs + Web Audio API (o "pulo do gato")
  //
  // Fluxo:
  // 1. POST /api/tts → ArrayBuffer (áudio MP3 da ElevenLabs)
  // 2. audioContext.decodeAudioData() → AudioBuffer
  // 3. AudioBufferSourceNode → connect para:
  //    a) audioContext.destination → usuário OUVE a IA
  //    b) mixerDestination → IA é GRAVADA junto com o mic
  // ===================================================================
  const speak = async (text: string) => {
    if (!isActiveRef.current) {
      isFetchingRef.current = false;
      setIsProcessing(false);
      startRecognition();
      return;
    }

    isSpeakingRef.current = true;
    setIsProcessing(false);

    try {
      // 1. Buscar áudio via nossa rota /api/tts
      const ttsResponse = await fetch('/api/tts', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          text,
          personaId,
        }),
      });

      if (ttsResponse.status === 402) {
        const payload = await ttsResponse.json().catch(() => ({ error: 'Simulações esgotadas' }));
        handleSimulationExhausted(payload.error || 'Simulações esgotadas');
        return;
      }

      if (!ttsResponse.ok) {
        const errMsg = await ttsResponse.text();
        throw Object.assign(new Error(`TTS falhou (${ttsResponse.status}): ${errMsg}`), {
          status: ttsResponse.status,
        });
      }

      // Obter o áudio como ArrayBuffer
      const audioArrayBuffer = await ttsResponse.arrayBuffer();

      // Verificar se a sessão ainda está ativa após o fetch
      if (!isActiveRef.current || !audioContextRef.current) {
        isSpeakingRef.current = false;
        isFetchingRef.current = false;
        startRecognition();
        return;
      }

      const audioContext = audioContextRef.current;

      // Garantir que o AudioContext está rodando
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // 2. Decodificar MP3 → AudioBuffer
      const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);

      // 3. Criar AudioBufferSourceNode (one-shot: cada instância toca uma vez)
      const sourceNode = audioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;

      // 4a. Conectar ao SPEAKER → usuário ouve a voz da IA
      sourceNode.connect(audioContext.destination);

      // 4b. Conectar ao MIXER → voz da IA é gravada junto com o mic
      if (mixerDestinationRef.current) {
        sourceNode.connect(mixerDestinationRef.current);
      }

      // Guardar referência para cancelamento (ex: usuário encerra a chamada)
      currentTtsSourceRef.current = sourceNode;

      // 5. Quando o áudio terminar, retomar reconhecimento de voz
      sourceNode.onended = () => {
        // Limpar referência e desconectar o nó
        currentTtsSourceRef.current = null;
        try { sourceNode.disconnect(); } catch (e) { /* já desconectado */ }

        isSpeakingRef.current = false;
        isFetchingRef.current = false;

        if (shouldAutoEndAfterSpeechRef.current) {
          shouldAutoEndAfterSpeechRef.current = false;
          scheduleAutoEnd(2500);
          return;
        }

        // Retomar STT para o próximo turno do usuário
        startRecognition();
      };

      // 6. REPRODUZIR!
      sourceNode.start(0);

    } catch (err: any) {
      if (isSimulationErrorStatus(err?.status, err?.message)) {
        handleSimulationExhausted('Simulações esgotadas');
        return;
      }

      console.error('Erro no TTS:', err);
      recoverVoiceLoopAfterError();
    }
  };

  // ===================================================================
  // handleUserSpeech — Processa fala do usuário → Chat API → TTS
  //
  // ARQUITETURA DE BAIXA LATÊNCIA:
  // 1. POST /api/chat → obter texto da persona (PRIORIDADE MÁXIMA)
  // 2. IMEDIATAMENTE após receber texto → disparar speak() SEM await
  //    → TTS começa a gerar áudio enquanto a UI já atualiza
  // 3. O avaliador Black Belt NÃO roda aqui — roda apenas no handleForceEnd
  //    em background, sem bloquear a conversa
  // ===================================================================
  const handleUserSpeech = async (text: string) => {
    if (!text.trim() || !isActiveRef.current) {
      startRecognition();
      return;
    }

    const newMessages = [...messagesRef.current, { role: 'user', content: text }];
    setMessages(newMessages);

    isFetchingRef.current = true;
    setIsProcessing(true);

    try {
      if (!personaId) {
        throw new Error('Nenhuma persona selecionada. Volte e selecione um perfil de cliente.');
      }

      if (!sessionId) {
        throw new Error('Sessão de simulação inválida. Inicie uma nova chamada.');
      }

      // ── ETAPA 1: Obter resposta da persona (PRIORIDADE MÁXIMA) ──
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          sessionId,
          messages: newMessages,
          persona_id: personaId,
          difficulty_level: difficulty
        })
      });

      if (response.status === 402) {
        const payload = await response.json().catch(() => ({ error: 'Simulações esgotadas' }));
        handleSimulationExhausted(payload.error || 'Simulações esgotadas');
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const errorText = payload?.error || `Erro na API (status ${response.status})`;
        throw Object.assign(new Error(errorText), {
          status: response.status,
        });
      }

      const data = await response.json();
      const rawBotReply = typeof data.text === 'string' ? data.text : '';
      const callEnded = rawBotReply.includes('[FIM_DA_LIGACAO]');
      const cleanBotReply = rawBotReply.replace(/\[FIM_DA_LIGACAO\]/g, '').trim();
      const botReply = cleanBotReply || 'Certo, encerramos por aqui.';

      if (callEnded) {
        shouldAutoEndAfterSpeechRef.current = true;
      }

      // ── ETAPA 2: Atualizar UI IMEDIATAMENTE ──
      const updatedMessages = [...newMessages, { role: 'assistant', content: botReply }];
      setMessages(updatedMessages);

      // ── ETAPA 3: Disparar TTS SEM esperar (fire-and-forget) ──
      // speak() gerencia seu próprio lifecycle (isSpeakingRef, isFetchingRef)
      // Não usar await para não bloquear — o áudio começa a tocar ASAP
      speak(botReply);

      // Fallback: garante encerramento mesmo se o áudio não concluir evento onended.
      if (callEnded) {
        scheduleAutoEnd(6000);
      }

    } catch (err: any) {
      if (isSimulationErrorStatus(err?.status, err?.message)) {
        handleSimulationExhausted('Simulações esgotadas');
        return;
      }

      console.error('Erro no chat:', err);
      console.warn('Tivemos um problema de conexão. Tente falar novamente.');
      recoverVoiceLoopAfterError();
    }
  };

  // ===================================================================
  // Timer de 5 minutos
  // ===================================================================
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleForceEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===================================================================
  // SETUP PRINCIPAL — Web Audio API Mixer + STT
  //
  // Arquitetura de conexões:
  //
  //   [Mic] ──→ MediaStreamSource ──→ Analyser (visualização, SEM som)
  //                 │
  //                 └──→ MixerDestination ──→ MediaRecorder (GRAVA mic)
  //
  //   [IA TTS] ──→ AudioBufferSource ──→ destination (SPEAKER, ouve IA)
  //                      │
  //                      └──→ MixerDestination ──→ MediaRecorder (GRAVA IA)
  //
  //   ⚠️ Mic NÃO vai para destination (sem eco/feedback)
  //   ⚠️ MediaRecorder grava do MixerDestination (mic + IA misturados)
  //
  // ===================================================================
  useEffect(() => {
    isActiveRef.current = true;
    let analyser: AnalyserNode;
    let micSource: MediaStreamAudioSourceNode;
    let animationFrame: number;

    const setupVoiceFeatures = async () => {
      try {
        // ── 1. Obter stream do microfone ──
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
        micStreamRef.current = stream;

        // ── 2. Criar AudioContext compartilhado ──
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;

        // Garantir que o AudioContext está ativo (Chrome requer user gesture)
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        // ── 3. Criar MediaStreamDestination (O MIXER) ──
        // Tudo que for conectado aqui será gravado pelo MediaRecorder
        const mixerDestination = audioContext.createMediaStreamDestination();
        mixerDestinationRef.current = mixerDestination;

        // ── 4. Criar source do microfone no AudioContext ──
        micSource = audioContext.createMediaStreamSource(stream);

        // ── 5. Criar analyser para visualização das ondas ──
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.minDecibels = -85;
        analyser.smoothingTimeConstant = 0.3;

        // ── 6. CONEXÕES CRÍTICAS ──
        //
        // Mic → Analyser (APENAS visualização, analyser não produz som)
        micSource.connect(analyser);
        //
        // Mic → MixerDestination (voz do usuário vai para a GRAVAÇÃO)
        micSource.connect(mixerDestination);
        //
        // ⚠️ NÃO conectar micSource ao audioContext.destination!
        // O usuário NÃO deve ouvir a própria voz nos fones.
        // A voz do mic vai APENAS para o gravador.

        // ── 7. Animação do visualizador de ondas ──
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateWaves = () => {
          if (!isActiveRef.current) return;

          analyser.getByteFrequencyData(dataArray);
          let sumSquares = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sumSquares += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sumSquares / dataArray.length);
          const NOISE_GATE = 8;

          if (rms > NOISE_GATE && !isSpeakingRef.current && !isFetchingRef.current) {
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

        // ── 8. Iniciar MediaRecorder NO MIXER ──
        // IMPORTANTE: grava do mixerDestination.stream (mic + IA juntos)
        // e NÃO do stream raw do microfone!
        try {
          // Destruir recorder anterior se existir (instância única via ref)
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try { mediaRecorderRef.current.stop(); } catch (e) { /* ok */ }
          }
          mediaRecorderRef.current = null;

          const recorder = new MediaRecorder(mixerDestination.stream, {
            mimeType: 'audio/webm;codecs=opus'
          });
          audioChunksRef.current = [];

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };

          recorder.start(1000); // Chunks a cada 1 segundo
          mediaRecorderRef.current = recorder;
          console.log('✅ MediaRecorder iniciado no MIXER (mic + IA combinados)');
        } catch (recErr) {
          console.warn('⚠️ MediaRecorder não disponível, gravação desabilitada:', recErr);
        }

        // ── 9. Inicializar Web Speech API — Reconhecimento de Voz (STT) ──
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'pt-BR';

          recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
              }
            }
            const textoLimpo = finalTranscript.trim();
            if (textoLimpo && !isFetchingRef.current && !isSpeakingRef.current) {
              // Parar reconhecimento temporariamente enquanto processa
              try { recognition.stop(); } catch (e) { }
              handleUserSpeech(textoLimpo);
            }
          };

          recognition.onerror = (event: any) => {
            if (event.error === 'no-speech') {
              setTimeout(() => {
                if (isActiveRef.current && !isFetchingRef.current && !isSpeakingRef.current) {
                  startRecognition();
                }
              }, 500);
            } else if (event.error !== 'aborted') {
              console.error('STT Error:', event.error);
              recoverVoiceLoopAfterError();
            }
          };

          recognition.onend = () => {
            // Se terminou sem estar processando, reiniciar para ouvir de novo
            if (isActiveRef.current && !isFetchingRef.current && !isSpeakingRef.current) {
              startRecognition();
            }
          };

          recognitionRef.current = recognition;
          startRecognition();
        } else {
          alert('Seu navegador não suporta a Web Speech API. Tente no Google Chrome.');
        }

      } catch (err) {
        console.error('Erro na permissão de áudio:', err);
        alert('Precisa permitir o acesso ao microfone para a simulação funcionar.');
      }
    };

    setupVoiceFeatures();

    // ── CLEANUP: destruir tudo ao desmontar ──
    return () => {
      isActiveRef.current = false;
      clearAutoEndTimeout();
      shouldAutoEndAfterSpeechRef.current = false;

      // 1. Parar reconhecimento de voz
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) { }
      }

      // 2. Parar TTS em andamento (AudioBufferSourceNode)
      if (currentTtsSourceRef.current) {
        try {
          currentTtsSourceRef.current.stop();
          currentTtsSourceRef.current.disconnect();
        } catch (e) { }
        currentTtsSourceRef.current = null;
      }

      // 3. Destruir MediaRecorder (instância única, explicitamente null)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (e) { }
      }
      mediaRecorderRef.current = null;

      // 4. Cancelar animação do visualizador
      if (animationFrame) cancelAnimationFrame(animationFrame);

      // 5. Desconectar nós de áudio
      try { micSource?.disconnect(); } catch (e) { }

      // 6. Fechar AudioContext (libera todos os recursos)
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
      mixerDestinationRef.current = null;

      // 7. Parar todas as tracks do microfone
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===================================================================
  // handleForceEnd — Encerrar simulação, salvar áudio misto + transcript
  //                  + disparar análise de vendas com Gemini
  // ===================================================================
  async function handleForceEnd() {
    if (isEndingRef.current) return;
    isEndingRef.current = true;

    clearAutoEndTimeout();
    shouldAutoEndAfterSpeechRef.current = false;
    isActiveRef.current = false;
    setIsProcessing(true);

    // Parar reconhecimento de voz
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) { }
    }

    // Parar TTS em andamento
    if (currentTtsSourceRef.current) {
      try {
        currentTtsSourceRef.current.stop();
        currentTtsSourceRef.current.disconnect();
      } catch (e) { }
      currentTtsSourceRef.current = null;
    }

    // Parar MediaRecorder e aguardar último chunk
    let audioBlob: Blob | null = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        mediaRecorderRef.current!.onstop = () => resolve();
        mediaRecorderRef.current!.stop();
      });
      if (audioChunksRef.current.length > 0) {
        audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        console.log('✅ Blob de áudio MISTO (mic + IA) criado:', audioBlob.size, 'bytes');
      }
    }
    // Destruir referência explicitamente
    mediaRecorderRef.current = null;

    try {
      let audioPublicUrl = '';

      // Upload do áudio misto para Supabase Storage
      if (audioBlob && audioBlob.size > 1000) {
        const timestamp = Date.now();
        const filePath = `${userId}/${timestamp}.webm`;

        const { error: uploadError } = await supabase.storage
          .from('simulations_audio')
          .upload(filePath, audioBlob, {
            contentType: 'audio/webm',
            upsert: false
          });

        if (uploadError) {
          console.error('Erro no upload de áudio:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('simulations_audio')
            .getPublicUrl(filePath);
          audioPublicUrl = urlData.publicUrl;
          console.log('✅ Áudio misto (mic + IA) salvo em:', audioPublicUrl);
        }
      }

      // Salvar simulação com transcript JSONB e URL do áudio
      const { data: insertData, error: insertError } = await supabase
        .from('simulations')
        .insert({
          user_id: userId,
          persona_id: personaId,
          difficulty_level: difficulty,
          audio_recording_url: audioPublicUrl || null,
          transcript: messagesRef.current, // JSONB: [{role, content}, ...]
          status: 'completed'
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Erro ao salvar simulação:', insertError);
        alert('Falha ao salvar simulação: ' + insertError.message);
      }

      // ── Disparar análise de vendas com Gemini (silenciosamente) ──
      // Roda em background: não bloqueia o retorno do usuário ao dashboard
      const simulationId = insertData?.id;
      const finalTranscript = messagesRef.current;

      if (simulationId && finalTranscript.length > 0) {
        // Fire-and-forget: análise roda em background
        (async () => {
          try {
            console.log('🧠 Disparando análise de vendas para simulação:', simulationId);
            const analyzeResponse = await fetch('/api/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: finalTranscript }),
            });

            if (!analyzeResponse.ok) {
              const errText = await analyzeResponse.text();
              console.error('⚠️ Análise falhou:', errText);
              return;
            }

            const analysisData = await analyzeResponse.json();
            console.log('✅ Análise recebida, score geral:', analysisData.overall_score);

            // UPDATE na simulação com os dados de análise
            const { error: updateError } = await supabase
              .from('simulations')
              .update({
                analysis_data: analysisData,
                overall_score: analysisData.overall_score,
              })
              .eq('id', simulationId);

            if (updateError) {
              const errorMessage = updateError instanceof Error
                ? updateError.message
                : (updateError && typeof updateError === 'object' && 'message' in updateError)
                ? String((updateError as Record<string, unknown>).message)
                : JSON.stringify(updateError);
              console.error('⚠️ Erro ao salvar análise:', errorMessage);
            } else {
              console.log('✅ Análise salva com sucesso no banco!');
            }
          } catch (analyzeErr) {
            const analyzeErrorMessage = analyzeErr instanceof Error
              ? analyzeErr.message
              : (analyzeErr && typeof analyzeErr === 'object' && 'message' in analyzeErr)
              ? String((analyzeErr as Record<string, unknown>).message)
              : JSON.stringify(analyzeErr);
            console.error('⚠️ Erro na análise de vendas:', analyzeErrorMessage);
          }
        })();
      }
    } catch (err: any) {
      console.error(err);
      alert('Falha ao salvar dados finais: ' + err.message);
    } finally {
      setIsProcessing(false);
      onEnd(); // Retorna a interface do dashboard
    }
  }

  // ===================================================================
  // RENDER
  // ===================================================================
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 relative rounded-[2rem] border border-border bg-panel overflow-hidden animate-in fade-in duration-500 shadow-sm h-full">

      {/* Overlay de carregamento */}
      {isProcessing && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in">
          <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
          <p className="text-foreground/80 font-bold uppercase tracking-widest text-sm text-center px-4">
            {isFetchingRef.current ? 'Interpretando resposta...' : 'Processando...'}
          </p>
        </div>
      )}

      {/* Relativo e Gráfico Central */}
      <div className={`relative mb-8 mt-12 flex justify-center w-full transition-opacity duration-300 ${(isProcessing || isFetchingRef.current) ? 'opacity-30' : 'opacity-100'}`}>
        {!isSpeakingRef.current && !isFetchingRef.current && (
          <div className="absolute inset-0 max-w-[14rem] mx-auto bg-blue-500/10 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
        )}

        <div className="relative w-44 h-44 bg-[#050505] rounded-full border border-border flex items-center justify-center shadow-2xl z-10 overflow-visible">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#101010] border border-border/80 px-4 py-1.5 rounded-full z-20 shadow-md">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-sm tracking-[0.2em] font-semibold text-foreground/90">{formatTime(timeLeft)}</span>
          </div>
          <Mic className={`w-12 h-12 transition-colors ${isSpeakingRef.current ? 'text-accent' : 'text-blue-400 stroke-[2.5]'}`} />
        </div>
      </div>

      <h3 className="text-3xl font-bold mb-3 tracking-tight">Sua vez de falar</h3>
      <p className="text-foreground/50 text-base mb-16 select-none text-center px-4 min-h-[3rem]">
        {isSpeakingRef.current
          ? 'O Cliente está falando...'
          : isFetchingRef.current
            ? 'A IA está respondendo...'
            : 'Fale naturalmente, eu estou ouvindo...'}
      </p>

      {/* Visualizador de Ondas */}
      <div className="flex items-center gap-2 mb-16 h-[50px] justify-center min-w-[80px]">
        {waveHeights.map((h, i) => (
          <div
            key={i}
            className={`w-2.5 rounded-full transition-colors ${isSpeakingRef.current ? 'bg-accent/40' : 'bg-blue-400'}`}
            style={{ height: `${h}px` }}
          />
        ))}
      </div>

      {/* Botão de Encerrar */}
      <button
        onClick={handleForceEnd}
        disabled={isProcessing && !isFetchingRef.current}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-10 py-3.5 rounded-full font-bold transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-red-600/20 cursor-pointer mt-auto tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <PhoneOff className="w-5 h-5 mr-1" />
        <span>Encerrar Simulação</span>
      </button>
    </div>
  );
}
