
import { Card, CardCategory, ConditionType, ElementType, ReactionRecipe, MoleculeType } from './types';

// Helper to generate unique IDs
export const generateId = () => Math.random().toString(36).substr(2, 9);

// Updated colors for POP design
// Removed 'cost' property
export const ELEMENT_DECK: Omit<Card, 'id'>[] = [
  { name: '水素', category: CardCategory.ELEMENT, element: ElementType.H, description: '基本の元素。まずはこれを集めよう。', color: 'bg-cyan-300 border-cyan-500 text-cyan-900' },
  { name: '水素', category: CardCategory.ELEMENT, element: ElementType.H, description: '基本の元素。まずはこれを集めよう。', color: 'bg-cyan-300 border-cyan-500 text-cyan-900' },
  { name: '水素', category: CardCategory.ELEMENT, element: ElementType.H, description: '基本の元素。まずはこれを集めよう。', color: 'bg-cyan-300 border-cyan-500 text-cyan-900' },
  { name: '水素', category: CardCategory.ELEMENT, element: ElementType.H, description: '基本の元素。まずはこれを集めよう。', color: 'bg-cyan-300 border-cyan-500 text-cyan-900' },
  { name: '酸素', category: CardCategory.ELEMENT, element: ElementType.O, description: '燃やすのに必要。', color: 'bg-rose-300 border-rose-500 text-rose-900' },
  { name: '酸素', category: CardCategory.ELEMENT, element: ElementType.O, description: '燃やすのに必要。', color: 'bg-rose-300 border-rose-500 text-rose-900' },
  { name: '窒素', category: CardCategory.ELEMENT, element: ElementType.N, description: '空気の主成分。', color: 'bg-violet-300 border-violet-500 text-violet-900' },
  { name: '塩素', category: CardCategory.ELEMENT, element: ElementType.Cl, description: '刺激臭のある気体。', color: 'bg-lime-300 border-lime-500 text-lime-900' },
  { name: '硫黄', category: CardCategory.ELEMENT, element: ElementType.S, description: '火山の近くにある黄色い石。', color: 'bg-yellow-300 border-yellow-500 text-yellow-900' },
  { name: 'ナトリウム', category: CardCategory.ELEMENT, element: ElementType.Na, description: '水に入れると爆発する金属。', color: 'bg-orange-300 border-orange-500 text-orange-900' },
  { name: '銀', category: CardCategory.ELEMENT, element: ElementType.Ag, description: 'キラキラした貴金属。', color: 'bg-slate-300 border-slate-500 text-slate-800' },
  { name: '鉄', category: CardCategory.ELEMENT, element: ElementType.Fe, description: '頑丈な金属。', color: 'bg-stone-400 border-stone-600 text-stone-900' },
];

export const CONDITION_DECK: Omit<Card, 'id'>[] = [
  { name: '加熱', category: CardCategory.CONDITION, condition: ConditionType.HEAT, description: '温めて反応させる。', color: 'bg-red-500 border-red-700 text-white' },
  { name: '点火', category: CardCategory.CONDITION, condition: ConditionType.SPARK, description: 'バチッ！と火をつける。', color: 'bg-yellow-400 border-yellow-600 text-yellow-900' },
  { name: '水 (溶媒)', category: CardCategory.CONDITION, condition: ConditionType.WATER, description: '水に溶かす。', color: 'bg-blue-400 border-blue-600 text-white' },
];

export const STARTING_HAND_SIZE = 6; // Increased hand size for easier combos

// Recipe Database
export const RECIPES: ReactionRecipe[] = [
  // 2 H2 + O2 -> 2 H2O (Explosive synthesis if Spark used)
  {
    inputs: [ElementType.H, ElementType.H, ElementType.O],
    condition: ConditionType.SPARK,
    result: {
      name: '水蒸気爆発',
      formula: 'H₂O',
      type: MoleculeType.ATTACKER,
      power: 40,
      effectDescription: 'ドカン！と爆発攻撃',
    },
    explanation: '水素と酸素に「点火」！(2H₂ + O₂)'
  },
  // Na + H2O -> NaOH (Strong Base) + H2
  {
    inputs: [ElementType.Na],
    condition: ConditionType.WATER,
    result: {
      name: '水酸化ナトリウム',
      formula: 'NaOH',
      type: MoleculeType.ATTACKER,
      power: 50,
      effectDescription: 'ドロドロに溶かす攻撃',
    },
    explanation: 'ナトリウムを「水」に入れるだけ！(Na + H₂O)'
  },
  // H + Cl -> HCl
  {
    inputs: [ElementType.H, ElementType.Cl],
    condition: null, // Any or None
    result: {
      name: '塩化水素',
      formula: 'HCl',
      type: MoleculeType.ATTACKER,
      power: 60,
      effectDescription: '強力な酸で攻撃！',
    },
    explanation: '水素と塩素を混ぜるだけ。(H + Cl)'
  },
  // Ag + Cl -> AgCl (Precipitate)
  {
    inputs: [ElementType.Ag, ElementType.Cl],
    condition: null,
    result: {
      name: '塩化銀',
      formula: 'AgCl',
      type: MoleculeType.DEFENDER,
      power: 50, // Shield amount
      specialEffect: 'WALL',
      effectDescription: '白い壁で守る！',
    },
    explanation: '銀と塩素で白い壁ができる。(Ag + Cl)'
  },
  // Ostwald Step 3 simplified: NO2 + H2O -> HNO3
  // Simplified for game: N + O + O + H + Water -> HNO3
  {
    inputs: [ElementType.H, ElementType.N, ElementType.O, ElementType.O],
    condition: ConditionType.WATER,
    result: {
      name: '硝酸',
      formula: 'HNO₃',
      type: MoleculeType.ATTACKER,
      power: 80,
      specialEffect: 'PIERCING',
      effectDescription: '全てを溶かす最強の酸！',
    },
    explanation: 'たくさんの材料を水に溶かす難しい実験！'
  },
  // Fe + S -> FeS (Heated)
  {
    inputs: [ElementType.Fe, ElementType.S],
    condition: ConditionType.HEAT,
    result: {
      name: '硫化鉄',
      formula: 'FeS',
      type: MoleculeType.DEFENDER,
      power: 40,
      specialEffect: 'WALL',
      effectDescription: '黒い壁で防御！',
    },
    explanation: '鉄と硫黄を「加熱」して合体！(Fe + S)'
  }
];
