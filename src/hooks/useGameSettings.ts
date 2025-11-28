import { useState, useEffect } from 'react';
import { GameSettings } from '@/types/game';

const DEFAULT_SETTINGS: GameSettings = {
  desktopControl: 'arrows',
  mobileControl: 'tap',
  difficulty: 'easy',
  gameMode: 'normal',
  powerUps: {
    enabled: true,
    singlePlayer: true,
    multiplayer: true,
  },
};

export const useGameSettings = () => {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const stored = localStorage.getItem('game-settings');
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse game settings');
      }
    }
  }, []);

  const updateSettings = (updates: Partial<GameSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    localStorage.setItem('game-settings', JSON.stringify(newSettings));
  };

  return { settings, updateSettings };
};
