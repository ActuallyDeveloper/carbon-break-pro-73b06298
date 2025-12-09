import { useState, useCallback, useRef } from 'react';

export interface ReplayFrame {
  timestamp: number;
  ballX: number;
  ballY: number;
  paddleX: number;
  score: number;
  lives: number;
  bricksActive: boolean[];
}

export interface Replay {
  id: string;
  createdAt: string;
  duration: number;
  finalScore: number;
  frames: ReplayFrame[];
  difficulty: string;
  mode: string;
}

const MAX_REPLAYS = 10;
const FRAME_INTERVAL = 50; // Capture every 50ms

export function useReplaySystem(mode: 'single_player' | 'multiplayer' = 'single_player') {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentReplay, setCurrentReplay] = useState<Replay | null>(null);
  const [savedReplays, setSavedReplays] = useState<Replay[]>(() => {
    try {
      const saved = localStorage.getItem(`replays_${mode}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const framesRef = useRef<ReplayFrame[]>([]);
  const startTimeRef = useRef<number>(0);
  const lastCaptureRef = useRef<number>(0);
  const playbackIndexRef = useRef<number>(0);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(() => {
    framesRef.current = [];
    startTimeRef.current = Date.now();
    lastCaptureRef.current = 0;
    setIsRecording(true);
  }, []);

  const captureFrame = useCallback((data: {
    ballX: number;
    ballY: number;
    paddleX: number;
    score: number;
    lives: number;
    bricksActive: boolean[];
  }) => {
    if (!isRecording) return;

    const now = Date.now();
    const elapsed = now - startTimeRef.current;

    // Only capture at intervals to reduce storage
    if (elapsed - lastCaptureRef.current < FRAME_INTERVAL) return;
    lastCaptureRef.current = elapsed;

    framesRef.current.push({
      timestamp: elapsed,
      ...data,
    });

    // Limit frame count for memory
    if (framesRef.current.length > 3600) { // ~3 minutes at 50ms intervals
      framesRef.current.shift();
    }
  }, [isRecording]);

  const stopRecording = useCallback((finalScore: number, difficulty: string): Replay | null => {
    if (!isRecording || framesRef.current.length < 10) {
      setIsRecording(false);
      return null;
    }

    const duration = Date.now() - startTimeRef.current;
    const replay: Replay = {
      id: `replay_${Date.now()}`,
      createdAt: new Date().toISOString(),
      duration,
      finalScore,
      frames: [...framesRef.current],
      difficulty,
      mode,
    };

    setIsRecording(false);
    return replay;
  }, [isRecording, mode]);

  const saveReplay = useCallback((replay: Replay) => {
    setSavedReplays(prev => {
      // Sort by score and keep top replays
      const updated = [...prev, replay]
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, MAX_REPLAYS);
      
      localStorage.setItem(`replays_${mode}`, JSON.stringify(updated));
      return updated;
    });
  }, [mode]);

  const deleteReplay = useCallback((replayId: string) => {
    setSavedReplays(prev => {
      const updated = prev.filter(r => r.id !== replayId);
      localStorage.setItem(`replays_${mode}`, JSON.stringify(updated));
      return updated;
    });
  }, [mode]);

  const playReplay = useCallback((replay: Replay, onFrame: (frame: ReplayFrame) => void, onComplete: () => void) => {
    if (isPlaying) return;

    setCurrentReplay(replay);
    setIsPlaying(true);
    playbackIndexRef.current = 0;

    const startTime = Date.now();
    
    playbackIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      // Find the frame closest to current elapsed time
      while (playbackIndexRef.current < replay.frames.length - 1 &&
             replay.frames[playbackIndexRef.current + 1].timestamp <= elapsed) {
        playbackIndexRef.current++;
      }

      if (playbackIndexRef.current >= replay.frames.length) {
        stopPlayback();
        onComplete();
        return;
      }

      onFrame(replay.frames[playbackIndexRef.current]);
    }, 16); // ~60fps playback
  }, [isPlaying]);

  const stopPlayback = useCallback(() => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    setIsPlaying(false);
    setCurrentReplay(null);
    playbackIndexRef.current = 0;
  }, []);

  const formatDuration = useCallback((ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    // Recording
    isRecording,
    startRecording,
    captureFrame,
    stopRecording,
    saveReplay,
    
    // Playback
    isPlaying,
    currentReplay,
    playReplay,
    stopPlayback,
    
    // Saved replays
    savedReplays,
    deleteReplay,
    
    // Utils
    formatDuration,
  };
}
