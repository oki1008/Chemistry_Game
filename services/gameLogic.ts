import { Card, ElementType, ReactionRecipe, Molecule, ConditionType } from "../types";
import { RECIPES } from "../constants";

// Helper to check array equality independent of order
const areArraysEqual = (arr1: any[], arr2: any[]) => {
  if (arr1.length !== arr2.length) return false;
  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();
  return sorted1.every((value, index) => value === sorted2[index]);
};

export const checkSynthesis = (
  selectedElements: Card[],
  selectedCondition: Card | null
): ReactionRecipe | null => {
  const inputElements = selectedElements.map(c => c.element!).filter(Boolean);
  const inputCondition = selectedCondition ? selectedCondition.condition : null; // Condition or standard contact (null)

  // Find a matching recipe
  const match = RECIPES.find(recipe => {
    const elementsMatch = areArraysEqual(recipe.inputs, inputElements);
    
    // If recipe requires a specific condition
    if (recipe.condition) {
        return elementsMatch && recipe.condition === inputCondition;
    }
    
    // If recipe has no condition (null), it means it reacts on contact. 
    // However, if the user supplies a condition (like Heat) to a contact reaction, it usually still works (or accelerates).
    // For game simplicity: Exact match on condition if specified in recipe, OR recipe is null and user provided nothing or generic water.
    return elementsMatch && (inputCondition === null || inputCondition === ConditionType.WATER); 
  });

  return match || null;
};

export const calculateDamage = (attacker: Molecule, targetShield: number): number => {
  if (attacker.specialEffect === 'PIERCING') return attacker.power; // Ignore shield
  return Math.max(0, attacker.power - targetShield);
};
