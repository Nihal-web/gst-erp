
import { GoogleGenAI, Type } from "@google/genai";

export const fetchHSNDetails = async (query: string) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key missing. Please add VITE_GEMINI_API_KEY to your .env.local file.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // The new @google/genai SDK (v1.x) uses client.models.generateContent
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Find the GST HSN/SAC code and current GST percentage for: ${query}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hsnCode: { type: Type.STRING },
            gstPercent: { type: Type.NUMBER },
            description: { type: Type.STRING }
          },
          required: ["hsnCode", "gstPercent"]
        }
      }
    });

    // In the new SDK, text is usually a direct property (string)
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error fetching HSN:", error);
    // Fallback if API fails
    return { hsnCode: '8203', gstPercent: 18, description: 'Hand Tools (Simulated)' };
  }
};
