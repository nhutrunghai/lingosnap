
import { GoogleGenAI, Type } from "@google/genai";
import { ExerciseItem, ExerciseType } from "../types";

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY.');
  }
  return new GoogleGenAI({ apiKey });
};

export const extractExercisesFromImage = async (base64Image: string): Promise<ExerciseItem[]> => {
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image.split(',')[1] || base64Image,
              },
            },
            {
              text: `Analyze this educational image and extract all exercises into a structured format. 
              Identify the type for each question:
              1. 'MATCHING': For matching tasks (e.g., match articles a/an with nouns).
              2. 'FILL_BLANK': For filling words into sentences.
              3. 'REWRITE': For rewriting sentences (e.g., using contractions).
              4. 'MULTIPLE_CHOICE': For questions with options A, B, C.
              5. 'VOCAB': For simple word-meaning pairs if no complex exercise is found.
              
              Translate instructions to Vietnamese if they are in English. 
              Keep the core questions in English as in the image.
              Return a JSON array of objects.`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { 
                type: Type.STRING, 
                description: "Type of exercise: MATCHING, FILL_BLANK, REWRITE, MULTIPLE_CHOICE, VOCAB"
              },
              instruction: { type: Type.STRING, description: "Instruction for the exercise in Vietnamese" },
              question: { type: Type.STRING, description: "The question or word to be processed" },
              answer: { type: Type.STRING, description: "The correct answer" },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Options for multiple choice or matching"
              },
            },
            required: ['type', 'instruction', 'question', 'answer']
          }
        }
      }
    });

    const data = JSON.parse(response.text || "[]");
    return data.map((item: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      type: item.type as ExerciseType,
      instruction: item.instruction,
      question: item.question,
      answer: item.answer,
      options: item.options || [],
      dateLearned: new Date().toLocaleDateString('vi-VN'),
    }));
  } catch (error) {
    console.error("Gemini Exercise Extraction Error:", error);
    throw error;
  }
};

