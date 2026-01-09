
import { GoogleGenAI, Type } from "@google/genai";
import { VocabItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const extractVocabFromImage = async (base64Image: string): Promise<VocabItem[]> => {
  try {
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
              text: "Extract vocabulary words from this image. If only English words are visible, translate them to Vietnamese. If only Vietnamese is visible, translate to English. Return a structured JSON array of objects with 'english' and 'vietnamese' keys. Do not include any other text."
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
              english: { type: Type.STRING },
              vietnamese: { type: Type.STRING },
            },
            required: ['english', 'vietnamese']
          }
        }
      }
    });

    const data = JSON.parse(response.text || "[]");
    return data.map((item: any, index: number) => ({
      id: Math.random().toString(36).substr(2, 9),
      english: item.english,
      vietnamese: item.vietnamese,
      dateLearned: new Date().toLocaleDateString('vi-VN'),
    }));
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw error;
  }
};
