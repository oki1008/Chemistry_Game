
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
    <div className="absolute top-1 left-2 text-[10px] font-mono font-bold bg-black/20 text-white px-1.5 rounded-md shadow-sm">
      {atomicNumbers[element] || ''}
    </div>
  );
};

export const CardComponent: React.FC<CardProps> = ({ card, onClick, selected, disabled, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-14 h-20 text-[10px]',
    md: 'w-24 h-32 text-xs',
    lg: 'w-28 h-40 text-sm'
  };

  const isElement = card.category === CardCategory.ELEMENT;
  
  return (
    <div 
      onClick={!disabled ? onClick : undefined}
      className={`
        animate-pop
        relative flex flex-col items-center p-1.5 rounded-2xl transition-all duration-300 cursor-pointer select-none
        border-b-[5px] border-r-[4px] border-l-2 border-t-2
        ${sizeClasses[size]}
        ${card.color}
        ${selected 
            ? 'ring-4 ring-yellow-400 scale-110 z-20 translate-y-[-20px] shadow-2xl rotate-0' 
            : 'shadow-md hover:-translate-y-2 hover:shadow-xl hover:rotate-1 z-0'
        }
        ${disabled ? 'opacity-40 grayscale cursor-not-allowed border-gray-400 bg-gray-200' : 'active:scale-95'}
      `}
    >
      {isElement && card.element && <ElementSymbol element={card.element} />}
      
      {/* Selected Indicator Checkmark */}
      {selected && (
        <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 rounded-full w-6 h-6 flex items-center justify-center font-bold border-2 border-white shadow-sm z-30 animate-in zoom-in">
          ✓
        </div>
      )}

      <div className="flex-1 w-full bg-white/20 rounded-xl flex flex-col items-center justify-center mb-1 mt-3 relative overflow-hidden backdrop-blur-sm border border-white/30">
          {/* Main Icon/Symbol */}
          <div className={`relative z-10 font-mono font-black text-center drop-shadow-sm ${size === 'sm' ? 'text-lg' : 'text-4xl'}`}>
            {isElement ? card.element : (card.condition?.includes('Heat') ? 'Δ' : (card.condition?.includes('Water') ? 'H₂O' : '⚡'))}
          </div>
      </div>

      {/* Name */}
      <div className="w-full bg-black/10 rounded-lg py-1 px-0.5 text-center">
        <span className={`font-bold leading-none block truncate ${size === 'sm' ? 'text-[8px]' : 'text-[10px]'}`}>
           {card.name}
        </span>
      </div>
    </div>
  );
};
