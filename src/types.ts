export interface Vector2D {
  x: number;
  y: number;
}

export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isOpenDoor?: boolean;
}

export interface Door {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isOpen: boolean;
  isLocked: boolean;
  requiredKeyColor?: string;
}

export interface HidingSpot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'locker' | 'bed' | 'cabinet';
}

export interface GameItem {
  id: string;
  x: number;
  y: number;
  type: 'fuse' | 'battery' | 'key' | 'diary';
  collected: boolean;
  keyColor?: string; // e.g. 'red', 'blue'
  diaryIndex?: number;
}

export interface Player {
  x: number;
  y: number;
  angle: number; // in radians
  speed: number;
  radius: number;
  flashlightOn: boolean;
  flashlightBattery: number; // 0 to 100
  isSliding?: boolean;
  movementMode: 'crouch' | 'walk' | 'run';
  noiseLevel: number; // 0 (none) to 100 (loudest)
  panicLevel: number; // 0 (calm) to 100 (extreme fear)
  isHiding: boolean;
  currentHidingSpotId: string | null;
  breathRemaining: number; // 100 to 0 (drops during breath holding)
}

export interface Enemy {
  x: number;
  y: number;
  angle: number; // facing direction
  radius: number;
  speed: number;
  state: 'patrol' | 'investigate' | 'chase' | 'search';
  patrolPath: Vector2D[];
  currentPathIndex: number;
  lastKnownPlayerPos: Vector2D | null;
  alertLevel: number; // 0 (calm) to 100 (hunting-chase)
  searchTimer: number; // time spent searching a location
  pulseTime: number; // for rendering animation
}

export interface Diary {
  title: string;
  author: string;
  date: string;
  content: string;
}

export type GamePhase = 'intro' | 'menu' | 'tutorial' | 'playing' | 'hiding_minigame' | 'gameover' | 'gamewon';
