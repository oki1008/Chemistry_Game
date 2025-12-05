import React from 'react';
import { Card as CardType, CardCategory, ElementType } from '../types';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ElementSymbol: React.FC<{ element: ElementType }> = ({ element }) => {
  const atomicNumbers: Record<string, number> = {
    H: 1, C: 6, N: 7, O: 8, Na: 11, Mg: 12, Al: 13, S: 16, Cl: 17, K: 19, Ca: 20, Fe: 26, Cu: 29, Zn: 30, Ag: 47
  };

  return (
    <div className="absolute top-1 left-2 text-[10px] font-mono opacity-70">
      {atomicNumbers[element] || ''}
    </div>
  );
};

export const CardComponent: React.FC<CardProps> = ({ card, onClick, selected, disabled, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-16 h-24 text-xs',
    md: 'w-24 h-36 text-sm',
    lg: 'w-32 h-48 text-base'
  };

  const isElement = card.category === CardCategory.ELEMENT;
  
  return (
    <div 
      onClick={!disabled ? onClick : undefined}
      className={`
        relative flex flex-col items-center justify-between p-2 rounded-lg border-2 transition-all duration-200 cursor-pointer select-none
        ${sizeClasses[size]}
        ${card.color}
        ${selected ? 'border-yellow-400 scale-105 shadow-[0_0_15px_rgba(250,204,21,0.6)] z-10' : 'border-slate-700 shadow-lg'}
        ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-xl'}
      `}
    >
      {isElement && card.element && <ElementSymbol element={card.element} />}
      
      {/* Cost Badge */}
      <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-900 border border-blue-400 rounded-full flex items-center justify-center text-xs font-bold text-white z-20">
        {card.cost}
      </div>

      <div className={`font-display font-bold text-center mt-2 ${size === 'sm' ? 'text-xs' : 'text-lg'} drop-shadow-md text-white`}>
        {isElement ? card.element : (card.condition?.includes('Heat') ? 'Δ' : '⚡')}
      </div>

      <div className="flex-grow flex items-center justify-center text-center leading-tight">
        <span className={`font-bold ${size === 'sm' ? 'text-[10px]' : 'text-xs'} text-white/90`}>
           {card.name}
        </span>
      </div>
      
      {size !== 'sm' && (
        <div className="text-[9px] text-center text-white/80 overflow-hidden h-8 leading-3">
          {card.description}
        </div>
      )}
    </div>
  );
};
