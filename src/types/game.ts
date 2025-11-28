export type ControlType = 'arrows' | 'keys' | 'hover';
export type MobileControlType = 'tap' | 'swipe' | 'touch';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'normal' | 'time-limit' | 'battle';
export type PowerUpType = 'multiBall' | 'paddleSize' | 'slowBall' | 'shield';

export interface EquippedItems {
  paddle?: { id: string; name: string; properties: any };
  ball?: { id: string; name: string; properties: any };
  powerup?: { id: string; name: string; properties: any };
  trail?: { id: string; name: string; properties: any };
  brick?: { id: string; name: string; properties: any };
  background?: { id: string; name: string; properties: any };
  aura?: { id: string; name: string; properties: any };
}

export interface PowerUpSettings {
  enabled: boolean;
  singlePlayer: boolean;
  multiplayer: boolean;
}

export interface GameSettings {
  desktopControl: ControlType;
  mobileControl: MobileControlType;
  difficulty: Difficulty;
  gameMode: GameMode;
  powerUps: PowerUpSettings;
}

export interface PowerUp {
  x: number;
  y: number;
  dy: number;
  type: PowerUpType;
  collected: boolean;
}

export interface Coin {
  x: number;
  y: number;
  dy: number;
  value: number;
  collected: boolean;
}

export interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  hasCoin?: boolean;
  type?: 'normal' | 'strong' | 'explosive';
  hits?: number;
}

export interface LevelData {
  bricks: Brick[];
  powerups: any[];
}

export interface GameState {
  ballX: number;
  ballY: number;
  paddleX: number;
  score: number;
  timestamp: number;
}
