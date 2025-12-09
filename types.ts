
export enum ElementType {
  H = 'H',
  C = 'C',
  N = 'N',
  O = 'O',
  S = 'S',
  Cl = 'Cl',
  Na = 'Na',
  Mg = 'Mg',
  Al = 'Al',
  Fe = 'Fe',
  Cu = 'Cu',
  Ag = 'Ag',
}

export enum CardCategory {
  ELEMENT = 'ELEMENT',
  CONDITION = 'CONDITION',
  SUPPORT = 'SUPPORT'
}

export enum ConditionType {
  HEAT = 'Heat (Δ)',
  SPARK = 'Spark',
  CATALYST_FE = 'Fe Catalyst',
  CATALYST_PT = 'Pt Catalyst',
  WATER = 'Water (Solvent)', // Acts as environment
  NONE = 'None'
}

export interface Card {
  id: string;
  name: string;
  category: CardCategory;
  element?: ElementType;
  condition?: ConditionType;
  // Cost removed for simplicity
  description: string;
  color: string;
}

export enum MoleculeType {
  ATTACKER = 'ATTACKER',
  DEFENDER = 'DEFENDER',
  EFFECT = 'EFFECT'
}

export interface Molecule {
  id: string; // unique instance id
  name: string;
  formula: string;
  type: MoleculeType;
  power: number; // Attack or Defense points
  effectDescription: string;
  specialEffect?: 'STUN' | 'POISON' | 'DIRECT_DMG' | 'PIERCING' | 'WALL';
}

export interface ReactionRecipe {
  inputs: ElementType[];
  condition: ConditionType | null; // null means contact/standard
  result: {
    name: string;
    formula: string;
    type: MoleculeType;
    power: number;
    effectDescription: string;
    specialEffect?: 'STUN' | 'POISON' | 'DIRECT_DMG' | 'PIERCING' | 'WALL';
  };
  explanation: string;
}

export interface PlayerState {
  hp: number;
  maxHp: number;
  // Mana removed
  hand: Card[];
  // fieldElements removed (Direct synthesis from hand)
  molecules: Molecule[]; // Synthesized active units
  poisonCounters: number;
  isStunned: boolean;
  shield: number;
}

export type GamePhase = 'DRAW' | 'MAIN' | 'BATTLE' | 'END';

export interface LogEntry {
  turn: number;
  message: string;
  type: 'info' | 'combat' | 'synthesis' | 'ai';
}
