
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'this';
import { ColorType, GameState, Direction } from './types';
import { GRID_SIZE, START_POS, ALL_COLORS, INITIAL_CUBE_FACES } from './constants';
import CubeMesh from './components/CubeMesh';

// --- AI SOLVER UTILS ---

interface CubeOrientation {
  top: ColorType; bottom: ColorType; front: ColorType; back: ColorType; left: ColorType; right: ColorType;
}

const rotateOrientation = (o: CubeOrientation, dir: Direction): CubeOrientation => {
  const n = { ...o };
  if (dir === 'up') { n.top = o.back; n.front = o.top; n.bottom = o.front; n.back = o.bottom; }
  else if (dir === 'down') { n.top = o.front; n.front = o.bottom; n.bottom = o.back; n.back = o.top; }
  else if (dir === 'left') { n.top = o.right; n.right = o.bottom; n.bottom = o.left; n.left = o.top; }
  else if (dir === 'right') { n.top = o.left; n.left = o.bottom; n.bottom = o.right; n.right = o.top; }
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

const simulateAiStats = (initialGrid: ColorType[][]): { efficiency: number, moves: number } => {
  const gridCopy = initialGrid.map(row => [...row]);
  let currentPos: [number, number] = [START_POS[0], START_POS[1]];
  let currentFaces = { ...INITIAL_CUBE_FACES };
  let totalMoves = 0;

  const findPath = (g: ColorType[][], startX: number, startY: number, startF: CubeOrientation): Direction[] | null => {
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
  const efficiency = totalMoves > 0 ? Math.floor((25 / totalMoves) * 100) : 0;
  return { efficiency, moves: totalMoves };
};

// --- APP COMPONENT ---

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const grid = generateGrid();
    return {
      initialGrid: grid,
      grid: grid,
      cubePosition: [START_POS[0], START_POS[1]],
      cubeFaces: { ...INITIAL_CUBE_FACES },
      moves: 0,
      matchedCount: 1,
      status: 'playing',
      highScore: parseInt(localStorage.getItem('cube_high_score') || '0', 10),
    };
  });

  const [isRolling, setIsRolling] = useState(false);
  const [rollDirection, setRollDirection] = useState<Direction | null>(null);
  const [isAiSolving, setIsAiSolving] = useState(false);
  const [aiMoveQueue, setAiMoveQueue] = useState<Direction[]>([]);
  
  const audioContext = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const playSound = (freq: number, type: OscillatorType = 'sine', duration: number = 0.1) => {
    try {
      if (!audioContext.current) audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    } catch(e) {}
  };

  const handleRoll = useCallback((dir: Direction) => {
    if (isRolling || gameState.status !== 'playing') return;
    setRollDirection(dir);
    setIsRolling(true);
    playSound(200, 'square', 0.1);
  }, [isRolling, gameState.status]);

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

      if (currentTileColor !== ColorType.BLACK && currentTileColor !== ColorType.GRAY && currentTileColor === newFaces.bottom) {
        playSound(600, 'sine', 0.1);
        nextGrid = prev.grid.map((row, ry) => row.map((col, rx) => (ry === y && rx === x ? ColorType.BLACK : col)));
        nextMatchedCount += 1;
      }

      const isWon = nextMatchedCount === GRID_SIZE * GRID_SIZE;
      if (isWon) {
        setIsAiSolving(false);
        playSound(800, 'sine', 0.5);
        const userEfficiency = Math.floor((25 / nextMoves) * 100);
        if (userEfficiency > prev.highScore) localStorage.setItem('cube_high_score', userEfficiency.toString());
        
        // Calculate AI Shadow Score stats
        const aiStats = simulateAiStats(prev.initialGrid);

        return { 
          ...prev, 
          grid: nextGrid, 
          cubePosition: [x, y], 
          cubeFaces: newFaces, 
          moves: nextMoves, 
          matchedCount: nextMatchedCount, 
          status: 'won', 
          highScore: Math.max(prev.highScore, userEfficiency),
          aiComparisonScore: aiStats.efficiency,
          aiComparisonMoves: aiStats.moves
        };
      }

      return { ...prev, grid: nextGrid, cubePosition: [x, y], cubeFaces: newFaces, moves: nextMoves, matchedCount: nextMatchedCount };
    });
    setIsRolling(false);
    setRollDirection(null);
  }, [rollDirection]);

  const saveMap = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gameState.initialGrid));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "chromatic_grid.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleLoadMap = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const grid = JSON.parse(e.target?.result as string);
        if (Array.isArray(grid) && grid.length === GRID_SIZE) {
          setGameState({
            initialGrid: grid,
            grid: grid,
            cubePosition: [START_POS[0], START_POS[1]],
            cubeFaces: { ...INITIAL_CUBE_FACES },
            moves: 0,
            matchedCount: 1,
            status: 'playing',
            highScore: parseInt(localStorage.getItem('cube_high_score') || '0', 10),
          });
          setIsAiSolving(false);
          setAiMoveQueue([]);
        }
      } catch (err) { alert("Failed to parse grid file."); }
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
    const startX = gameState.cubePosition[0], startY = gameState.cubePosition[1], startFaces = gameState.cubeFaces;
    interface Node { x: number; y: number; faces: CubeOrientation; path: Direction[]; }
    const queue: Node[] = [{ x: startX, y: startY, faces: startFaces, path: [] }];
    const visited = new Set<string>();
    visited.add(`${startX},${startY},${getOrientationKey(startFaces)}`);
    let bestPath: Direction[] | null = null;
    while (queue.length > 0) {
      const current = queue.shift()!;
      const tileAt = gameState.grid[current.y][current.x];
      if (tileAt !== ColorType.BLACK && tileAt !== ColorType.GRAY && current.faces.bottom === tileAt) {
        bestPath = current.path;
        break;
      }
      if (current.path.length > 15) continue;
      for (const dir of ['up', 'down', 'left', 'right'] as Direction[]) {
        let nx = current.x, ny = current.y;
        if (dir === 'up') ny += 1; else if (dir === 'down') ny -= 1; else if (dir === 'left') nx -= 1; else if (dir === 'right') nx += 1;
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
        const nextFaces = rotateOrientation(current.faces, dir);
        const key = `${nx},${ny},${getOrientationKey(nextFaces)}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ x: nx, y: ny, faces: nextFaces, path: [...current.path, dir] });
        }
      }
    }
    if (bestPath) setAiMoveQueue(bestPath); else setIsAiSolving(false);
  }, [isAiSolving, gameState, isRolling, aiMoveQueue, handleRoll]);

  useEffect(() => {
    if (isAiSolving) {
      const timer = setTimeout(runAiStep, 600);
      return () => clearTimeout(timer);
    }
  }, [isAiSolving, runAiStep]);

  const toggleAi = () => { if (gameState.status === 'playing') { setAiMoveQueue([]); setIsAiSolving(!isAiSolving); } };

  const restart = () => {
    const grid = generateGrid();
    setGameState({
      initialGrid: grid,
      grid: grid,
      cubePosition: [START_POS[0], START_POS[1]],
      cubeFaces: { ...INITIAL_CUBE_FACES },
      moves: 0,
      matchedCount: 1,
      status: 'playing',
      highScore: parseInt(localStorage.getItem('cube_high_score') || '0', 10),
    });
    setIsRolling(false);
    setRollDirection(null);
    setIsAiSolving(false);
    setAiMoveQueue([]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.status !== 'playing' || isAiSolving) return;
      switch (e.key) {
        case 'ArrowUp': case 'w': handleRoll('up'); break;
        case 'ArrowDown': case 's': handleRoll('down'); break;
        case 'ArrowLeft': case 'a': handleRoll('left'); break;
        case 'ArrowRight': case 'd': handleRoll('right'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.status, handleRoll, isAiSolving]);

  const currentTileColor = gameState.grid[gameState.cubePosition[1]]?.[gameState.cubePosition[0]] || ColorType.BLACK;
  const userEfficiency = Math.floor((25 / (gameState.moves || 1)) * 100);

  const getIconColor = (bgColor: string) => (['#ffffff', '#eab308', '#f472b6'].includes(bgColor) ? '#111' : '#fff');

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#0a0a0c]">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[-5, 6, -8]} fov={45} />
        <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.2} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[0, 10, 0]} intensity={1.5} castShadow />
        <group position={[-2, -0.05, -2]}>
          {gameState.grid.map((row, y) => row.map((color, x) => (
            <mesh key={`${x}-${y}`} position={[x, 0, y]} receiveShadow>
              <boxGeometry args={[0.95, 0.1, 0.95]} />
              <meshStandardMaterial color={color} />
            </mesh>
          )))}
        </group>
        <group position={[gameState.cubePosition[0] - 2, 0, gameState.cubePosition[1] - 2]}>
           <CubeMesh faces={gameState.cubeFaces} isRolling={isRolling} rollDirection={rollDirection} onRollComplete={completeRoll} />
        </group>
      </Canvas>

      <div className="absolute top-0 left-0 p-6 pointer-events-none w-full">
        <div className="flex justify-between items-start w-full">
          <div className="flex flex-col gap-3">
            <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-2xl pointer-events-auto">
              <h1 className="text-2xl font-black tracking-tighter uppercase italic text-yellow-400">Chromatic Roller</h1>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-400">Tries: <span className="text-white font-mono text-lg">{gameState.moves}</span></p>
                <p className="text-sm text-gray-400">Efficiency: <span className="text-white font-mono text-lg">{userEfficiency}%</span></p>
                <p className="text-sm text-gray-400">High Score: <span className="text-white font-mono text-lg">{gameState.highScore}</span></p>
              </div>
            </div>
            <div className="flex flex-col gap-2 pointer-events-auto">
              <button onClick={toggleAi} className={`w-full px-4 py-3 rounded-xl border font-black uppercase italic text-xs tracking-widest transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 ${isAiSolving ? 'bg-red-500/80 border-red-400 text-white animate-pulse' : 'bg-yellow-400/20 border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/30'}`}>
                {isAiSolving ? <><div className="w-2 h-2 rounded-full bg-white animate-ping" />Stop AI Solver</> : <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z"/></svg>Run AI Solver</>}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={saveMap} className="px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-[10px] uppercase font-bold tracking-wider hover:bg-white/10 transition-colors">Save Map</button>
                <button onClick={() => fileInputRef.current?.click()} className="px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-[10px] uppercase font-bold tracking-wider hover:bg-white/10 transition-colors">Load Map</button>
                <input type="file" ref={fileInputRef} onChange={handleLoadMap} accept=".json" className="hidden" />
              </div>
              <button onClick={restart} className="w-full px-3 py-2 bg-blue-500/20 border border-blue-400/30 text-blue-400 rounded-lg text-[10px] uppercase font-bold tracking-wider hover:bg-blue-400/20 transition-colors">New Random Board</button>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold text-gray-500 mb-2">Cube Bottom</span>
              <div className="w-10 h-10 rounded shadow-inner" style={{ backgroundColor: gameState.cubeFaces.bottom }} />
            </div>
            <div className="bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold text-gray-500 mb-2">Tile Color</span>
              <div className="w-10 h-10 rounded shadow-inner" style={{ backgroundColor: currentTileColor }} />
            </div>
          </div>
        </div>
      </div>

      {gameState.status === 'playing' && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <button onPointerDown={() => handleRoll('up')} className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center transition-all active:scale-95 border-2 border-white/20 shadow-xl" style={{ backgroundColor: gameState.cubeFaces.front, color: getIconColor(gameState.cubeFaces.front) }}>
            <svg className="w-8 h-8 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M7 13l5 5 5-5M7 6l5 5 5-5" /></svg>
          </button>
          <div className="flex gap-2">
            <button onPointerDown={() => handleRoll('right')} className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center transition-all active:scale-95 border-2 border-white/20 shadow-xl" style={{ backgroundColor: gameState.cubeFaces.right, color: getIconColor(gameState.cubeFaces.right) }}>
              <svg className="w-8 h-8 rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M7 13l5 5 5-5M7 6l5 5 5-5" /></svg>
            </button>
            <button onPointerDown={() => handleRoll('down')} className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center transition-all active:scale-95 border-2 border-white/20 shadow-xl" style={{ backgroundColor: gameState.cubeFaces.back, color: getIconColor(gameState.cubeFaces.back) }}>
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M7 13l5 5 5-5M7 6l5 5 5-5" /></svg>
            </button>
            <button onPointerDown={() => handleRoll('left')} className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center transition-all active:scale-95 border-2 border-white/20 shadow-xl" style={{ backgroundColor: gameState.cubeFaces.left, color: getIconColor(gameState.cubeFaces.left) }}>
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M7 13l5 5 5-5M7 6l5 5 5-5" /></svg>
            </button>
          </div>
        </div>
      )}

      {gameState.status !== 'playing' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300 z-50">
          <div className="bg-zinc-900 p-8 rounded-3xl border border-white/20 shadow-2xl max-w-sm w-full text-center">
            {gameState.status === 'won' ? (
              <>
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-4xl font-black text-white mb-2 italic">VICTORY!</h2>
                <p className="text-gray-400 mb-8">Board completed successfully.</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-yellow-400/20">
                    <p className="text-[10px] uppercase text-gray-500 font-bold mb-1 tracking-widest">Your Efficiency</p>
                    <p className="text-3xl font-mono text-yellow-400">{userEfficiency}%</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <p className="text-[10px] uppercase text-gray-500 font-bold mb-1 tracking-widest">Total Moves</p>
                    <p className="text-3xl font-mono text-white">{gameState.moves}</p>
                  </div>
                </div>
                {gameState.aiComparisonScore !== undefined && (
                  <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-400/20 mb-8">
                    <p className="text-[10px] uppercase text-blue-400/60 font-bold mb-3 tracking-widest">Shadow AI Comparison</p>
                    <div className="flex justify-between gap-4">
                      <div className="flex-1 text-center">
                        <p className="text-xs text-blue-300/60 uppercase font-black mb-1">Efficiency</p>
                        <p className="text-2xl font-mono text-blue-400">{gameState.aiComparisonScore}%</p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-xs text-blue-300/60 uppercase font-black mb-1">Attempts</p>
                        <p className="text-2xl font-mono text-blue-400">{gameState.aiComparisonMoves}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">💀</div>
                <h2 className="text-4xl font-black text-white mb-2 italic uppercase">You Fell!</h2>
                <p className="text-gray-400 mb-8">The grid has boundaries!</p>
              </>
            )}
            <button onClick={restart} className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black py-4 rounded-2xl transition-all active:scale-95 text-xl uppercase italic tracking-tighter">Try Again</button>
          </div>
        </div>
      )}

      {isAiSolving && (
        <div className="absolute top-1/2 right-10 -translate-y-1/2 flex flex-col items-center gap-1 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/20 text-[10px] font-bold uppercase tracking-[0.2em] text-white">AI Thinking...</div>
          <div className="text-[10px] text-gray-500 font-mono">Moves in Queue: {aiMoveQueue.length}</div>
        </div>
      )}
    </div>
  );
};

export default App;
