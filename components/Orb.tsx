import React from 'react';
import { AgentState } from '../types';

interface OrbProps {
  state: AgentState;
}

export const Orb: React.FC<OrbProps> = ({ state }) => {
  // Visual styles based on state
  const getStyles = () => {
    switch (state) {
      case AgentState.LISTENING:
        return "scale-125 bg-red-500 shadow-[0_0_60px_20px_rgba(239,68,68,0.4)] animate-pulse";
      case AgentState.THINKING:
        return "scale-100 bg-yellow-400 shadow-[0_0_50px_10px_rgba(250,204,21,0.4)] animate-spin-slow";
      case AgentState.SPEAKING:
        return "scale-110 bg-primary-500 shadow-[0_0_80px_30px_rgba(99,102,241,0.5)] animate-pulse-slow";
      case AgentState.IDLE:
      default:
        return "scale-100 bg-white/10 shadow-[0_0_30px_5px_rgba(255,255,255,0.1)]";
    }
  };

  const getInnerStyles = () => {
    switch (state) {
      case AgentState.THINKING:
        return "bg-yellow-200 animate-ping opacity-75";
      case AgentState.SPEAKING:
        return "bg-primary-300 animate-bounce opacity-50";
      default:
        return "bg-white opacity-10";
    }
  };

  return (
    <div className="relative flex items-center justify-center h-64 w-64 my-8 transition-all duration-700 ease-in-out">
       {/* Outer Glow Ring - Ambient */}
       <div className={`absolute inset-0 rounded-full opacity-20 transition-all duration-1000 ${state === AgentState.SPEAKING ? 'bg-primary-500 scale-150 blur-3xl' : 'bg-transparent'}`} />

      {/* Main Orb */}
      <div 
        className={`relative w-40 h-40 rounded-full transition-all duration-500 ease-out backdrop-blur-md flex items-center justify-center ${getStyles()}`}
      >
        {/* Inner Core */}
        <div className={`w-20 h-20 rounded-full transition-all duration-500 ${getInnerStyles()}`} />
      </div>

      {/* Status Label (Floating below) */}
      <div className="absolute -bottom-12 font-mono text-sm text-gray-400 tracking-widest uppercase">
        {state}
      </div>
    </div>
  );
};