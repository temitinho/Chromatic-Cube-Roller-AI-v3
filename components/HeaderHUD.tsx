import React from 'react';
import { Menu, Bot, RotateCcw, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { ColorType } from '../types';

interface HeaderHUDProps {
  moves: number;
  optimalAiMoves: number;
  userEfficiency: number;
  highScore: number;
  cubeBottomColor: ColorType;
  currentTileColor: ColorType;
  isAiSolving: boolean;
  soundEnabled: boolean;
  onOpenMenu: () => void;
  onRestart: () => void;
  onToggleAi: () => void;
  onToggleSound: () => void;
}

export const HeaderHUD: React.FC<HeaderHUDProps> = ({
  moves,
  optimalAiMoves,
  userEfficiency,
  highScore,
  cubeBottomColor,
  currentTileColor,
  isAiSolving,
  soundEnabled,
  onOpenMenu,
  onRestart,
  onToggleAi,
  onToggleSound
}) => {
  const isColorMatch =
    currentTileColor !== ColorType.BLACK &&
    currentTileColor !== ColorType.GRAY &&
    cubeBottomColor === currentTileColor;

  return (
    <header className="absolute top-0 left-0 right-0 z-30 p-3 sm:p-4 pointer-events-none flex items-center justify-between gap-2 max-w-7xl mx-auto">
      {/* Brand & Stats / Mobile Trigger */}
      <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
        <div className="bg-black/60 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
              <h1 className="text-sm sm:text-base font-black tracking-tight uppercase italic text-yellow-400 leading-none">
                Chromatic
              </h1>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-gray-300">
              <span>Moves: <strong className="text-white font-bold">{moves}</strong></span>
              <span className="text-white/20">•</span>
              <span>IA optimal moves: <strong className="text-blue-400 font-bold">{optimalAiMoves}</strong></span>
            </div>
          </div>
        </div>

        {/* Mobile Options Menu Button */}
        <button
          onClick={onOpenMenu}
          className="relative group bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/40 p-2.5 sm:p-3 rounded-2xl transition-all active:scale-95 shadow-lg flex items-center gap-2"
          title="Opções do Jogo"
        >
          <Menu className="w-5 h-5" />
          <span className="text-xs font-black uppercase italic tracking-wider hidden sm:inline">
            Opções
          </span>
          {isAiSolving && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-ping" />
          )}
        </button>
      </div>

      {/* Right Controls & Color Indicators */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Desktop Quick Actions */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={onToggleAi}
            className={`px-3 py-2 rounded-xl border text-xs font-black uppercase italic tracking-wider transition-all flex items-center gap-1.5 ${
              isAiSolving
                ? 'bg-red-500/80 border-red-400 text-white animate-pulse'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-200'
            }`}
          >
            <Bot className="w-4 h-4 text-yellow-400" />
            {isAiSolving ? 'AI Ativa' : 'AI Solver'}
          </button>

          <button
            onClick={onToggleSound}
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl transition-all"
            title="Som"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
          </button>

          <button
            onClick={onRestart}
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-xl transition-all"
            title="Reiniciar Tabuleiro"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Color Match Swatches */}
        <div className="bg-black/60 backdrop-blur-md p-2 sm:p-2.5 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-2 sm:gap-3">
          {/* Bottom Face */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">
              Base
            </span>
            <div
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg shadow-inner border border-white/20 transition-all duration-300"
              style={{ backgroundColor: cubeBottomColor }}
            />
          </div>

          <span className="text-gray-600 font-bold text-xs">vs</span>

          {/* Tile Face */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">
              Piso
            </span>
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg shadow-inner border transition-all duration-300 relative ${
                isColorMatch
                  ? 'border-emerald-400 scale-110 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                  : 'border-white/20'
              }`}
              style={{ backgroundColor: currentTileColor }}
            >
              {isColorMatch && (
                <Sparkles className="w-3 h-3 text-white absolute -top-1 -right-1 animate-spin" />
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderHUD;
