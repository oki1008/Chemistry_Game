
import React, { useState, useEffect, useRef } from 'react';
import { Beaker, FlaskConical, BookOpen, Atom, X, TestTube2, ArrowRight, Sword, Shield, CheckCircle2, Lightbulb, Zap, HelpCircle, Skull } from 'lucide-react';
import { CardComponent } from './components/Card';
import { MoleculeDisplay } from './components/MoleculeDisplay';
import { 
  PlayerState, Card, GamePhase, LogEntry, ConditionType, MoleculeType, ElementType, CardCategory 
} from './types';
import { ELEMENT_DECK, CONDITION_DECK, STARTING_HAND_SIZE, generateId, RECIPES } from './constants';
import { checkSynthesis, findPossibleRecipeInHand, getMissingIngredientsMessage } from './services/gameLogic';
import { getChemistryCommentary } from './services/geminiService';

// --- VISUAL EFFECT TYPES ---
type EffectType = 'CUT_IN' | 'DAMAGE' | 'TURN_START' | 'HEAL' | 'WIN' | 'LOSE';

interface VisualEffect {
  id: string;
  type: EffectType;
  text?: string;
  subtext?: string;
  value?: number;
  target?: 'player' | 'cpu';
  x?: number; // percentage
  y?: number; // percentage
}

// --- INITIAL STATE ---
const createInitialDeck = () => {
  const elements = [...ELEMENT_DECK, ...ELEMENT_DECK, ...ELEMENT_DECK, ...ELEMENT_DECK, ...ELEMENT_DECK]; 
  const conditions = [...CONDITION_DECK, ...CONDITION_DECK, ...CONDITION_DECK, ...CONDITION_DECK];
  return [...elements, ...conditions]
    .map(c => ({ ...c, id: generateId() }))
    .sort(() => Math.random() - 0.5);
};

// Guaranteed hand for instant gratification turn 1
const getGuaranteedHand = (deck: Card[]): { hand: Card[], remainingDeck: Card[] } => {
  const neededTypes = [
    { type: 'element', val: ElementType.H },
    { type: 'element', val: ElementType.H },
    { type: 'element', val: ElementType.O },
    { type: 'condition', val: ConditionType.SPARK }
  ];

  let hand: Card[] = [];
  let remaining = [...deck];

  for (const need of neededTypes) {
    const idx = remaining.findIndex(c => 
      (need.type === 'element' && c.element === need.val) ||
      (need.type === 'condition' && c.condition === need.val)
    );
    if (idx !== -1) {
      hand.push(remaining[idx]);
      remaining.splice(idx, 1);
    }
  }

  while (hand.length < STARTING_HAND_SIZE) {
    const fallback = remaining.shift();
    if (fallback) hand.push(fallback);
  }

  return { hand, remainingDeck: remaining };
};

const initialPlayerState: PlayerState = {
  hp: 200,
  maxHp: 200,
  hand: [],
  molecules: [],
  poisonCounters: 0,
  isStunned: false,
  shield: 0
};

