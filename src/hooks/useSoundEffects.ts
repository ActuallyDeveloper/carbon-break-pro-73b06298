import { useCallback, useRef, useEffect, useState } from 'react';

export interface SoundSettings {
  masterVolume: number;
  effectsVolume: number;
  musicVolume: number;
  enabled: boolean;
}

const defaultSettings: SoundSettings = {
  masterVolume: 0.7,
  effectsVolume: 0.8,
  musicVolume: 0.5,
  enabled: true,
};

// Sound URLs - using free sound effects
const SOUNDS = {
  ballHit: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  brickBreak: 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3',
  powerUp: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  explosion: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
  gameOver: 'https://assets.mixkit.co/active_storage/sfx/2658/2658-preview.mp3',
  coin: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',
  win: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  paddle: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
};

export type SoundType = keyof typeof SOUNDS;

export const useSoundEffects = () => {
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [settings, setSettings] = useState<SoundSettings>(() => {
    const saved = localStorage.getItem('soundSettings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('soundSettings', JSON.stringify(settings));
  }, [settings]);

  // Preload sounds
  useEffect(() => {
    Object.entries(SOUNDS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audioCache.current.set(key, audio);
    });
  }, []);

  const playSound = useCallback((type: SoundType) => {
    if (!settings.enabled) return;

    const cachedAudio = audioCache.current.get(type);
    if (cachedAudio) {
      const audio = cachedAudio.cloneNode() as HTMLAudioElement;
      audio.volume = settings.masterVolume * settings.effectsVolume;
      audio.play().catch(() => {});
    }
  }, [settings]);

  const updateSettings = useCallback((newSettings: Partial<SoundSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  return {
    playSound,
    settings,
    updateSettings,
  };
};

// Singleton for use outside React components
let globalSoundInstance: ReturnType<typeof useSoundEffects> | null = null;

export const createGlobalSoundInstance = () => {
  const audioCache = new Map<string, HTMLAudioElement>();
  
  Object.entries(SOUNDS).forEach(([key, url]) => {
    const audio = new Audio(url);
    audio.preload = 'auto';
    audioCache.set(key, audio);
  });

  const getSettings = (): SoundSettings => {
    const saved = localStorage.getItem('soundSettings');
    return saved ? JSON.parse(saved) : defaultSettings;
  };

  return {
    playSound: (type: SoundType) => {
      const settings = getSettings();
      if (!settings.enabled) return;
      
      const cachedAudio = audioCache.get(type);
      if (cachedAudio) {
        const audio = cachedAudio.cloneNode() as HTMLAudioElement;
        audio.volume = settings.masterVolume * settings.effectsVolume;
        audio.play().catch(() => {});
      }
    }
  };
};

export const getGlobalSoundInstance = () => {
  if (!globalSoundInstance) {
    globalSoundInstance = createGlobalSoundInstance() as any;
  }
  return globalSoundInstance;
};