import { Card, CardCategory, ConditionType, ElementType, ReactionRecipe, MoleculeType } from './types';

// Helper to generate unique IDs
export const generateId = () => Math.random().toString(36).substr(2, 9);

export const ELEMENT_DECK: Omit<Card, 'id'>[] = [
  { name: 'Hydrogen', category: CardCategory.ELEMENT, element: ElementType.H, cost: 1, description: 'Basic building block. Highly reactive.', color: 'bg-blue-500' },
  { name: 'Hydrogen', category: CardCategory.ELEMENT, element: ElementType.H, cost: 1, description: 'Basic building block. Highly reactive.', color: 'bg-blue-500' },
  { name: 'Hydrogen', category: CardCategory.ELEMENT, element: ElementType.H, cost: 1, description: 'Basic building block. Highly reactive.', color: 'bg-blue-500' },
  { name: 'Hydrogen', category: CardCategory.ELEMENT, element: ElementType.H, cost: 1, description: 'Basic building block. Highly reactive.', color: 'bg-blue-500' },
  { name: 'Oxygen', category: CardCategory.ELEMENT, element: ElementType.O, cost: 1, description: 'Necessary for combustion and oxidation.', color: 'bg-red-500' },
  { name: 'Oxygen', category: CardCategory.ELEMENT, element: ElementType.O, cost: 1, description: 'Necessary for combustion and oxidation.', color: 'bg-red-500' },
  { name: 'Nitrogen', category: CardCategory.ELEMENT, element: ElementType.N, cost: 1, description: 'Inert gas, but powerful in compounds.', color: 'bg-purple-500' },
  { name: 'Chlorine', category: CardCategory.ELEMENT, element: ElementType.Cl, cost: 2, description: 'Toxic halogen.', color: 'bg-green-600' },
  { name: 'Sulfur', category: CardCategory.ELEMENT, element: ElementType.S, cost: 2, description: 'Yellow solid. Source of sulfates.', color: 'bg-yellow-500' },
  { name: 'Sodium', category: CardCategory.ELEMENT, element: ElementType.Na, cost: 2, description: 'Alkali metal. Reacts violently with water.', color: 'bg-orange-400' },
  { name: 'Silver', category: CardCategory.ELEMENT, element: ElementType.Ag, cost: 3, description: 'Transition metal. Forms precipitates.', color: 'bg-gray-400' },
  { name: 'Iron', category: CardCategory.ELEMENT, element: ElementType.Fe, cost: 2, description: 'Industrial metal. Catalyst capability.', color: 'bg-slate-500' },
  { name: 'Copper', category: CardCategory.ELEMENT, element: ElementType.Cu, cost: 2, description: 'Reddish metal.', color: 'bg-orange-600' },
];

export const CONDITION_DECK: Omit<Card, 'id'>[] = [
  { name: 'Burner (Heat)', category: CardCategory.CONDITION, condition: ConditionType.HEAT, cost: 1, description: 'Provides activation energy (Δ).', color: 'bg-red-700' },
  { name: 'Spark', category: CardCategory.CONDITION, condition: ConditionType.SPARK, cost: 1, description: 'Ignites explosive mixtures.', color: 'bg-yellow-300' },
  { name: 'Water (Solvent)', category: CardCategory.CONDITION, condition: ConditionType.WATER, cost: 0, description: 'Universal solvent for reactions.', color: 'bg-blue-400' },
  { name: 'Fe Catalyst', category: CardCategory.CONDITION, condition: ConditionType.CATALYST_FE, cost: 2, description: 'Catalyst for Haber-Bosch process.', color: 'bg-slate-600' },
];

export const STARTING_HAND_SIZE = 5;
export const MAX_MANA = 5;

// Recipe Database
// Logic will sort inputs alphabetically to match
export const RECIPES: ReactionRecipe[] = [
  // 2 H2 + O2 -> 2 H2O (Explosive synthesis if Spark used)
  {
    inputs: [ElementType.H, ElementType.H, ElementType.O],
    condition: ConditionType.SPARK,
    result: {
      name: 'Water Vapor Explosion',
      formula: 'H2O',
      type: MoleculeType.ATTACKER,
      power: 40,
      effectDescription: 'Explosive reaction of hydrogen and oxygen.',
    },
    explanation: 'Hydrogen burns explosively in oxygen: 2H2 + O2 -> 2H2O.'
  },
  // Na + H2O -> NaOH (Strong Base) + H2 (Ignites if spark, but here we simplify)
  {
    inputs: [ElementType.Na],
    condition: ConditionType.WATER,
    result: {
      name: 'Sodium Hydroxide',
      formula: 'NaOH',
      type: MoleculeType.ATTACKER,
      power: 50,
      effectDescription: 'Strong base corrosion. Generates heat.',
    },
    explanation: 'Alkali metals react violently with water: 2Na + 2H2O -> 2NaOH + H2.'
  },
  // H + Cl -> HCl
  {
    inputs: [ElementType.H, ElementType.Cl],
    condition: null, // Spontaneous or light, treated as standard here
    result: {
      name: 'Hydrochloric Acid',
      formula: 'HCl',
      type: MoleculeType.ATTACKER,
      power: 60,
      effectDescription: 'Strong acid attack.',
    },
    explanation: 'Hydrogen and chlorine react to form hydrogen chloride: H2 + Cl2 -> 2HCl.'
  },
  // Ag + Cl -> AgCl (Precipitate)
  {
    inputs: [ElementType.Ag, ElementType.Cl],
    condition: null,
    result: {
      name: 'Silver Chloride',
      formula: 'AgCl',
      type: MoleculeType.DEFENDER,
      power: 50, // Shield amount
      specialEffect: 'WALL',
      effectDescription: 'White precipitate wall. Blocks attacks.',
    },
    explanation: 'Silver ions react with chloride ions to form an insoluble white precipitate: Ag+ + Cl- -> AgCl.'
  },
  // Haber Bosch: N + 3H (Fe Catalyst) -> NH3
  {
    inputs: [ElementType.N, ElementType.H, ElementType.H, ElementType.H],
    condition: ConditionType.CATALYST_FE,
    result: {
      name: 'Ammonia',
      formula: 'NH3',
      type: MoleculeType.EFFECT,
      power: 10,
      specialEffect: 'STUN',
      effectDescription: 'Pungent odor stuns the opponent for 1 turn.',
    },
    explanation: 'Haber-Bosch Process: N2 + 3H2 -> 2NH3 with Iron catalyst.'
  },
  // Ostwald Step 3 simplified: NO2 + H2O -> HNO3
  // Simplified for game: N + O + O + H + Water -> HNO3
  {
    inputs: [ElementType.H, ElementType.N, ElementType.O, ElementType.O, ElementType.O],
    condition: ConditionType.WATER,
    result: {
      name: 'Nitric Acid',
      formula: 'HNO3',
      type: MoleculeType.ATTACKER,
      power: 90,
      specialEffect: 'PIERCING',
      effectDescription: 'Powerful oxidizing acid. Pierces standard shields.',
    },
    explanation: 'Ostwald Process final stage. Industrial production of nitric acid.'
  },
  // Fe + S -> FeS (Heated)
  {
    inputs: [ElementType.Fe, ElementType.S],
    condition: ConditionType.HEAT,
    result: {
      name: 'Iron(II) Sulfide',
      formula: 'FeS',
      type: MoleculeType.DEFENDER,
      power: 40,
      specialEffect: 'WALL',
      effectDescription: 'Black solid wall.',
    },
    explanation: 'Iron and sulfur react upon heating: Fe + S -> FeS.'
  }
];
