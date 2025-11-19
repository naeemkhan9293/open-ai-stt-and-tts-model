export enum AgentState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

// Global type augmentation for Web Speech API which is not fully typed in standard TS lib
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface SpeechConfig {
  lang: string;
  pitch: number;
  rate: number;
}