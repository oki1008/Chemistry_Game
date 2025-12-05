import React, { useState, useEffect, useRef } from 'react';
import { Beaker, FlaskConical, Flame, Zap, ShieldAlert, ArrowRight, RotateCcw } from 'lucide-react';
import { CardComponent } from './components/Card';
import { MoleculeDisplay } from './components/MoleculeDisplay';
import { 
  PlayerState, Card, GamePhase, LogEntry, CardCategory, ConditionType, Molecule, MoleculeType, ElementType 
} from './types';
import { ELEMENT_DECK, CONDITION_DECK, STARTING_HAND_SIZE, MAX_MANA, generateId, RECIPES } from './constants';
import { checkSynthesis } from './services/gameLogic';
import { getChemistryCommentary, getAIActionComment } from './services/geminiService';

// --- INITIAL STATE ---
const createInitialDeck = () => {
  const elements = [...ELEMENT_DECK, ...ELEMENT_DECK, ...ELEMENT_DECK]; // Triplicate elements
  const conditions = [...CONDITION_DECK, ...CONDITION_DECK];
  // Shuffle
  return [...elements, ...conditions]
    .map(c => ({ ...c, id: generateId() }))
    .sort(() => Math.random() - 0.5);
};

const initialPlayerState: PlayerState = {
  hp: 1000,
  maxHp: 1000,
  mana: 2,
  maxMana: MAX_MANA,
  hand: [],
  fieldElements: [],
  molecules: [],
  poisonCounters: 0,
  isStunned: false,
  shield: 0
};

