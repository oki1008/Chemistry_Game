import React from 'react';
import { Molecule, MoleculeType } from '../types';
import { Shield, Sword, Skull, Zap, Sparkles } from 'lucide-react';

interface MoleculeProps {
  molecule: Molecule;
  owner: 'player' | 'cpu';
}

export const MoleculeDisplay: React.FC<MoleculeProps> = ({ molecule, owner }) => {
  const isAttack = molecule.type === MoleculeType.ATTACKER;
  const isDefense = molecule.type === MoleculeType.DEFENDER;
  const isPlayer = owner === 'player';
  
  const getIcon = () => {
    if (molecule.specialEffect === 'STUN') return <Zap size={14} className="fill-yellow-400 text-yellow-600" />;
    if (molecule.specialEffect === 'POISON') return <Skull size={14} className="fill-purple-400 text-purple-600" />;
    if (isDefense) return <Shield size={14} className="fill-blue-400 text-blue-600" />;
    return <Sword size={14} className="fill-red-400 text-red-600" />;
  };

  const bgColor = isPlayer 
    ? (isAttack ? 'bg-cyan-100' : 'bg-blue-100')
    : (isAttack ? 'bg-red-100' : 'bg-orange-100');

  const borderColor = isPlayer
    ? (isAttack ? 'border-cyan-500' : 'border-blue-500')
    : (isAttack ? 'border-red-500' : 'border-orange-500');

  return (
    <div className={`
      relative flex flex-col items-center w-24 h-24 rounded-full border-4
      ${bgColor} ${borderColor}
      shadow-lg pop-shadow transition-transform hover:scale-110 animate-in zoom-in duration-300
    `}>
      {/* Power Badge */}
      <div className={`
        absolute -top-1 -right-1 w-8 h-8 rounded-full border-2 bg-white flex items-center justify-center shadow-md z-10
        ${borderColor}
      `}>
         <span className="font-black text-sm text-slate-700">{molecule.power}</span>
      </div>

      {/* Formula Area */}
      <div className="flex-1 flex flex-col items-center justify-center z-0 pt-2">
         <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-0.5 flex items-center gap-1">
             {getIcon()}
             {isAttack ? 'ATK' : 'DEF'}
         </div>
         <div className={`text-2xl font-mono font-black ${isPlayer ? 'text-slate-800' : 'text-red-900'}`}>
            {molecule.formula}
         </div>
      </div>
      
      {/* Name Label */}
      <div className={`
        absolute -bottom-2 w-28 py-1 px-2 rounded-lg text-center shadow-sm border-2
        ${isPlayer ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-800 text-white border-slate-600'}
      `}>
        <div className="text-[10px] font-bold truncate leading-none">
            {molecule.name}
        </div>
      </div>
      
      {/* Sparkle effect for new creates */}
      <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-pulse pointer-events-none"></div>
    </div>
  );
};