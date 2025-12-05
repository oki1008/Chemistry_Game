import { GoogleGenAI } from "@google/genai";
import { LogEntry, ReactionRecipe } from "../types";

let ai: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const getChemistryCommentary = async (
  recipe: ReactionRecipe,
  turnNumber: number
): Promise<string> => {
  if (!ai) return recipe.explanation;

  try {
    // We use generateContent for text answers
    const prompt = `
      You are a passionate chemistry professor narrating a card game battle.
      The player just performed this reaction: ${recipe.explanation}.
      Result: ${recipe.result.name} (${recipe.result.formula}).
      
      Give a short, exciting, 1-sentence commentary suitable for a high school student.
      Mention a real-world application or a quirky fact about the substance.
      Keep it under 30 words.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || recipe.explanation;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return recipe.explanation; // Fallback
  }
};

export const getAIActionComment = async (
  actionDescription: string
): Promise<string> => {
  if (!ai) return "";

  try {
    const prompt = `
      You are an AI opponent in a chemistry battle game.
      You just performed this action: ${actionDescription}.
      Give a short, witty taunt or scientific remark (max 10 words).
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "";
  } catch (error) {
    return "";
  }
}
