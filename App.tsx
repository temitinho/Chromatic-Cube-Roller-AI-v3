import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { ColorType, GameState, Direction } from './types';
import { GRID_SIZE, START_POS, ALL_COLORS, INITIAL_CUBE_FACES } from './constants';
import CubeMesh from './components/CubeMesh';
import HeaderHUD from './components/HeaderHUD';
import MobileMenuModal from './components/MobileMenuModal';
import DPadControls from './components/DPadControls';
import { Trophy, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';

// --- AI SOLVER UTILS ---

interface CubeOrientation {
  top: ColorType;
  bottom: ColorType;
  front: ColorType;
  back: ColorType;
  left: ColorType;
  right: ColorType;
}

const rotateOrientation = (o: CubeOrientation, dir: Direction): CubeOrientation => {
  const n = { ...o };
  if (dir === 'up') {
    n.top = o.back; n.front = o.top; n.bottom = o.front; n.back = o.bottom;
  } else if (dir === 'down') {
    n.top = o.front; n.front = o.bottom; n.bottom = o.back; n.back = o.top;
  } else if (dir === 'left') {
    n.top = o.right; n.right = o.bottom; n.bottom = o.left; n.left = o.top;
  } else if (dir === 'right') {
    n.top = o.left; n.left = o.bottom; n.bottom = o.right; n.right = o.top;
  }
  return n;
};

const getOrientationKey = (o: CubeOrientation) => `${o.top}-${o.front}`;

const generateGrid = (): ColorType[][] => {
  const totalTiles = GRID_SIZE * GRID_SIZE;
  const playableTiles = totalTiles - 1;
  const colorCount = ALL_COLORS.length;
  const tilesPerColor = Math.floor(playableTiles / colorCount);
  const colorPool: ColorType[] = [];
  ALL_COLORS.forEach(color => {
    for (let i = 0; i < tilesPerColor; i++) colorPool.push(color);
  });
  for (let i = colorPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [colorPool[i], colorPool[j]] = [colorPool[j], colorPool[i]];
  }
  const grid: ColorType[][] = [];
  let poolIdx = 0;
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: ColorType[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      if (x === START_POS[0] && y === START_POS[1]) row.push(ColorType.GRAY);
      else row.push(colorPool[poolIdx++]);
    }
    grid.push(row);
  }
  return grid;
};

