import { GoogleGenAI } from "@google/genai";
import { ReactionRecipe } from "../types";

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
    const prompt = `
      あなたは熱血な化学の先生です。カードゲームの実況をしています。
      プレイヤーが以下の化学反応を成功させました: ${recipe.explanation}
      生成物: ${recipe.result.name} (${recipe.result.formula}).
      
      高校生に向けて、この物質に関する豆知識や実社会での用途を、
      短く（30文字以内）、ワクワクするような日本語でコメントしてください。
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
      あなたは化学カードゲームの対戦相手（AI）です。
      あなたはこの行動をとりました: ${actionDescription}.
      
      対戦相手（プレイヤー）に対して、少し生意気だけど知的なセリフを日本語で一つ言ってください（20文字以内）。
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