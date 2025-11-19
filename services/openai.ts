import OpenAI from "openai";
import { Message } from "../types";

// Helper to create client
const getClient = (apiKey: string) => new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true,
});

/**
 * Transcribes audio file using OpenAI Whisper model
 */
export const transcribeAudio = async (apiKey: string, audioBlob: Blob): Promise<string> => {
  try {
    const openai = getClient(apiKey);
    const file = new File([audioBlob], "input.webm", { type: "audio/webm" });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
    });

    return transcription.text;
  } catch (error: any) {
    console.error("Whisper API Error:", error);
    throw new Error("Failed to transcribe audio.");
  }
};

/**
 * Generates text response using GPT-4o-mini
 */
export const generateResponse = async (
  apiKey: string,
  history: Message[],
  newMessage: string
): Promise<string> => {
  try {
    const openai = getClient(apiKey);

    const messages: any[] = [
      { 
        role: "system", 
        content: `You are a helpful, conversational voice assistant named "Vox". 
        Your output will be converted to audio. 
        Keep responses concise (1-2 sentences typically), warm, and strictly plain text (no markdown, no lists, no special characters).` 
      },
      ...history.map((msg) => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.text,
      })),
      { role: "user", content: newMessage },
    ];

    const completion = await openai.chat.completions.create({
      messages: messages,
      model: "gpt-4o-mini",
      max_tokens: 150,
    });

    const responseText = completion.choices[0]?.message?.content || "";
    
    if (!responseText) {
      throw new Error("No response generated from OpenAI.");
    }

    return responseText;
  } catch (error: any) {
    console.error("OpenAI Chat Error:", error);
    if (error?.status === 401) {
      throw new Error("Invalid API Key.");
    }
    throw new Error("I'm having trouble thinking right now.");
  }
};

/**
 * Generates audio from text using OpenAI TTS-1
 */
export const generateSpeech = async (apiKey: string, text: string): Promise<Blob> => {
  try {
    const openai = getClient(apiKey);

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });

    // Convert the raw response to a Blob
    const blob = await mp3.blob();
    return blob;
  } catch (error: any) {
    console.error("OpenAI TTS Error:", error);
    throw new Error("Failed to generate speech.");
  }
};