import React from 'react';
import { Molecule, MoleculeType } from '../types';
import { Shield, Sword, Skull, Zap } from 'lucide-react';

interface MoleculeProps {
  molecule: Molecule;
  owner: 'player' | 'cpu';
}

export const MoleculeDisplay: React.FC<MoleculeProps> = ({ molecule, owner }) => {
  const isAttack = molecule.type === MoleculeType.ATTACKER;
  const isDefense = molecule.type === MoleculeType.DEFENDER;
  
  const getIcon = () => {
    if (molecule.specialEffect === 'STUN') return <Zap size={16} />;
    if (molecule.specialEffect === 'POISON') return <Skull size={16} />;
    if (isDefense) return <Shield size={16} />;
    return <Sword size={16} />;
  };

  return (
    <div className={`
      relative flex flex-col items-center justify-center w-20 h-24 rounded-md border 
      ${owner === 'player' ? 'bg-cyan-900/40 border-cyan-500' : 'bg-red-900/40 border-red-500'}
      backdrop-blur-sm animate-pulse
    `}>
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-slate-900 px-2 rounded-full border border-slate-600">
         <span className={`text-xs font-bold ${isAttack ? 'text-red-400' : 'text-blue-400'}`}>
            {molecule.power > 0 ? molecule.power : 'Effect'}
         </span>
      </div>

      <div className={`text-2xl font-display font-bold mb-1 ${owner === 'player' ? 'text-cyan-300' : 'text-red-300'}`}>
        {molecule.formula}
      </div>
      
      <div className="text-[9px] text-center px-1 leading-tight text-slate-300">
        {molecule.name}
      </div>

      <div className="absolute bottom-1 right-1 opacity-70">
        {getIcon()}
      </div>
    </div>
  );
};