export default function App() {
  // --- STATE ---
  const [deck, setDeck] = useState<Card[]>(createInitialDeck());
  const [player, setPlayer] = useState<PlayerState>(initialPlayerState);
  const [cpu, setCpu] = useState<PlayerState>(initialPlayerState);
  const [phase, setPhase] = useState<GamePhase>('DRAW');
  const [turnCount, setTurnCount] = useState(1);
  const [gameLog, setGameLog] = useState<LogEntry[]>([]);
  
  // Selection State
  const [selectedHandCardId, setSelectedHandCardId] = useState<string | null>(null);
  const [selectedFieldCardIds, setSelectedFieldCardIds] = useState<string[]>([]);
  
  const logContainerRef = useRef<HTMLDivElement>(null);

  // --- HELPERS ---
  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setGameLog(prev => [...prev, { turn: turnCount, message, type }]);
  };

  const drawCards = (count: number, target: 'player' | 'cpu') => {
    const currentState = target === 'player' ? player : cpu;
    const setState = target === 'player' ? setPlayer : setCpu;
    
    // Simple infinite deck simulation if empty
    let currentDeck = [...deck];
    if (currentDeck.length < count) {
       currentDeck = createInitialDeck();
    }

    const drawn = currentDeck.slice(0, count);
    const remainingDeck = currentDeck.slice(count);
    
    setDeck(remainingDeck);
    setState(prev => ({ ...prev, hand: [...prev.hand, ...drawn] }));
    return drawn;
  };

  // Scroll log to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [gameLog]);

  // --- GAME LOOPS ---

  // Phase Management
  useEffect(() => {
    if (phase === 'DRAW') {
      // Start of Turn
      if (player.isStunned) {
        addLog("Player is Stunned and skips turn!", 'combat');
        setPlayer(p => ({ ...p, isStunned: false }));
        setPhase('END');
        return;
      }

      setPlayer(prev => ({
        ...prev,
        mana: Math.min(prev.mana + 2, MAX_MANA),
        shield: 0 // Shield usually resets unless permanent (game choice: reset for dynamic flow)
      }));
      drawCards(1, 'player');
      setPhase('MAIN');
    }
  }, [phase, turnCount, player.isStunned]);

  // --- ACTIONS ---

  const handlePlayCard = (card: Card) => {
    if (phase !== 'MAIN') return;
    
    if (card.category === CardCategory.ELEMENT) {
      if (player.mana < card.cost) {
        addLog("Not enough Energy (Mana)!", 'info');
        return;
      }
      // Move from hand to field
      setPlayer(prev => ({
        ...prev,
        hand: prev.hand.filter(c => c.id !== card.id),
        fieldElements: [...prev.fieldElements, card],
        mana: prev.mana - card.cost
      }));
      setSelectedHandCardId(null);
    } else if (card.category === CardCategory.CONDITION) {
       // Conditions are played directly during Synthesis, not placed on field usually
       // But if it's "Water" (Support/Condition), maybe. 
       // For this game: Select Condition in Hand to Synthesize.
       setSelectedHandCardId(card.id === selectedHandCardId ? null : card.id);
    }
  };

  const toggleFieldSelection = (cardId: string) => {
    if (phase !== 'MAIN') return;
    setSelectedFieldCardIds(prev => 
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const attemptSynthesis = async () => {
    const elements = player.fieldElements.filter(c => selectedFieldCardIds.includes(c.id));
    const conditionCard = player.hand.find(c => c.id === selectedHandCardId && c.category === CardCategory.CONDITION);
    
    // Check Recipe
    const match = checkSynthesis(elements, conditionCard || null);

    if (match) {
      // Consume resources
      setPlayer(prev => ({
        ...prev,
        fieldElements: prev.fieldElements.filter(c => !selectedFieldCardIds.includes(c.id)),
        hand: conditionCard ? prev.hand.filter(c => c.id !== conditionCard.id) : prev.hand,
        molecules: [...prev.molecules, { ...match.result, id: generateId() }]
      }));
      
      // Clear selection
      setSelectedFieldCardIds([]);
      setSelectedHandCardId(null);

      // Log & AI Commentary
      addLog(`Synthesized ${match.result.name}!`, 'synthesis');
      
      const commentary = await getChemistryCommentary(match, turnCount);
      addLog(`Prof: "${commentary}"`, 'ai');

      // Apply Immediate Effects (Wall)
      if (match.result.specialEffect === 'WALL') {
        setPlayer(prev => ({ ...prev, shield: prev.shield + match.result.power }));
      }

    } else {
      addLog("Reaction failed! Invalid combination.", 'info');
    }
  };

  const endTurn = () => {
    setPhase('BATTLE');
    setTimeout(resolveBattlePhase, 1000);
  };

  const resolveBattlePhase = () => {
    // 1. Player Attacks
    let totalDmg = 0;
    const activeAttackers = player.molecules.filter(m => m.type === MoleculeType.ATTACKER);
    
    activeAttackers.forEach(mol => {
      // Check CPU Defense
      const dmg = Math.max(0, mol.power - cpu.shield);
      totalDmg += dmg;
    });

    if (totalDmg > 0) {
      setCpu(prev => ({ ...prev, hp: Math.max(0, prev.hp - totalDmg), shield: Math.max(0, prev.shield - totalDmg) })); // Shield breaks
      addLog(`Player dealt ${totalDmg} damage!`, 'combat');
    }

    // Effect molecules (Stun)
    const stunner = player.molecules.find(m => m.specialEffect === 'STUN');
    if (stunner) {
      setCpu(prev => ({ ...prev, isStunned: true }));
      addLog("CPU is Stunned by Ammonia!", 'combat');
    }

    // Clear temporary molecules (Acids decompose/wash away after attack for balance, Walls stay? 
    // Let's say Attackers are one-time use to encourage constant synthesis)
    setPlayer(prev => ({ ...prev, molecules: prev.molecules.filter(m => m.type !== MoleculeType.ATTACKER && m.type !== MoleculeType.EFFECT) }));

    // Check Win
    if (cpu.hp <= 0) {
      alert("You Win! Science prevails!");
      window.location.reload();
      return;
    }

    setPhase('END');
    setTimeout(cpuTurn, 1500);
  };

  // --- CPU LOGIC ---
  const cpuTurn = async () => {
    addLog("CPU Turn...", 'info');
    
    // 1. Draw
    drawCards(1, 'cpu');
    setCpu(prev => ({ ...prev, mana: Math.min(prev.mana + 2, MAX_MANA), shield: 0 }));

    if (cpu.isStunned) {
      addLog("CPU is stunned and cannot act!", 'info');
      setCpu(prev => ({ ...prev, isStunned: false }));
      startNewTurn();
      return;
    }

    // 2. AI Logic (Simplified)
    // Try to play random elements if mana allows
    const playableElements = cpu.hand.filter(c => c.category === CardCategory.ELEMENT && c.cost <= cpu.mana);
    
    if (playableElements.length > 0) {
      // Play up to 2 cards
      const toPlay = playableElements.slice(0, 2);
      setCpu(prev => ({
        ...prev,
        hand: prev.hand.filter(h => !toPlay.find(p => p.id === h.id)),
        fieldElements: [...prev.fieldElements, ...toPlay],
        mana: prev.mana - toPlay.reduce((sum, c) => sum + c.cost, 0)
      }));
      addLog(`CPU placed ${toPlay.map(c => c.name).join(', ')}`, 'info');
    }

    // 3. Try Synthesize
    // Very dumb AI: Check if any 2 elements + any condition make a recipe
    // For demo, let's cheat a bit and give CPU a random chance to make HCl if it has H and Cl
    const hasH = cpu.fieldElements.find(c => c.element === ElementType.H);
    const hasCl = cpu.fieldElements.find(c => c.element === ElementType.Cl);
    
    if (hasH && hasCl) {
      const match = RECIPES.find(r => r.result.formula === 'HCl');
      if (match) {
        setCpu(prev => ({
          ...prev,
          fieldElements: prev.fieldElements.filter(c => c.id !== hasH.id && c.id !== hasCl.id),
          molecules: [...prev.molecules, { ...match.result, id: generateId() }]
        }));
        addLog("CPU synthesized Hydrochloric Acid!", 'synthesis');
        const taunt = await getAIActionComment("synthesized HCl acid attack");
        if(taunt) addLog(`CPU: "${taunt}"`, 'ai');
      }
    }

    // 4. CPU Battle
    let cpuDmg = 0;
    const cpuAttackers = cpu.molecules.filter(m => m.type === MoleculeType.ATTACKER);
    cpuAttackers.forEach(mol => {
      const dmg = Math.max(0, mol.power - player.shield);
      cpuDmg += dmg;
    });

    if (cpuDmg > 0) {
      setPlayer(prev => ({ ...prev, hp: Math.max(0, prev.hp - cpuDmg), shield: Math.max(0, prev.shield - cpuDmg) }));
      addLog(`CPU dealt ${cpuDmg} damage!`, 'combat');
    }

    // Clear CPU Attackers
    setCpu(prev => ({ ...prev, molecules: prev.molecules.filter(m => m.type !== MoleculeType.ATTACKER) }));

    if (player.hp <= 0) {
      alert("Game Over.");
      window.location.reload();
      return;
    }

    startNewTurn();
  };

  const startNewTurn = () => {
    setTurnCount(prev => prev + 1);
    setPhase('DRAW');
  };

  // --- INITIAL SETUP ---
  useEffect(() => {
    drawCards(STARTING_HAND_SIZE, 'player');
    drawCards(STARTING_HAND_SIZE, 'cpu');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col overflow-hidden">
      
      {/* HEADER */}
      <header className="h-14 border-b border-slate-700 flex items-center justify-between px-6 bg-slate-800/50 backdrop-blur">
        <div className="flex items-center gap-2">
          <FlaskConical className="text-cyan-400" />
          <h1 className="font-display font-bold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            ELEMENTAL SYNTH
          </h1>
        </div>
        <div className="flex gap-6 text-sm font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">TURN</span>
            <span className="text-white font-bold text-lg">{turnCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">PHASE</span>
            <span className="text-yellow-400 font-bold">{phase}</span>
          </div>
        </div>
      </header>

      {/* MAIN GAME AREA */}
      <main className="flex-grow flex relative">
        
        {/* LEFT: LOG */}
        <div className="w-64 border-r border-slate-700 bg-slate-900/80 flex flex-col">
          <div className="p-3 border-b border-slate-700 font-bold text-slate-400 text-xs uppercase">Battle Log</div>
          <div ref={logContainerRef} className="flex-grow overflow-y-auto p-3 space-y-2 text-xs font-mono">
            {gameLog.map((log, i) => (
              <div key={i} className={`
                p-2 rounded border-l-2 
                ${log.type === 'combat' ? 'border-red-500 bg-red-900/10' : ''}
                ${log.type === 'synthesis' ? 'border-cyan-500 bg-cyan-900/10' : ''}
                ${log.type === 'ai' ? 'border-purple-500 bg-purple-900/10 italic text-purple-200' : ''}
                ${log.type === 'info' ? 'border-slate-500' : ''}
              `}>
                <span className="opacity-50 mr-2">[{log.turn}]</span>
                {log.message}
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: FIELD */}
        <div className="flex-grow flex flex-col relative">
          
          {/* CPU ZONE */}
          <div className="flex-1 bg-gradient-to-b from-red-900/20 to-slate-900 p-4 relative border-b border-slate-700/50">
            <div className="absolute top-4 left-4 flex gap-4">
              <div className="bg-red-950 border border-red-700 px-4 py-2 rounded-lg min-w-[120px]">
                <div className="text-xs text-red-400 uppercase font-bold">CPU Health</div>
                <div className="text-2xl font-display text-white">{cpu.hp}</div>
              </div>
              <div className="bg-slate-800 border border-slate-600 px-3 py-1 rounded-lg flex flex-col items-center justify-center">
                 <ShieldAlert size={16} className="text-slate-400"/>
                 <span className="text-sm font-bold">{cpu.shield}</span>
              </div>
            </div>
            
            {/* CPU Field Elements (Hidden mostly or shown?) -> Shown for strategy */}
            <div className="flex justify-center gap-2 mt-8 opacity-80">
              {cpu.fieldElements.map((card) => (
                 <CardComponent key={card.id} card={card} size="sm" disabled />
              ))}
            </div>

             {/* CPU Molecules */}
             <div className="flex justify-center gap-4 mt-4">
               {cpu.molecules.map(m => (
                 <MoleculeDisplay key={m.id} molecule={m} owner="cpu" />
               ))}
             </div>
          </div>

          {/* PLAYER ZONE */}
          <div className="flex-1 bg-gradient-to-t from-blue-900/20 to-slate-900 p-4 relative">
             
             {/* Player Stats */}
             <div className="absolute bottom-28 left-4 flex gap-4">
               <div className="bg-cyan-950 border border-cyan-700 px-4 py-2 rounded-lg min-w-[120px]">
                <div className="text-xs text-cyan-400 uppercase font-bold">HP</div>
                <div className="text-2xl font-display text-white">{player.hp} / {player.maxHp}</div>
               </div>
               <div className="bg-blue-950 border border-blue-700 px-4 py-2 rounded-lg">
                <div className="text-xs text-blue-400 uppercase font-bold">Energy</div>
                <div className="flex gap-1 mt-1">
                  {Array.from({length: MAX_MANA}).map((_, i) => (
                    <div key={i} className={`w-3 h-4 rounded-sm ${i < player.mana ? 'bg-yellow-400 shadow-glow' : 'bg-slate-700'}`}></div>
                  ))}
                </div>
               </div>
               <div className="bg-slate-800 border border-slate-600 px-3 py-1 rounded-lg flex flex-col items-center justify-center">
                 <ShieldAlert size={16} className="text-blue-400"/>
                 <span className="text-sm font-bold">{player.shield}</span>
              </div>
             </div>

             {/* Player Molecules */}
             <div className="flex justify-center gap-4 mb-4">
               {player.molecules.map(m => (
                 <MoleculeDisplay key={m.id} molecule={m} owner="player" />
               ))}
             </div>

             {/* Player Field (Beaker) */}
             <div className="flex justify-center items-center gap-2 min-h-[120px] border-2 border-dashed border-slate-600 rounded-xl mx-20 bg-slate-800/30 p-4 transition-colors hover:bg-slate-800/50">
                {player.fieldElements.length === 0 && (
                  <div className="text-slate-500 flex items-center gap-2">
                    <Beaker size={20} />
                    <span>Reaction Chamber (Place Elements Here)</span>
                  </div>
                )}
                {player.fieldElements.map((card) => (
                  <CardComponent 
                    key={card.id} 
                    card={card} 
                    size="sm" 
                    selected={selectedFieldCardIds.includes(card.id)}
                    onClick={() => toggleFieldSelection(card.id)}
                  />
                ))}
             </div>

             {/* Actions */}
             <div className="absolute top-4 right-4 flex flex-col gap-2">
               <button 
                onClick={attemptSynthesis}
                disabled={selectedFieldCardIds.length < 2 && !selectedHandCardId} // Basic check
                className="bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-transform active:scale-95"
               >
                 <Flame size={18} /> SYNTHESIZE
               </button>
               
               <button 
                onClick={endTurn}
                disabled={phase !== 'MAIN'}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-transform active:scale-95"
               >
                 <ArrowRight size={18} /> END TURN
               </button>
             </div>
          </div>

          {/* HAND */}
          <div className="h-48 bg-slate-950 border-t border-slate-700 p-4 flex items-center justify-center gap-4 overflow-x-auto z-10">
            {player.hand.map((card) => (
              <CardComponent 
                key={card.id} 
                card={card} 
                onClick={() => handlePlayCard(card)}
                selected={card.id === selectedHandCardId}
                disabled={phase !== 'MAIN'}
              />
            ))}
          </div>

        </div>
      </main>
    </div>
  );
}