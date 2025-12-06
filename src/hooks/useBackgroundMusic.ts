import { useCallback, useRef, useEffect, useState } from 'react';

export interface MusicSettings {
  musicVolume: number;
  enabled: boolean;
  currentTrack: string;
}

const defaultSettings: MusicSettings = {
  musicVolume: 0.3,
  enabled: true,
  currentTrack: 'arcade',
};

// Background music tracks - royalty-free from various sources
const MUSIC_TRACKS = {
  arcade: {
    name: 'Arcade Vibes',
    url: 'https://assets.mixkit.co/music/preview/mixkit-games-worldbeat-466.mp3',
  },
  electronic: {
    name: 'Electronic Beat',
    url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
  },
  chill: {
    name: 'Chill Lofi',
    url: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
  },
  epic: {
    name: 'Epic Adventure',
    url: 'https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3',
  },
  retro: {
    name: 'Retro Gaming',
    url: 'https://assets.mixkit.co/music/preview/mixkit-a-very-happy-christmas-897.mp3',
  },
};

export type MusicTrack = keyof typeof MUSIC_TRACKS;

export const useBackgroundMusic = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [settings, setSettings] = useState<MusicSettings>(() => {
    const saved = localStorage.getItem('musicSettings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('musicSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
    }
    
    const track = MUSIC_TRACKS[settings.currentTrack as MusicTrack];
    if (track && audioRef.current.src !== track.url) {
      audioRef.current.src = track.url;
      if (isPlaying && settings.enabled) {
        audioRef.current.play().catch(() => {});
      }
    }
    
    audioRef.current.volume = settings.musicVolume;
  }, [settings.currentTrack, settings.musicVolume, isPlaying, settings.enabled]);

  const play = useCallback(() => {
    if (!settings.enabled || !audioRef.current) return;
    
    audioRef.current.play().catch(() => {});
    setIsPlaying(true);
  }, [settings.enabled]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const setTrack = useCallback((track: MusicTrack) => {
    setSettings(prev => ({ ...prev, currentTrack: track }));
    if (audioRef.current && isPlaying) {
      audioRef.current.src = MUSIC_TRACKS[track].url;
      audioRef.current.play().catch(() => {});
    }
  }, [isPlaying]);

  const updateSettings = useCallback((newSettings: Partial<MusicSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const stop = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return {
    isPlaying,
    play,
    pause,
    toggle,
    stop,
    setTrack,
    settings,
    updateSettings,
    tracks: MUSIC_TRACKS,
  };
};

// Global music instance for use across components
let globalMusicInstance: ReturnType<typeof useBackgroundMusic> | null = null;

export const getGlobalMusicInstance = () => globalMusicInstance;
export const setGlobalMusicInstance = (instance: ReturnType<typeof useBackgroundMusic>) => {
  globalMusicInstance = instance;
};
