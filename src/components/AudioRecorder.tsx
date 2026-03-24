import { useState, useRef, useEffect } from 'react';
import { X, Mic, Square, Loader2, RotateCcw, Play, Pause } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// ── Substitua pela URL real do webhook de áudio no n8n ──────────────────────
const AUDIO_WEBHOOK_URL = 'https://PLACEHOLDER_AUDIO_WEBHOOK_URL';
// ─────────────────────────────────────────────────────────────────────────────

const AGENT_API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-api`;

const PAGE_CONTEXT_MAP: Record<string, string> = {
  '/': 'Início',
  '/dashboard': 'Dashboard',
  '/entradas': 'Entradas',
  '/saidas': 'Saídas',
  '/notinhas': 'Notinhas',
  '/graficos': 'Gráficos',
  '/tabelas': 'Tabelas',
  '/impostos': 'Impostos',
  '/config': 'Configurações',
};

// ── Types ────────────────────────────────────────────────────────────────────

type RecorderState = 'idle' | 'recording' | 'sending' | 'response' | 'error';

interface AudioResponse {
  text: string;
  audioBase64: string | null;
  audioFormat: string;
}

interface AudioRecorderProps {
  onClose: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatRecordingTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function mimeFromFormat(format: string): string {
  const map: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    webm: 'audio/webm',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
  };
  return map[format.toLowerCase()] ?? `audio/${format}`;
}

// ── AudioPlayer ───────────────────────────────────────────────────────────────

interface AudioPlayerProps {
  base64: string;
  format: string;
  autoPlay?: boolean;
}

function AudioPlayer({ base64, format, autoPlay = true }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ready, setReady] = useState(false);

  const audioSrc = `data:${mimeFromFormat(format)};base64,${base64}`;

  useEffect(() => {
    const audio = new Audio(audioSrc);
    audioRef.current = audio;

    const onMeta = () => { setDuration(audio.duration); setReady(true); };
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnd  = () => { setIsPlaying(false); setCurrentTime(0); };

    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);

    if (autoPlay) {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false)); // blocked by browser — user taps play
    }

    return () => {
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
      audio.pause();
      audio.src = '';
    };
  }, [audioSrc, autoPlay]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted/50 w-full">
      {/* Play / Pause */}
      <button
        onClick={togglePlay}
        disabled={!ready}
        className="w-9 h-9 rounded-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1"
        aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
      >
        {isPlaying
          ? <Pause className="w-4 h-4 text-white fill-white" />
          : <Play  className="w-4 h-4 text-white fill-white ml-0.5" />
        }
      </button>

      {/* Progress bar */}
      <div
        role="slider"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        onClick={handleSeek}
        className="flex-1 h-2 bg-border rounded-full cursor-pointer relative"
      >
        <div
          className="h-full bg-indigo-500 rounded-full transition-none"
          style={{ width: `${progress}%` }}
        />
        {/* Thumb */}
        {ready && (
          <div
            className="absolute top-1/2 w-3 h-3 bg-indigo-500 rounded-full shadow"
            style={{
              left: `${progress}%`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Time */}
      <span className="text-xs text-muted-foreground tabular-nums min-w-[68px] text-right flex-shrink-0">
        {formatDuration(currentTime)}&thinsp;/&thinsp;{formatDuration(duration)}
      </span>
    </div>
  );
}

// ── AudioRecorder ─────────────────────────────────────────────────────────────

const AudioRecorder = ({ onClose }: AudioRecorderProps) => {
  const location = useLocation();
  const [recState, setRecState]       = useState<RecorderState>('idle');
  const [errorMsg, setErrorMsg]       = useState('');
  const [responseData, setResponseData] = useState<AudioResponse | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount: stop recording + clear timers
  useEffect(() => {
    return () => {
      clearTimers();
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  function clearTimers() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // ── Recording ──────────────────────────────────────────────────────────────

  async function startRecording() {
    setErrorMsg('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        sendAudio(blob);
      };

      recorder.start();
      setRecState('recording');
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 59) { handleStop(); return 60; }
          return prev + 1;
        });
      }, 1000);

    } catch (err: unknown) {
      const name = (err as { name?: string }).name ?? '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setErrorMsg('Permita o acesso ao microfone nas configurações do navegador');
      } else if (name === 'NotFoundError') {
        setErrorMsg('Nenhum microfone encontrado no dispositivo');
      } else {
        setErrorMsg('Não foi possível acessar o microfone. Tente novamente.');
      }
      setRecState('idle');
    }
  }

  function handleStop() {
    clearTimers();
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop(); // triggers onstop → sendAudio
      setRecState('sending');
    }
  }

  // ── Send & parse response ──────────────────────────────────────────────────

  async function sendAudio(blob: Blob) {
    if (blob.size < 4000) {
      setErrorMsg('Gravação muito curta, tente novamente');
      setRecState('idle');
      return;
    }

    setRecState('sending');

    try {
      // Convert to Base64
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Fresh token — same pattern as ChatContext
      let accessToken: string | undefined;
      let userId = 'anonymous';

      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshData?.session) {
        accessToken = refreshData.session.access_token;
        userId      = refreshData.session.user?.id ?? userId;
      } else {
        const { data: sessionData } = await supabase.auth.getSession();
        accessToken = sessionData?.session?.access_token;
        userId      = sessionData?.session?.user?.id ?? userId;
      }

      if (!accessToken) throw Object.assign(new Error('auth'), { kind: 'auth' });

      const controller = new AbortController();
      const timeout    = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(AUDIO_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          user_id:      userId,
          audio_base64: base64Audio,
          audio_format: blob.type,
          input_type:   'audio',
          context:      PAGE_CONTEXT_MAP[location.pathname] ?? 'Desconhecido',
          agent_api: {
            base_url:   AGENT_API_URL,
            auth_token: accessToken,
          },
        }),
      });
      clearTimeout(timeout);

      if (!response.ok) throw new Error('server');

      // Parse response — handle all 3 formats
      const raw = await response.text();
      let parsed: { text?: string; output?: string; audio_base64?: string; audio_format?: string } = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Plain text response
        parsed = { text: raw.trim() || 'Áudio processado com sucesso.' };
      }

      const responseText  = (parsed.text ?? parsed.output ?? 'Não foi possível obter resposta')
        .replace(/^["'\s]+|["'\s]+$/g, '')
        .trim();
      const audioBase64   = parsed.audio_base64 ?? null;
      const audioFormat   = parsed.audio_format ?? 'mp3';

      setResponseData({ text: responseText, audioBase64, audioFormat });
      setRecState('response');

    } catch (err: unknown) {
      const error = err as { name?: string; kind?: string };
      if (error.name === 'AbortError') {
        setErrorMsg('O servidor demorou para responder. Tente novamente.');
      } else if (error.kind === 'auth') {
        setErrorMsg('Sessão expirada. Faça login novamente.');
      } else {
        setErrorMsg('Erro de conexão. Tente novamente.');
      }
      setRecState('error');
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  function handleRetry() {
    setErrorMsg('');
    setResponseData(null);
    setRecordingTime(0);
    setRecState('idle');
  }

  function handleClose() {
    clearTimers();
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    onClose();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[65] animate-in fade-in duration-200"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[70] animate-in slide-in-from-bottom-4 duration-300"
        role="dialog"
        aria-label="Gravador de áudio"
      >
        <div className="bg-card rounded-t-3xl shadow-2xl">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-2 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="font-semibold text-foreground">Assistente de Voz</span>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Fechar assistente de voz"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col items-center justify-center px-6 pb-10 min-h-[260px] gap-5">

            {/* ── IDLE ──────────────────────────────────────────── */}
            {recState === 'idle' && (
              <>
                <p className={errorMsg
                  ? 'text-destructive text-sm text-center max-w-[260px]'
                  : 'text-muted-foreground text-sm'
                }>
                  {errorMsg || 'Toque para gravar'}
                </p>
                <button
                  onClick={startRecording}
                  className="relative w-20 h-20 rounded-full bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all flex items-center justify-center shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
                  aria-label="Iniciar gravação"
                >
                  <Mic className="w-8 h-8 text-white relative z-10" />
                  <span className="sonar-ring" style={{ animationDelay: '0s' }} />
                  <span className="sonar-ring" style={{ animationDelay: '0.5s' }} />
                  <span className="sonar-ring" style={{ animationDelay: '1s' }} />
                </button>
              </>
            )}

            {/* ── RECORDING ─────────────────────────────────────── */}
            {recState === 'recording' && (
              <>
                <p className="text-muted-foreground text-sm">Gravando...</p>

                {/* Waveform */}
                <div className="flex items-center gap-1.5 h-10">
                  {([0, 0.15, 0.3, 0.15, 0] as number[]).map((delay, i) => (
                    <span key={i} className="audio-wave-bar" style={{ animationDelay: `${delay}s` }} />
                  ))}
                </div>

                {/* Timer */}
                <p className="font-mono text-2xl font-semibold text-foreground tabular-nums">
                  {formatRecordingTime(recordingTime)}
                </p>
                {recordingTime >= 50 && (
                  <p className="text-amber-500 text-xs -mt-3">Máximo: 60s</p>
                )}

                {/* Stop */}
                <button
                  onClick={handleStop}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center shadow-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                  aria-label="Parar gravação"
                >
                  <Square className="w-6 h-6 text-white fill-white" />
                </button>
              </>
            )}

            {/* ── SENDING ───────────────────────────────────────── */}
            {recState === 'sending' && (
              <>
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-muted-foreground text-sm">Processando áudio...</p>
              </>
            )}

            {/* ── RESPONSE ──────────────────────────────────────── */}
            {recState === 'response' && responseData && (
              <div className="response-enter w-full flex flex-col gap-4">
                {/* Text */}
                <div className="max-h-40 overflow-y-auto p-4 rounded-2xl bg-muted/50">
                  <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {responseData.text}
                  </p>
                </div>

                {/* Audio player (only if audio came back) */}
                {responseData.audioBase64 ? (
                  <AudioPlayer
                    base64={responseData.audioBase64}
                    format={responseData.audioFormat}
                    autoPlay={true}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground text-center">
                    Resposta em texto (áudio não disponível)
                  </p>
                )}

                {/* Record again */}
                <button
                  onClick={handleRetry}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all text-white text-sm font-medium min-h-[44px] w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
                  aria-label="Gravar novamente"
                >
                  <RotateCcw className="w-4 h-4" />
                  Gravar novamente
                </button>
              </div>
            )}

            {/* ── ERROR ─────────────────────────────────────────── */}
            {recState === 'error' && (
              <>
                <p className="text-destructive text-sm text-center max-w-[260px]">{errorMsg}</p>
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-2 px-5 py-3 rounded-full bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all text-white text-sm font-medium min-h-[44px]"
                >
                  <RotateCcw className="w-4 h-4" />
                  Tentar novamente
                </button>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

export default AudioRecorder;
