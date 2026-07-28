import React from 'react';
import {
  X,
  Bot,
  Download,
  Upload,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Activity,
  Hand,
  HelpCircle,
  Sparkles
} from 'lucide-react';

interface MobileMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  moves: number;
  optimalAiMoves: number;
  userEfficiency: number;
  highScore: number;
  isAiSolving: boolean;
  soundEnabled: boolean;
  onToggleAi: () => void;
  onSaveMap: () => void;
  onLoadMapClick: () => void;
  onRestart: () => void;
  onToggleSound: () => void;
}

export const MobileMenuModal: React.FC<MobileMenuModalProps> = ({
  isOpen,
  onClose,
  moves,
  optimalAiMoves,
  userEfficiency,
  highScore,
  isAiSolving,
  soundEnabled,
  onToggleAi,
  onSaveMap,
  onLoadMapClick,
  onRestart,
  onToggleSound
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal / Bottom Sheet Box */}
      <div className="relative z-10 w-full max-w-md bg-[#121318] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-300">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-black tracking-tight text-white uppercase italic">
              Opções do Jogo
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Stats Bar Grid */}
          <div className="grid grid-cols-2 gap-3 bg-black/40 p-3.5 rounded-2xl border border-white/10">
            <div className="text-center p-1">
              <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider block mb-0.5">
                Moves
              </span>
              <span className="text-xl font-mono font-bold text-white">
                {moves}
              </span>
            </div>
            <div className="text-center p-1 border-l border-white/10">
              <span className="text-[10px] font-bold uppercase text-blue-400 tracking-wider block mb-0.5">
                IA optimal moves
              </span>
              <span className="text-xl font-mono font-bold text-blue-400">
                {optimalAiMoves}
              </span>
            </div>
          </div>

          {/* AI Solver Toggle Button */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
              Assistente Inteligente
            </span>
            <button
              onClick={() => {
                onToggleAi();
                onClose();
              }}
              className={`w-full py-3.5 px-4 rounded-2xl border font-black uppercase italic text-xs tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 ${
                isAiSolving
                  ? 'bg-red-500/80 border-red-400 text-white animate-pulse'
                  : 'bg-yellow-400/20 border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/30'
              }`}
            >
              <Bot className="w-5 h-5" />
              {isAiSolving ? 'Parar Solver AI' : 'Executar AI Solver'}
            </button>
          </div>

          {/* Quick Game Actions */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
              Ações Rápidas
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onRestart();
                  onClose();
                }}
                className="py-3 px-3 bg-blue-500/20 border border-blue-400/30 text-blue-400 hover:bg-blue-500/30 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Novo Jogo
              </button>

              <button
                onClick={onToggleSound}
                className="py-3 px-3 bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-400" /> Som Ativado
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4 text-gray-500" /> Som Mudo
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Custom Maps Management */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
              Gerenciar Mapa
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onSaveMap}
                className="py-2.5 px-3 bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 rounded-xl font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-gray-400" />
                Salvar Mapa
              </button>
              <button
                onClick={() => {
                  onLoadMapClick();
                  onClose();
                }}
                className="py-2.5 px-3 bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 rounded-xl font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4 text-gray-400" />
                Carregar Mapa
              </button>
            </div>
          </div>

          {/* Gesture / Mobile Hint */}
          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl flex items-start gap-3">
            <div className="p-2 bg-yellow-400/10 text-yellow-400 rounded-xl">
              <Hand className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Controle por Gestos
              </h4>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                No celular, você pode <strong>deslizar o dedo na tela</strong> em qualquer direção para rolar o cubo!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/40 border-t border-white/10 text-center">
          <button
            onClick={onClose}
            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
          >
            Continuar Jogando
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileMenuModal;
