import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Direction, ColorType } from '../types';

interface DPadControlsProps {
  cubeFaces: {
    top: ColorType;
    bottom: ColorType;
    front: ColorType;
    back: ColorType;
    left: ColorType;
    right: ColorType;
  };
  onRoll: (dir: Direction) => void;
  disabled?: boolean;
}

export const DPadControls: React.FC<DPadControlsProps> = ({
  cubeFaces,
  onRoll,
  disabled = false
}) => {
  const getIconColor = (bgColor: string) =>
    ['#ffffff', '#eab308', '#f472b6'].includes(bgColor) ? '#111111' : '#ffffff';

  return (
    <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex flex-col items-center gap-1.5 sm:gap-2 select-none">
      {/* Up Button */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          if (!disabled) onRoll('up');
        }}
        disabled={disabled}
        className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center transition-all active:scale-90 border-2 border-white/20 shadow-2xl disabled:opacity-50"
        style={{
          backgroundColor: cubeFaces.front,
          color: getIconColor(cubeFaces.front)
        }}
        title="Rolar para Cima (W / Seta Cima)"
      >
        <ChevronUp className="w-7 h-7 stroke-[3]" />
      </button>

      {/* Left, Down, Right Row */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Left Button */}
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            if (!disabled) onRoll('right');
          }}
          disabled={disabled}
          className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center transition-all active:scale-90 border-2 border-white/20 shadow-2xl disabled:opacity-50"
          style={{
            backgroundColor: cubeFaces.left,
            color: getIconColor(cubeFaces.left)
          }}
          title="Botão Esquerda -> Rolar para Direita"
        >
          <ChevronLeft className="w-7 h-7 stroke-[3]" />
        </button>

        {/* Down Button */}
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            if (!disabled) onRoll('down');
          }}
          disabled={disabled}
          className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center transition-all active:scale-90 border-2 border-white/20 shadow-2xl disabled:opacity-50"
          style={{
            backgroundColor: cubeFaces.back,
            color: getIconColor(cubeFaces.back)
          }}
          title="Rolar para Baixo (S / Seta Baixo)"
        >
          <ChevronDown className="w-7 h-7 stroke-[3]" />
        </button>

        {/* Right Button */}
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            if (!disabled) onRoll('left');
          }}
          disabled={disabled}
          className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center transition-all active:scale-90 border-2 border-white/20 shadow-2xl disabled:opacity-50"
          style={{
            backgroundColor: cubeFaces.right,
            color: getIconColor(cubeFaces.right)
          }}
          title="Botão Direita -> Rolar para Esquerda"
        >
          <ChevronRight className="w-7 h-7 stroke-[3]" />
        </button>
      </div>
    </div>
  );
};

export default DPadControls;
