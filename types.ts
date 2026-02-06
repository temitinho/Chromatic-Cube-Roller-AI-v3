
export enum ColorType {
  GREEN = '#22c55e',
  RED = '#ef4444',
  BLUE = '#3b82f6',
  YELLOW = '#eab308',
  PINK = '#f472b6',
  WHITE = '#ffffff',
  BLACK = '#171717',
  GRAY = '#71717a',
  MAGENTA = '#d946ef'
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface GameState {
  initialGrid: ColorType[][];
  grid: ColorType[][];
  cubePosition: [number, number];
  cubeFaces: {
    top: ColorType;
    bottom: ColorType;
    front: ColorType;
    back: ColorType;
    left: ColorType;
    right: ColorType;
  };
  moves: number;
  matchedCount: number;
  status: 'playing' | 'won' | 'lost';
  highScore: number;
  aiComparisonScore?: number;
  aiComparisonMoves?: number;
}
