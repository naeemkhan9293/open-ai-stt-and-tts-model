import { GoogleGenAI, Content } from "@google/genai";
import { Message } from "../types";

// Initialize the client with the environment variable
// Note: In a real production app, ensure process.env.API_KEY is set safely.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `You are a helpful, concise, and conversational voice assistant named "Vox".
Your responses will be spoken aloud, so keep them natural, relatively short (under 3 sentences unless asked for details), and avoid using markdown symbols like asterisks, bolding, or complex lists that don't sound good when read by text-to-speech engines.
Focus on clarity and warmth.`;

export const generateResponse = async (
  history: Message[],
  newMessage: string
): Promise<string> => {
  try {
    // Convert our simple Message format to Gemini Content format
    const formattedHistory: Content[] = history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    const model = 'gemini-2.5-flash'; // High speed, low cost

    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        maxOutputTokens: 300, // Keep responses concise for voice
      },
      history: formattedHistory,
    });

    const result = await chat.sendMessage({ message: newMessage });
    
    if (!result.text) {
      throw new Error("No response text generated.");
    }

    return result.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting to my brain right now. Please try again.";
  }
};