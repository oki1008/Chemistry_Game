import { Card, ElementType, ReactionRecipe, Molecule, ConditionType, CardCategory } from "../types";
import { RECIPES } from "../constants";

// Helper to check array equality independent of order
const areArraysEqual = (arr1: any[], arr2: any[]) => {
  if (arr1.length !== arr2.length) return false;
  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();
  return sorted1.every((value, index) => value === sorted2[index]);
};

export const checkSynthesis = (
  fieldCards: Card[]
): ReactionRecipe | null => {
  // Separate Elements and Conditions from the field pile
  const inputElements = fieldCards
    .filter(c => c.category === CardCategory.ELEMENT)
    .map(c => c.element!)
    .filter(Boolean);
    
  const conditions = fieldCards
    .filter(c => c.category === CardCategory.CONDITION)
    .map(c => c.condition!);
    
  // Find a matching recipe
  const match = RECIPES.find(recipe => {
    // 1. Check if elements match exactly
    const elementsMatch = areArraysEqual(recipe.inputs, inputElements);
    if (!elementsMatch) return false;

    // 2. Check Condition
    if (recipe.condition) {
        return conditions.includes(recipe.condition);
    } else {
        return true; // If recipe needs no condition, allowing extra conditions is usually bad practice in code, but okay here.
                   // Actually strictly, if recipe needs NONE, and we provided HEAT, it shouldn't match?
                   // For simplicity in this game, if recipe is contact, we usually allow it.
                   // But let's be strict: if recipe needs null, field should have no conditions or ignored.
        return true; 
    }
  });

  return match || null;
};

// NEW: Helper to find *any* possible recipe from a larger hand
export const findPossibleRecipeInHand = (hand: Card[]): { recipe: ReactionRecipe, cardIds: string[] } | null => {
  // We need to check every recipe to see if 'hand' contains the ingredients
  
  for (const recipe of RECIPES) {
    const requiredElements = [...recipe.inputs]; // e.g. [H, H, O]
    const requiredCondition = recipe.condition;  // e.g. SPARK
    
    let tempHand = [...hand];
    const foundCardIds: string[] = [];
    let possible = true;

    // Check Elements
    for (const reqEl of requiredElements) {
      const foundIndex = tempHand.findIndex(c => c.category === CardCategory.ELEMENT && c.element === reqEl);
      if (foundIndex !== -1) {
        foundCardIds.push(tempHand[foundIndex].id);
        // Remove from tempHand so we don't reuse the same card for multiple requirements
        tempHand.splice(foundIndex, 1); 
      } else {
        possible = false;
        break;
      }
    }

    // Check Condition
    if (possible && requiredCondition) {
      const foundIndex = tempHand.findIndex(c => c.category === CardCategory.CONDITION && c.condition === requiredCondition);
      if (foundIndex !== -1) {
        foundCardIds.push(tempHand[foundIndex].id);
      } else {
        possible = false;
      }
    }

    if (possible) {
      return { recipe, cardIds: foundCardIds };
    }
  }

  return null;
};

// NEW: Helper to suggest what is missing based on current selection
export const getMissingIngredientsMessage = (selectedCards: Card[]): string | null => {
  if (selectedCards.length === 0) return null;

  const currentElements = selectedCards.filter(c => c.category === CardCategory.ELEMENT).map(c => c.element!);
  const currentConditions = selectedCards.filter(c => c.category === CardCategory.CONDITION).map(c => c.condition!);

  // Find the recipe that is "closest" to being done
  // Score = (matched ingredients) / (total ingredients)
  
  let bestMatch = {
    recipeName: '',
    missing: [] as string[],
    score: 0
  };

  for (const recipe of RECIPES) {
    const neededElements = [...recipe.inputs];
    let matchedCount = 0;
    
    // Check elements
    const tempCurrentElements = [...currentElements];
    for (const needed of neededElements) {
      const idx = tempCurrentElements.indexOf(needed);
      if (idx !== -1) {
        matchedCount++;
        tempCurrentElements.splice(idx, 1);
      }
    }

    // Check condition
    let conditionMatched = false;
    if (recipe.condition) {
       if (currentConditions.includes(recipe.condition)) {
         matchedCount++;
         conditionMatched = true;
       }
    } else {
      conditionMatched = true; // No condition needed counts as matched
    }
    
    const totalNeeded = recipe.inputs.length + (recipe.condition ? 1 : 0);
    // Avoid division by zero, though recipes always have inputs
    const score = matchedCount / totalNeeded;

    // We only care if we have started making it (score > 0) but haven't finished (score < 1)
    if (score > 0 && score < 1 && score > bestMatch.score) {
      // Determine exactly what is missing for the user text
      const missingNames: string[] = [];
      
      // Re-calculate missing elements
      const checkElements = [...recipe.inputs];
      const checkCurrent = [...currentElements];
      for (const el of checkElements) {
         const idx = checkCurrent.indexOf(el);
         if (idx !== -1) checkCurrent.splice(idx, 1);
         else missingNames.push(el);
      }

      if (recipe.condition && !currentConditions.includes(recipe.condition)) {
        // Map condition type to friendly name
        const condName = recipe.condition === ConditionType.HEAT ? '加熱' : 
                         recipe.condition === ConditionType.SPARK ? '点火' : '水';
        missingNames.push(condName);
      }

      bestMatch = {
        recipeName: recipe.result.name,
        missing: missingNames,
        score
      };
    }
  }

  if (bestMatch.score > 0) {
    const missingStr = Array.from(new Set(bestMatch.missing)).join('」か「');
    return `あと「${missingStr}」があれば、${bestMatch.recipeName}になりそう...`;
  }

  return null;
};

export const calculateDamage = (attacker: Molecule, targetShield: number): number => {
  if (attacker.specialEffect === 'PIERCING') return attacker.power; // Ignore shield
  return Math.max(0, attacker.power - targetShield);
};