const simulateAiStats = (initialGrid: ColorType[][]): { efficiency: number; moves: number } => {
  const gridCopy = initialGrid.map(row => [...row]);
  let currentPos: [number, number] = [START_POS[0], START_POS[1]];
  let currentFaces = { ...INITIAL_CUBE_FACES };
  let totalMoves = 0;

  const findPath = (
    g: ColorType[][],
    startX: number,
    startY: number,
    startF: CubeOrientation
  ): Direction[] | null => {
    interface Node { x: number; y: number; faces: CubeOrientation; path: Direction[]; }
    const queue: Node[] = [{ x: startX, y: startY, faces: startF, path: [] }];
    const visited = new Set<string>();
    visited.add(`${startX},${startY},${getOrientationKey(startF)}`);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const tileAt = g[curr.y][curr.x];
      if (tileAt !== ColorType.BLACK && tileAt !== ColorType.GRAY && curr.faces.bottom === tileAt) {
        return curr.path;
      }
      if (curr.path.length > 15) continue;
      for (const dir of ['up', 'down', 'left', 'right'] as Direction[]) {
        let nx = curr.x, ny = curr.y;
        if (dir === 'up') ny++; else if (dir === 'down') ny--; else if (dir === 'left') nx--; else if (dir === 'right') nx++;
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
        const nextFaces = rotateOrientation(curr.faces, dir);
        const key = `${nx},${ny},${getOrientationKey(nextFaces)}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ x: nx, y: ny, faces: nextFaces, path: [...curr.path, dir] });
        }
      }
    }
    return null;
  };

  while (true) {
    const path = findPath(gridCopy, currentPos[0], currentPos[1], currentFaces);
    if (!path) break;
    totalMoves += path.length;
    for (const dir of path) {
      currentFaces = rotateOrientation(currentFaces, dir);
      if (dir === 'up') currentPos[1]++; else if (dir === 'down') currentPos[1]--; else if (dir === 'left') currentPos[0]--; else if (dir === 'right') currentPos[0]++;
    }
    gridCopy[currentPos[1]][currentPos[0]] = ColorType.BLACK;
  }
  const efficiency = totalMoves > 0 ? totalMoves : 0;
  return { efficiency, moves: totalMoves };
};

// --- APP COMPONENT ---

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const grid = generateGrid();
    const aiStats = simulateAiStats(grid);
    return {
      initialGrid: grid,
      grid: grid,
      cubePosition: [START_POS[0], START_POS[1]],
      cubeFaces: { ...INITIAL_CUBE_FACES },
      moves: 0,
      optimalAiMoves: aiStats.moves || 30,
      matchedCount: 1,
      status: 'playing',
      highScore: parseInt(localStorage.getItem('cube_high_score') || '0', 10)
    };
  });

  const [isRolling, setIsRolling] = useState(false);
  const [rollDirection, setRollDirection] = useState<Direction | null>(null);
  const [isAiSolving, setIsAiSolving] = useState(false);
  const [aiMoveQueue, setAiMoveQueue] = useState<Direction[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const playSound = (freq: number, type: OscillatorType = 'sine', duration: number = 0.1) => {
    if (!soundEnabled) return;
    try {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const osc = audioContext.current.createOscillator();
      const gain = audioContext.current.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioContext.current.currentTime);
      gain.gain.setValueAtTime(0.05, audioContext.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.current.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioContext.current.destination);
      osc.start();
      osc.stop(audioContext.current.currentTime + duration);
    } catch (e) {}
  };

  const handleRoll = useCallback(
    (dir: Direction) => {
      if (isRolling || gameState.status !== 'playing') return;
      setRollDirection(dir);
      setIsRolling(true);
      playSound(200, 'square', 0.1);
    },
    [isRolling, gameState.status, soundEnabled]
  );

  const completeRoll = useCallback(() => {
    if (!rollDirection) return;
    setGameState(prev => {
      let [x, y] = prev.cubePosition;
      const oldFaces = { ...prev.cubeFaces };
      const newFaces = rotateOrientation(oldFaces, rollDirection!);

      switch (rollDirection) {
        case 'up': y += 1; break;
        case 'down': y -= 1; break;
        case 'left': x -= 1; break;
        case 'right': x += 1; break;
      }

      if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
        setIsAiSolving(false);
        playSound(100, 'sawtooth', 0.5);
        return { ...prev, status: 'lost' };
      }

      const nextMoves = prev.moves + 1;
      const currentTileColor = prev.grid[y][x];
      let nextGrid = prev.grid;
      let nextMatchedCount = prev.matchedCount;

      if (
        currentTileColor !== ColorType.BLACK &&
        currentTileColor !== ColorType.GRAY &&
        currentTileColor === newFaces.bottom
      ) {
        playSound(600, 'sine', 0.1);
        nextGrid = prev.grid.map((row, ry) =>
          row.map((col, rx) => (ry === y && rx === x ? ColorType.BLACK : col))
        );
        nextMatchedCount += 1;
      }

      const isWon = nextMatchedCount === GRID_SIZE * GRID_SIZE;
      if (isWon) {
        setIsAiSolving(false);
        playSound(800, 'sine', 0.5);
        const finalEfficiency = Math.min(
          100,
          Math.round((prev.optimalAiMoves / nextMoves) * 100)
        );
        if (finalEfficiency > prev.highScore) {
          localStorage.setItem('cube_high_score', finalEfficiency.toString());
        }

        return {
          ...prev,
          grid: nextGrid,
          cubePosition: [x, y],
          cubeFaces: newFaces,
          moves: nextMoves,
          matchedCount: nextMatchedCount,
          status: 'won',
          highScore: Math.max(prev.highScore, finalEfficiency),
          aiComparisonScore: 100,
          aiComparisonMoves: prev.optimalAiMoves
        };
      }

      return {
        ...prev,
        grid: nextGrid,
        cubePosition: [x, y],
        cubeFaces: newFaces,
        moves: nextMoves,
        matchedCount: nextMatchedCount
      };
    });
    setIsRolling(false);
    setRollDirection(null);
  }, [rollDirection, soundEnabled]);

  const saveMap = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(gameState.initialGrid));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'chromatic_grid.json');
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleLoadMap = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const grid = JSON.parse(e.target?.result as string);
        if (Array.isArray(grid) && grid.length === GRID_SIZE) {
          const aiStats = simulateAiStats(grid);
          setGameState({
            initialGrid: grid,
            grid: grid,
            cubePosition: [START_POS[0], START_POS[1]],
            cubeFaces: { ...INITIAL_CUBE_FACES },
            moves: 0,
            optimalAiMoves: aiStats.moves || 30,
            matchedCount: 1,
            status: 'playing',
            highScore: parseInt(localStorage.getItem('cube_high_score') || '0', 10)
          });
          setIsAiSolving(false);
          setAiMoveQueue([]);
        }
      } catch (err) {
        alert('Erro ao carregar o mapa. Verifique o arquivo JSON.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runAiStep = useCallback(() => {
    if (!isAiSolving || gameState.status !== 'playing' || isRolling) return;
    if (aiMoveQueue.length > 0) {
      const nextMove = aiMoveQueue[0];
      setAiMoveQueue(prev => prev.slice(1));
      handleRoll(nextMove);
      return;
    }
    const startX = gameState.cubePosition[0],
      startY = gameState.cubePosition[1],
      startFaces = gameState.cubeFaces;
    interface Node {
      x: number;
      y: number;
      faces: CubeOrientation;
      path: Direction[];
    }
    const queue: Node[] = [{ x: startX, y: startY, faces: startFaces, path: [] }];
    const visited = new Set<string>();
    visited.add(`${startX},${startY},${getOrientationKey(startFaces)}`);
    let bestPath: Direction[] | null = null;
    while (queue.length > 0) {
      const current = queue.shift()!;
      const tileAt = gameState.grid[current.y][current.x];
      if (
        tileAt !== ColorType.BLACK &&
        tileAt !== ColorType.GRAY &&
        current.faces.bottom === tileAt
      ) {
        bestPath = current.path;
        break;
      }
      if (current.path.length > 15) continue;
      for (const dir of ['up', 'down', 'left', 'right'] as Direction[]) {
        let nx = current.x,
          ny = current.y;
        if (dir === 'up') ny += 1;
        else if (dir === 'down') ny -= 1;
        else if (dir === 'left') nx -= 1;
        else if (dir === 'right') nx += 1;
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
        const nextFaces = rotateOrientation(current.faces, dir);
        const key = `${nx},${ny},${getOrientationKey(nextFaces)}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ x: nx, y: ny, faces: nextFaces, path: [...current.path, dir] });
        }
      }
    }
    if (bestPath) setAiMoveQueue(bestPath);
    else setIsAiSolving(false);
  }, [isAiSolving, gameState, isRolling, aiMoveQueue, handleRoll]);

  useEffect(() => {
    if (isAiSolving) {
      const timer = setTimeout(runAiStep, 500);
      return () => clearTimeout(timer);
    }
  }, [isAiSolving, runAiStep]);

  const toggleAi = () => {
    if (gameState.status === 'playing') {
      setAiMoveQueue([]);
      setIsAiSolving(!isAiSolving);
    }
  };

  const restart = () => {
    const grid = generateGrid();
    const aiStats = simulateAiStats(grid);
    setGameState({
      initialGrid: grid,
      grid: grid,
      cubePosition: [START_POS[0], START_POS[1]],
      cubeFaces: { ...INITIAL_CUBE_FACES },
      moves: 0,
      optimalAiMoves: aiStats.moves || 30,
      matchedCount: 1,
      status: 'playing',
      highScore: parseInt(localStorage.getItem('cube_high_score') || '0', 10)
    });
    setIsRolling(false);
    setRollDirection(null);
    setIsAiSolving(false);
    setAiMoveQueue([]);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.status !== 'playing' || isAiSolving) return;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          handleRoll('up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          handleRoll('down');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          handleRoll('right');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          handleRoll('left');
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.status, handleRoll, isAiSolving]);

  // Touch Swipe Handlers for mobile device screen control
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (
      !touchStartRef.current ||
      gameState.status !== 'playing' ||
      isRolling ||
      isAiSolving
    )
      return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const minSwipeDistance = 30; // pixels

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) handleRoll('left');
        else handleRoll('right');
      }
    } else {
      if (Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0) handleRoll('down');
        else handleRoll('up');
      }
    }
    touchStartRef.current = null;
  };

  const currentTileColor =
    gameState.grid[gameState.cubePosition[1]]?.[gameState.cubePosition[0]] || ColorType.BLACK;
  const userEfficiency =
    gameState.moves > 0
      ? Math.min(100, Math.round((gameState.optimalAiMoves / gameState.moves) * 100))
      : 100;

  return (
    <div
      className="relative w-full h-full select-none overflow-hidden bg-[#0a0a0c] touch-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Hidden File Input for Loading Maps */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLoadMap}
        accept=".json"
        className="hidden"
      />

      {/* 3D Canvas */}
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[-5, 6, -8]} fov={45} />
        <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.2} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[0, 10, 0]} intensity={1.5} castShadow />
        <group position={[-2, -0.05, -2]}>
          {gameState.grid.map((row, y) =>
            row.map((color, x) => (
              <mesh key={`${x}-${y}`} position={[x, 0, y]} receiveShadow>
                <boxGeometry args={[0.95, 0.1, 0.95]} />
                <meshStandardMaterial color={color} />
              </mesh>
            ))
          )}
        </group>
        <group position={[gameState.cubePosition[0] - 2, 0, gameState.cubePosition[1] - 2]}>
          <CubeMesh
            faces={gameState.cubeFaces}
            isRolling={isRolling}
            rollDirection={rollDirection}
            onRollComplete={completeRoll}
          />
        </group>
      </Canvas>

      {/* Header HUD Bar */}
      <HeaderHUD
        moves={gameState.moves}
        optimalAiMoves={gameState.optimalAiMoves}
        userEfficiency={userEfficiency}
        highScore={gameState.highScore}
        cubeBottomColor={gameState.cubeFaces.bottom}
        currentTileColor={currentTileColor}
        isAiSolving={isAiSolving}
        soundEnabled={soundEnabled}
        onOpenMenu={() => setIsMenuOpen(true)}
        onRestart={restart}
        onToggleAi={toggleAi}
        onToggleSound={() => setSoundEnabled(prev => !prev)}
      />

      {/* AI Solving Floating Badge */}
      {isAiSolving && (
        <div className="absolute top-20 right-4 sm:right-6 z-20 flex flex-col items-end gap-1 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-xl px-3.5 py-1.5 rounded-full border border-yellow-400/40 text-[10px] font-bold uppercase tracking-[0.15em] text-yellow-400 flex items-center gap-2 shadow-xl animate-pulse">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            AI Resolvendo...
          </div>
          <div className="text-[10px] text-gray-400 font-mono bg-black/50 px-2 py-0.5 rounded-md">
            Fila: {aiMoveQueue.length} mov.
          </div>
        </div>
      )}

      {/* Touch D-Pad Controls */}
      {gameState.status === 'playing' && (
        <DPadControls
          cubeFaces={gameState.cubeFaces}
          onRoll={handleRoll}
          disabled={isRolling || isAiSolving}
        />
      )}

      {/* Mobile Options Modal / Bottom Sheet */}
      <MobileMenuModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        moves={gameState.moves}
        optimalAiMoves={gameState.optimalAiMoves}
        userEfficiency={userEfficiency}
        highScore={gameState.highScore}
        isAiSolving={isAiSolving}
        soundEnabled={soundEnabled}
        onToggleAi={toggleAi}
        onSaveMap={saveMap}
        onLoadMapClick={() => fileInputRef.current?.click()}
        onRestart={restart}
        onToggleSound={() => setSoundEnabled(prev => !prev)}
      />

      {/* Game Over / Victory Modal */}
      {gameState.status !== 'playing' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-300">
          <div className="bg-[#121318] p-6 sm:p-8 rounded-3xl border border-white/20 shadow-2xl max-w-sm w-full text-center">
            {gameState.status === 'won' ? (
              <>
                <div className="w-16 h-16 bg-yellow-400/20 text-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-400/30">
                  <Trophy className="w-8 h-8" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-1 italic">
                  VITÓRIA!
                </h2>
                <p className="text-gray-400 text-xs sm:text-sm mb-6">
                  Você completou todo o tabuleiro com sucesso.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
                    <p className="text-[10px] uppercase text-gray-400 font-bold mb-0.5 tracking-wider">
                      Moves
                    </p>
                    <p className="text-2xl font-mono font-bold text-white">
                      {gameState.moves}
                    </p>
                  </div>
                  <div className="bg-blue-500/10 p-3.5 rounded-2xl border border-blue-400/20">
                    <p className="text-[10px] uppercase text-blue-400 font-bold mb-0.5 tracking-wider">
                      IA optimal moves
                    </p>
                    <p className="text-2xl font-mono font-bold text-blue-400">
                      {gameState.optimalAiMoves}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-1 italic uppercase">
                  VOCÊ CAIU!
                </h2>
                <p className="text-gray-400 text-xs sm:text-sm mb-6">
                  Cuidado com as bordas do tabuleiro!
                </p>
              </>
            )}

            <button
              onClick={restart}
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black py-3.5 rounded-2xl transition-all active:scale-95 text-lg uppercase italic tracking-tight flex items-center justify-center gap-2 shadow-lg"
            >
              <RefreshCw className="w-5 h-5" />
              Tentar Novamente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
