import React, { useState, useEffect, useRef } from 'react';
import { AgentState, Message } from './types';
import { useSpeech } from './hooks/useSpeech';
import { generateResponse, transcribeAudio, generateSpeech } from './services/openai';
import { Orb } from './components/Orb';

export default function App() {
  const [agentState, setAgentState] = useState<AgentState>(AgentState.IDLE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statusText, setStatusText] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // OpenAI API Key Management
  const [apiKey, setApiKey] = useState<string>("");
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [tempKey, setTempKey] = useState<string>("");

  const { 
    isSupported, 
    isRecording, 
    startRecording, 
    stopRecording, 
    playAudio,
    stopAudio 
  } = useSpeech();

  // Load key from local storage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem("openai_api_key");
    if (storedKey) {
      setApiKey(storedKey);
    } else {
      setShowSettings(true);
    }
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentState]);

  const handleSaveKey = () => {
    if (tempKey.trim().startsWith("sk-")) {
      localStorage.setItem("openai_api_key", tempKey.trim());
      setApiKey(tempKey.trim());
      setShowSettings(false);
    } else {
      alert("Please enter a valid OpenAI API key starting with 'sk-'");
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem("openai_api_key");
    setApiKey("");
    setTempKey("");
    setShowSettings(true);
  };

  const handleMicClick = async () => {
    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    if (agentState === AgentState.SPEAKING) {
      stopAudio();
      setAgentState(AgentState.IDLE);
      setStatusText("");
      return;
    }

    if (agentState === AgentState.IDLE) {
      // Start Recording
      await startRecording();
      setAgentState(AgentState.LISTENING);
      setStatusText("Listening...");
    } else if (agentState === AgentState.LISTENING) {
      // Stop Recording & Process
      setAgentState(AgentState.THINKING);
      setStatusText("Transcribing audio...");
      
      try {
        const audioBlob = await stopRecording();
        
        // 1. Transcribe (Whisper)
        const userText = await transcribeAudio(apiKey, audioBlob);
        setStatusText(`You said: "${userText}"`);

        if (!userText.trim()) {
           setAgentState(AgentState.IDLE);
           setStatusText("");
           return;
        }

        // Add user message
        const userMsg: Message = { role: 'user', text: userText, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        
        // 2. Think (GPT-4o-mini)
        setStatusText("Thinking...");
        const responseText = await generateResponse(apiKey, [...messages, userMsg], userText);

        // Add model message
        const modelMsg: Message = { role: 'model', text: responseText, timestamp: Date.now() };
        setMessages(prev => [...prev, modelMsg]);

        // 3. Speak (TTS-1)
        setStatusText("Generating voice...");
        const audioResponseBlob = await generateSpeech(apiKey, responseText);
        
        setAgentState(AgentState.SPEAKING);
        setStatusText("Speaking...");
        
        playAudio(audioResponseBlob, () => {
          setAgentState(AgentState.IDLE);
          setStatusText("");
        });

      } catch (error: any) {
        console.error(error);
        setAgentState(AgentState.IDLE);
        setStatusText("Error occurred.");
        
        if (error.message.includes("Invalid API Key")) {
          alert("Your API Key seems invalid.");
          setShowSettings(true);
        } else {
          const errorMsg: Message = { role: 'model', text: "Error: " + error.message, timestamp: Date.now() };
          setMessages(prev => [...prev, errorMsg]);
        }
      }
    }
  };

  if (!isSupported) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-white p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-red-500 mb-4">Browser Not Supported</h1>
          <p className="text-gray-400">This application requires microphone access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden relative">
      
      {/* Header */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-center z-10 bg-gradient-to-b from-gray-950 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary-500"></div>
          <h1 className="font-semibold text-lg tracking-tight">VoxOpenAI <span className="text-xs text-gray-500 font-normal px-2 border border-gray-800 rounded-full">FULL STACK</span></h1>
        </div>
        <button 
          onClick={() => {
             setTempKey(apiKey);
             setShowSettings(true);
          }}
          className="text-xs text-gray-400 hover:text-white bg-gray-900 px-3 py-1 rounded-full border border-gray-800 transition-colors"
        >
          {apiKey ? "Settings" : "Set API Key"}
        </button>
      </div>

      {/* API Key Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-2">OpenAI Config</h2>
            <p className="text-gray-400 text-sm mb-6">
              This agent uses <strong>Whisper</strong> for hearing, <strong>GPT-4o-mini</strong> for thinking, and <strong>TTS-1</strong> for speaking.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">API Key</label>
                <input 
                  type="password" 
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                />
              </div>
              
              <div className="flex gap-3 mt-6">
                {apiKey && (
                  <button 
                    onClick={handleClearKey}
                    className="flex-1 px-4 py-3 rounded-lg font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                  >
                    Clear Key
                  </button>
                )}
                <button 
                  onClick={handleSaveKey}
                  className="flex-1 px-4 py-3 rounded-lg font-medium bg-primary-600 text-white hover:bg-primary-500 transition-colors shadow-lg shadow-primary-500/20"
                >
                  {apiKey ? "Update Key" : "Start Agent"}
                </button>
              </div>
              
              <div className="text-center mt-4">
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-xs text-gray-600 hover:text-primary-400 underline">
                  Get an API key here
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Interaction Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-0 mt-10">
        <Orb state={agentState} />
        
        {/* Live Status Overlay */}
        <div className={`mt-8 h-16 px-6 text-center transition-all duration-300 ${statusText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <p className="text-lg font-light text-white/90 animate-pulse">
              {statusText}
            </p>
        </div>
      </div>

      {/* Chat History / Controls Container */}
      <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col justify-end pb-8 px-4 z-10">
        
        {/* Scrollable Chat Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar mb-6 mask-image-linear space-y-4 max-h-[30vh]">
          {messages.length === 0 && !showSettings && (
             <div className="text-center text-gray-600 py-10">
               <p>Tap the microphone to start recording.</p>
             </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm backdrop-blur-sm ${
                msg.role === 'user' 
                  ? 'bg-gray-800 text-gray-100 rounded-br-none border border-gray-700' 
                  : 'bg-primary-900/30 text-primary-100 rounded-bl-none border border-primary-500/20'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Controls */}
        <div className="flex justify-center items-center gap-6">
          <button 
            onClick={handleMicClick}
            disabled={showSettings || agentState === AgentState.THINKING}
            className={`relative group p-6 rounded-full transition-all duration-300 border shadow-xl ${
              agentState === AgentState.LISTENING 
                ? 'bg-red-500 border-red-400 text-white hover:bg-red-600 scale-110'
                : agentState === AgentState.SPEAKING
                  ? 'bg-gray-800 border-gray-700 text-red-400 hover:bg-gray-700'
                  : agentState === AgentState.THINKING
                    ? 'bg-yellow-500/50 border-yellow-500/50 text-white cursor-wait animate-pulse'
                    : 'bg-primary-600 border-primary-500 text-white hover:bg-primary-500 hover:scale-105 hover:shadow-primary-500/25'
            } ${showSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {/* Icon Logic */}
            {agentState === AgentState.LISTENING ? (
               // Stop / Send Icon
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
               </svg>
            ) : agentState === AgentState.SPEAKING ? (
               // Stop Speaking Icon (X)
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
               </svg>
            ) : agentState === AgentState.THINKING ? (
               // Spinner
               <svg className="animate-spin w-8 h-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
            ) : (
               // Mic Icon
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
               </svg>
            )}
          </button>
        </div>
        
        <p className="text-center text-gray-600 text-xs mt-6 h-4">
           {agentState === AgentState.SPEAKING ? "Tap to interrupt" : 
            agentState === AgentState.LISTENING ? "Tap again to send" :
            agentState === AgentState.THINKING ? "Processing..." : 
            "Tap microphone to record"}
        </p>
      </div>
    </div>
  );
}