export default function App() {
  // --- STATE ---
  const [deck, setDeck] = useState<Card[]>([]);
  const [player, setPlayer] = useState<PlayerState>(initialPlayerState);
  const [cpu, setCpu] = useState<PlayerState>({ ...initialPlayerState, hp: 200, maxHp: 200 });
  const [phase, setPhase] = useState<GamePhase>('DRAW');
  const [turnCount, setTurnCount] = useState(1);
  const [gameLog, setGameLog] = useState<LogEntry[]>([]);
  const [showRecipes, setShowRecipes] = useState(false);
  
  // Selection State
  const [selectedHandCardIds, setSelectedHandCardIds] = useState<string[]>([]);
  
  // Visual Effects State
  const [shake, setShake] = useState(false);
  const [activeEffects, setActiveEffects] = useState<VisualEffect[]>([]);
  const [turnBanner, setTurnBanner] = useState<{show: boolean, text: string}>({ show: false, text: '' });

  const logContainerRef = useRef<HTMLDivElement>(null);

  // --- HELPERS ---
  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setGameLog(prev => [...prev, { turn: turnCount, message, type }]);
  };

  const triggerEffect = (effect: Omit<VisualEffect, 'id'>) => {
    const id = generateId();
    setActiveEffects(prev => [...prev, { ...effect, id }]);
    
    // Auto cleanup based on effect type duration
    const duration = effect.type === 'WIN' || effect.type === 'LOSE' ? 6000 : (effect.type === 'CUT_IN' ? 2000 : 1500);
    setTimeout(() => {
      setActiveEffects(prev => prev.filter(e => e.id !== id));
    }, duration);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const showTurnBanner = (text: string) => {
    setTurnBanner({ show: true, text });
    setTimeout(() => setTurnBanner({ show: false, text: '' }), 2000);
  };

  // SMART DRAW SYSTEM
  const smartDraw = (currentDeck: Card[], currentHand: Card[], count: number): { drawn: Card[], remaining: Card[] } => {
    let deckCopy = [...currentDeck];
    const drawn: Card[] = [];

    for (let i = 0; i < count; i++) {
      if (deckCopy.length === 0) break;

      const testHand = [...currentHand, ...drawn];
      const hasRecipe = findPossibleRecipeInHand(testHand);

      if (hasRecipe) {
        drawn.push(deckCopy.shift()!);
      } else {
        let helpfulCardIndex = -1;
        const searchLimit = Math.min(deckCopy.length, 20);
        
        for (let j = 0; j < searchLimit; j++) {
           const potentialHand = [...testHand, deckCopy[j]];
           if (findPossibleRecipeInHand(potentialHand)) {
             helpfulCardIndex = j;
             break;
           }
        }

        if (helpfulCardIndex !== -1) {
          drawn.push(deckCopy.splice(helpfulCardIndex, 1)[0]);
        } else {
          drawn.push(deckCopy.shift()!);
        }
      }
    }
    return { drawn, remaining: deckCopy };
  };

  const drawCards = (count: number, target: 'player' | 'cpu') => {
    if (target === 'player') {
       setPlayer(prev => {
          let currentDeck = [...deck];
          if (currentDeck.length < count) currentDeck = createInitialDeck(); 
          const { drawn, remaining } = smartDraw(currentDeck, prev.hand, count);
          setDeck(remaining);
          return { ...prev, hand: [...prev.hand, ...drawn] };
       });
    } else {
       // CPU also uses smart draw now (simulated by just taking from deck but usually deck is random)
       // For better CPU, we might cheat, but let's trust randomness + initial guaranteed hand for now
       setCpu(prev => {
          let currentDeck = [...deck];
          // Simple draw for CPU, but since we gave it a guaranteed hand initially, it should be fine.
          // Fallback: if deck runs out create new
          if (currentDeck.length < count) currentDeck = createInitialDeck();
          
          const newCards = currentDeck.splice(0, count);
          setDeck(currentDeck);
          return { ...prev, hand: [...prev.hand, ...newCards] };
       });
    }
  };

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [gameLog]);

  // --- GAME LOOPS ---
  useEffect(() => {
    if (phase === 'DRAW') {
      showTurnBanner("あなたのターン！");
      
      setTimeout(() => {
        if (player.isStunned) {
            addLog("気絶していて動けない！", 'combat');
            setPlayer(p => ({ ...p, isStunned: false }));
            setPhase('END');
            return;
        }

        setPlayer(prev => ({ ...prev, shield: 0 }));
        if (turnCount > 1) drawCards(2, 'player'); 
        setPhase('MAIN');
        addLog("あなたのターン。カードを引きました。", 'info');
      }, 1500); // Wait for turn banner
    }
  }, [phase, turnCount]);

  // --- ACTIONS ---

  const toggleCardSelection = (cardId: string) => {
    if (phase !== 'MAIN') return;
    setSelectedHandCardIds(prev => 
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const attemptSynthesis = async () => {
    const selectedCards = player.hand.filter(c => selectedHandCardIds.includes(c.id));
    const match = checkSynthesis(selectedCards);

    if (match) {
      // Trigger Cut-in
      triggerEffect({ 
        type: 'CUT_IN', 
        text: match.result.name, 
        subtext: `合成成功！ Power: ${match.result.power}` 
      });

      // Wait a bit for the effect to land before updating state fully
      setTimeout(async () => {
          setPlayer(prev => ({
            ...prev,
            hand: prev.hand.filter(c => !selectedHandCardIds.includes(c.id)),
            molecules: [...prev.molecules, { ...match.result, id: generateId() }]
          }));
          
          setSelectedHandCardIds([]);
          addLog(`合成成功！ ${match.result.name} が完成！`, 'synthesis');
          
          const commentary = await getChemistryCommentary(match, turnCount);
          addLog(`先生: 「${commentary}」`, 'ai');

          if (match.result.specialEffect === 'WALL') {
            setPlayer(prev => ({ ...prev, shield: prev.shield + match.result.power }));
          }
      }, 800);

    } else {
      addLog("失敗... 組み合わせが間違っています。", 'info');
    }
  };

  const applyHint = () => {
    const hint = findPossibleRecipeInHand(player.hand);
    if (hint) {
      setSelectedHandCardIds(hint.cardIds);
      addLog(`ヒント: ${hint.recipe.result.name} が作れます！`, 'info');
    } else {
      addLog("現在の手札で作れるものはありません... 次のターンを待ちましょう。", 'info');
    }
  };

  const endTurn = () => {
    setSelectedHandCardIds([]);
    setPhase('BATTLE');
    setTimeout(resolveBattlePhase, 1000);
  };

  const resolveBattlePhase = () => {
    // Player Attacks
    let totalDmg = 0;
    const activeAttackers = player.molecules.filter(m => m.type === MoleculeType.ATTACKER);
    
    activeAttackers.forEach(mol => {
      const dmg = Math.max(0, mol.power - cpu.shield);
      totalDmg += dmg;
    });

    if (totalDmg > 0) {
      const newHp = Math.max(0, cpu.hp - totalDmg);
      setCpu(prev => ({ ...prev, hp: newHp, shield: Math.max(0, prev.shield - totalDmg) }));
      triggerEffect({ type: 'DAMAGE', value: totalDmg, target: 'cpu' });
      triggerShake();
      addLog(`攻撃！ 相手に ${totalDmg} のダメージ！`, 'combat');

      // Check Win immediately
      if (newHp <= 0) {
        setTimeout(() => {
          triggerEffect({ type: 'WIN', text: '大勝利！' });
          addLog("勝利！おめでとうございます！", 'info');
          // Reload after effect
          setTimeout(() => {
              window.location.reload();
          }, 4000);
        }, 1000);
        return; // Stop further processing
      }
    }

    const stunner = player.molecules.find(m => m.specialEffect === 'STUN');
    if (stunner) {
      setCpu(prev => ({ ...prev, isStunned: true }));
      addLog("相手は怯んでいる！", 'combat');
    }

    setPhase('END');
    setTimeout(cpuTurn, 2000); // Longer delay to absorb impact
  };

  const cpuTurn = async () => {
    showTurnBanner("相手のターン！");
    
    setTimeout(async () => {
        addLog("相手のターン...", 'info');
        drawCards(2, 'cpu');
        setCpu(prev => ({ ...prev, shield: 0 }));

        if (cpu.isStunned) {
            addLog("相手は動けない！", 'info');
            setCpu(prev => ({ ...prev, isStunned: false }));
            startNewTurn();
            return;
        }

        // AI Logic
        const aiHand = cpu.hand;
        let synthHappened = false;
        
        for (const recipe of RECIPES) {
            const needed = [...recipe.inputs];
            const neededCond = recipe.condition;
            const usedIds: string[] = [];
            let possible = true;
            
            for (const el of needed) {
                const idx = aiHand.findIndex(c => c.element === el && !usedIds.includes(c.id));
                if (idx !== -1) usedIds.push(aiHand[idx].id);
                else possible = false;
            }
            if (possible && neededCond) {
                const idx = aiHand.findIndex(c => c.condition === neededCond && !usedIds.includes(c.id));
                if (idx !== -1) usedIds.push(aiHand[idx].id);
                else possible = false;
            }
            if (possible) {
                // Enemy Synthesis visual?
                triggerEffect({ type: 'CUT_IN', text: `RIVAL: ${recipe.result.name}`, subtext: "敵の合成！" });
                
                await new Promise(r => setTimeout(r, 1000));

                setCpu(prev => ({
                    ...prev,
                    hand: prev.hand.filter(c => !usedIds.includes(c.id)),
                    molecules: [...prev.molecules, { ...recipe.result, id: generateId() }]
                }));
                addLog(`相手が「${recipe.result.name}」を合成！`, 'synthesis');
                
                if (recipe.result.specialEffect === 'WALL') {
                    setCpu(prev => ({ ...prev, shield: prev.shield + recipe.result.power }));
                }
                synthHappened = true;
                break; 
            }
        }

        if (!synthHappened) {
            addLog("相手は何もできなかったようだ。", 'info');
        }

        // Delay before attack
        setTimeout(() => {
            let cpuDmg = 0;
            const cpuAttackers = cpu.molecules.filter(m => m.type === MoleculeType.ATTACKER);
            cpuAttackers.forEach(mol => {
                const dmg = Math.max(0, mol.power - player.shield);
                cpuDmg += dmg;
            });

            const finalPlayerHp = Math.max(0, player.hp - cpuDmg);

            if (cpuDmg > 0) {
                setPlayer(prev => ({ ...prev, hp: finalPlayerHp, shield: Math.max(0, prev.shield - cpuDmg) }));
                triggerEffect({ type: 'DAMAGE', value: cpuDmg, target: 'player' });
                triggerShake();
                addLog(`相手の攻撃！ ${cpuDmg} のダメージ！`, 'combat');
            }

            // Check Defeat logic using calculated HP
            if (finalPlayerHp <= 0) {
                 setTimeout(() => {
                    triggerEffect({ type: 'LOSE', text: '敗北...' });
                    addLog("敗北... 次回こそ頑張ろう！", 'info');
                    setTimeout(() => {
                       window.location.reload();
                    }, 4500);
                 }, 1000);
                return;
            }

            setTimeout(startNewTurn, 1500);
        }, 1500);

    }, 2000);
  };

  const startNewTurn = () => {
    setTurnCount(prev => prev + 1);
    setPhase('DRAW');
  };

  // --- INITIAL SETUP ---
  useEffect(() => {
    const fullDeck = createInitialDeck();
    
    // Player gets guaranteed hand for instant fun
    const { hand: pHand, remainingDeck: deckAfterPlayer } = getGuaranteedHand(fullDeck);
    
    // CPU ALSO gets guaranteed hand so they actually fight back
    const { hand: cpuHand, remainingDeck: deckAfterCpu } = getGuaranteedHand(deckAfterPlayer);
    
    setDeck(deckAfterCpu);
    setPlayer(prev => ({ ...prev, hp: 200, maxHp: 200, hand: pHand }));
    setCpu(prev => ({ ...prev, hp: 200, maxHp: 200, hand: cpuHand }));
  }, []);

  // --- DERIVED STATE ---
  const selectedCards = player.hand.filter(c => selectedHandCardIds.includes(c.id));
  const unselectedCards = player.hand.filter(c => !selectedHandCardIds.includes(c.id));
  const canSynthesize = !!checkSynthesis(selectedCards);
  const possibleRecipe = findPossibleRecipeInHand(player.hand);
  
  // Dynamic Instruction Logic
  const getInstruction = () => {
    if (phase === 'BATTLE') return "バトル中！結果を見守れ！";
    if (phase === 'END') return "相手のターンです。";
    if (canSynthesize) return "合成成功！真ん中のボタンを押して！";
    
    // Check for partial matches to give subtle hints
    const partialHint = getMissingIngredientsMessage(selectedCards);
    if (partialHint) {
        return partialHint;
    }

    if (selectedHandCardIds.length === 0) {
        if (possibleRecipe) return "作れるレシピがあります！まずは「レシピ」を見てみよう。分からなかったら「ヒント」を押してね！";
        return "今は作れるものがなさそう... 「攻撃開始」でターンを終わろう。";
    }
    return "あと少し...！他のカードも選んでみよう。";
  };

  return (
    <div className={`
        h-screen w-full flex flex-col font-sans text-slate-800 bg-transparent overflow-hidden select-none transition-transform
        ${shake ? 'animate-shake' : ''}
    `}>
      
      {/* BACKGROUND - Dynamic */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
         <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-rose-200 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-float"></div>
         <div className="absolute bottom-[-100px] right-[-100px] w-[600px] h-[600px] bg-cyan-200 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-float" style={{ animationDelay: '1.5s' }}></div>
      </div>

      {/* --- OVERLAYS LAYER --- */}
      
      {/* TURN BANNER */}
      {turnBanner.show && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
              <div className="w-full bg-slate-900/90 py-12 flex justify-center overflow-hidden relative shadow-2xl">
                  <h1 className="text-6xl md:text-8xl font-black text-white italic tracking-tighter animate-slide-text drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)]">
                      {turnBanner.text}
                  </h1>
                  <div className="absolute inset-0 bg-white/10 skew-x-12 animate-slide-text" style={{ animationDelay: '0.1s' }}></div>
              </div>
          </div>
      )}

      {/* WIN EFFECT */}
      {activeEffects.filter(e => e.type === 'WIN').map(effect => (
        <div key={effect.id} className="fixed inset-0 z-[90] flex flex-col items-center justify-center pointer-events-none">
           {/* Burst Background */}
           <div className="absolute inset-0 bg-yellow-400/30 animate-victory-burst mix-blend-overlay"></div>
           <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/50 to-orange-500/50 animate-victory-burst"></div>
           
           {/* Text */}
           <div className="relative text-8xl md:text-9xl font-black text-yellow-500 animate-victory-text drop-shadow-[0_4px_0_#fff] stroke-white" style={{WebkitTextStroke: '4px white'}}>
              大勝利！
           </div>
           <div className="mt-8 text-4xl font-bold text-white animate-bounce drop-shadow-lg">
              あなたの勝ち！
           </div>
        </div>
      ))}

      {/* LOSE EFFECT */}
      {activeEffects.filter(e => e.type === 'LOSE').map(effect => (
        <div key={effect.id} className="fixed inset-0 z-[90] flex flex-col items-center justify-center pointer-events-auto animate-defeat-bg">
           <div className="text-9xl mb-4 text-purple-200 animate-pulse"><Skull size={100} /></div>
           <div className="relative text-8xl font-black text-purple-300 animate-defeat-text drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] tracking-widest">
              敗北...
           </div>
           <div className="mt-8 text-2xl font-bold text-slate-300 animate-pulse">
              目の前が真っ暗になった...
           </div>
        </div>
      ))}

      {/* CUT IN EFFECT (Synthesis) */}
      {activeEffects.filter(e => e.type === 'CUT_IN').map(effect => (
        <div key={effect.id} className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/70 bg-speed-lines backdrop-blur-sm pointer-events-none animate-in zoom-in duration-300">
           <div className="text-yellow-400 font-black text-2xl mb-2 animate-bounce">{effect.subtext}</div>
           <div className="text-white font-black text-6xl md:text-8xl uppercase tracking-wider drop-shadow-[0_0_15px_rgba(255,255,0,0.8)] border-y-4 border-yellow-400 py-4 w-full text-center bg-black/50">
               {effect.text}
           </div>
           <div className="absolute inset-0 border-[20px] border-yellow-400/30 animate-pulse"></div>
        </div>
      ))}

      {/* DAMAGE NUMBERS */}
      {activeEffects.filter(e => e.type === 'DAMAGE').map(effect => (
         <div 
           key={effect.id}
           className="fixed z-[80] font-black text-6xl md:text-8xl text-red-500 animate-damage drop-shadow-lg pointer-events-none"
           style={{ 
               left: effect.target === 'cpu' ? '50%' : '50%', 
               top: effect.target === 'cpu' ? '30%' : '70%',
               textShadow: '2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff' 
           }}
         >
           {effect.value}
         </div>
      ))}

      {/* HEADER */}
      <header className="h-16 px-4 flex items-center justify-between z-50 bg-white/60 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-yellow-400 p-2 rounded-full text-white shadow-md">
             <Atom size={20} className="animate-spin-slow" />
          </div>
          <h1 className="font-extrabold text-xl text-slate-800 tracking-wider font-display">Elemental Synth</h1>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setShowRecipes(true)} className="bg-white text-indigo-600 px-4 py-2 rounded-full font-bold shadow-sm border border-indigo-100 hover:bg-indigo-50 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95">
             <BookOpen size={18} /> レシピ
           </button>
           <div className="bg-slate-800 text-white px-4 py-2 rounded-full font-mono font-bold">{turnCount} ターン目</div>
        </div>
      </header>

      {/* RECIPES MODAL */}
      {showRecipes && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-3xl overflow-hidden flex flex-col animate-pop">
            <div className="p-4 bg-indigo-50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-indigo-800">合成レシピ</h2>
              <button onClick={() => setShowRecipes(false)}><X /></button>
            </div>
            <div className="p-4 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50">
              {RECIPES.map((r, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                   <div className="font-bold text-indigo-600 mb-2 flex justify-between">
                     {r.result.name}
                     <span className="bg-indigo-100 text-indigo-500 px-2 rounded text-xs flex items-center">{r.result.formula}</span>
                   </div>
                   <div className="flex flex-wrap gap-1 text-xs items-center">
                      {r.inputs.map((el, j) => <span key={j} className="bg-gray-100 px-2 py-1 rounded border">{el}</span>)}
                      {r.condition && <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded border border-yellow-200">+ {r.condition}</span>}
                      <ArrowRight size={14} className="text-gray-400 mx-1"/>
                      <span className="font-bold">{r.result.type === 'ATTACKER' ? '攻撃' : '防御'} {r.result.power}</span>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MAIN GAME AREA */}
      <main className="flex-grow flex flex-col relative max-w-5xl mx-auto w-full">
          
          {/* OPPONENT */}
          <div className="flex-1 flex flex-col items-center justify-start pt-4 relative">
             <div className="bg-white/80 p-3 rounded-2xl shadow-lg border-2 border-white flex items-center gap-4 w-11/12 max-w-lg z-10 transition-transform hover:scale-105">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-2xl border-2 border-red-200">😈</div>
                <div className="flex-1">
                   <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                      <span>RIVAL HP</span>
                      <span>{cpu.hp}</span>
                   </div>
                   <div className="h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                      <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${(cpu.hp / cpu.maxHp) * 100}%` }}></div>
                   </div>
                </div>
                <div className="flex -space-x-3">
                   {cpu.hand.map((_, i) => <div key={i} className="w-6 h-8 bg-indigo-500 rounded border border-white shadow-sm"></div>)}
                </div>
             </div>
             
             {/* Opponent Molecules */}
             <div className="mt-4 flex gap-2 min-h-[100px] flex-wrap justify-center max-w-[90%] z-0">
                {cpu.molecules.map(m => (
                    <div key={m.id} className="scale-75 -mx-2">
                        <MoleculeDisplay molecule={m} owner="cpu" />
                    </div>
                ))}
             </div>
          </div>

          {/* PLAYER */}
          <div className="flex-1 flex flex-col justify-end pb-2 relative">
             
             {/* Player Molecules (Battle Line) */}
             <div className="absolute -top-[160px] left-0 right-0 flex justify-center flex-wrap gap-2 h-24 items-end z-10 pointer-events-none max-w-[90%] mx-auto">
                {player.molecules.map(m => (
                  <div key={m.id} className="pointer-events-auto hover:-translate-y-2 transition-transform -mx-2">
                     <MoleculeDisplay molecule={m} owner="player" />
                  </div>
                ))}
             </div>

             {/* STAGING / SYNTHESIS AREA (Center of actions) */}
             <div className="flex justify-center items-center gap-8 mb-4 h-32 relative z-20">
                 
                 {/* Left Staging Slots (Selected cards) */}
                 <div className="flex -space-x-6 items-center">
                    {selectedCards.length > 0 ? (
                        selectedCards.map((card, i) => (
                            <div key={card.id} className="transform hover:scale-105 hover:-translate-y-2 transition-transform duration-200 cursor-pointer" style={{ zIndex: i }}>
                                <CardComponent 
                                    card={card} 
                                    selected={true}
                                    onClick={() => toggleCardSelection(card.id)}
                                    size="sm"
                                />
                            </div>
                        ))
                    ) : (
                        <div className="text-sm text-slate-400 font-bold border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center animate-pulse">
                             <span>選択したカードは</span>
                             <span>ここに置かれます</span>
                        </div>
                    )}
                 </div>

                 {/* SYNTH BUTTON & HINT */}
                 <div className="relative group">
                    <button 
                    onClick={attemptSynthesis}
                    disabled={!canSynthesize}
                    className={`
                        w-24 h-24 rounded-full border-4 shadow-2xl flex flex-col items-center justify-center transition-all duration-300
                        ${canSynthesize 
                        ? 'bg-yellow-400 border-white scale-110 hover:scale-125 animate-bounce cursor-pointer ring-4 ring-yellow-200' 
                        : 'bg-slate-200 border-slate-300 opacity-80 cursor-default'
                        }
                    `}
                    >
                    <FlaskConical size={32} className={canSynthesize ? 'text-white' : 'text-slate-400'} />
                    <span className={`text-xs font-black mt-1 ${canSynthesize ? 'text-white' : 'text-slate-400'}`}>
                        {canSynthesize ? '合成！' : '---'}
                    </span>
                    </button>

                    {/* HINT BUTTON (Pulsing if recipe available) */}
                    {!canSynthesize && possibleRecipe && phase === 'MAIN' && (
                        <button 
                           onClick={applyHint}
                           className="absolute -top-6 -right-12 bg-blue-500 text-white pl-2 pr-4 py-1.5 rounded-full shadow-lg animate-pulse hover:scale-110 transition-transform z-40 flex items-center gap-1 border-2 border-white"
                        >
                            <Lightbulb size={20} fill="yellow" className="text-yellow-200"/>
                            <span className="font-bold text-xs whitespace-nowrap">ヒント</span>
                        </button>
                    )}
                 </div>
                 
                 <div className="w-20"></div> {/* Spacer for symmetry */}
             </div>


             {/* GUIDE BAR */}
             <div className={`
               mx-auto mb-2 px-6 py-2 rounded-full font-bold shadow-lg text-sm border-2 animate-in slide-in-from-bottom-5 z-30 transition-colors
               ${canSynthesize ? 'bg-yellow-50 border-yellow-400 text-yellow-800' : 'bg-white border-indigo-100 text-indigo-800'}
             `}>
               {canSynthesize && <CheckCircle2 className="inline mr-2 -mt-1" size={18}/>}
               {getInstruction()}
             </div>

             {/* HAND AREA (Bottom) */}
             <div className="bg-slate-900/5 rounded-t-[3rem] pt-8 pb-4 px-4 min-h-[180px] relative">
                
                {/* Player HP */}
                <div className="absolute top-[-20px] left-8 bg-white px-4 py-2 rounded-2xl shadow-md border border-slate-100 flex items-center gap-3 z-40 transition-transform hover:scale-105">
                   <div className="font-black text-cyan-600">HP {player.hp}</div>
                   <div className="h-2 w-24 bg-slate-100 rounded-full border border-slate-200">
                      <div className="h-full bg-cyan-400 rounded-full transition-all duration-500" style={{ width: `${(player.hp / player.maxHp) * 100}%` }}></div>
                   </div>
                </div>

                {/* END TURN BUTTON */}
                <button 
                  onClick={endTurn}
                  disabled={phase !== 'MAIN'}
                  className="absolute top-[-20px] right-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2 z-40 hover:ring-4 ring-indigo-200"
                >
                  攻撃開始 <ArrowRight size={16}/>
                </button>

                {/* UNSELECTED CARDS FAN */}
                <div className="flex justify-center items-end h-[140px] w-full overflow-visible perspective-1000">
                   {unselectedCards.map((card, i) => {
                     // Recalculate generic index for visual balance
                     const offset = i - (unselectedCards.length - 1) / 2;
                     const rotation = offset * 4; // Slightly more rotation to see headers
                     const xTrans = offset * 85; // Increased spacing (was 40)

                     return (
                       <div 
                         key={card.id}
                         className="absolute transition-all duration-300 origin-bottom hover:z-50 hover:scale-110 hover:-translate-y-6"
                         style={{
                           zIndex: i,
                           transform: `translateX(${xTrans}px) rotate(${rotation}deg)`,
                         }}
                       >
                         <CardComponent 
                           card={card}
                           selected={false}
                           onClick={() => toggleCardSelection(card.id)}
                           disabled={phase !== 'MAIN'}
                         />
                       </div>
                     );
                   })}
                </div>
             </div>
          </div>
      </main>
    </div>
  );
}
