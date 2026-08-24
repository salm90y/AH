import React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

export default function LandingPage({ onEnter }: LandingPageProps) {
  return (
    <div 
      className="relative min-h-screen w-full flex flex-col items-center justify-center bg-[#070a13] text-white px-4 sm:px-6 overflow-hidden selection:bg-purple-500/30"
      dir="rtl"
    >
      {/* Dynamic Ambient Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[540px] h-[320px] sm:h-[540px] bg-gradient-to-tr from-purple-600/20 via-indigo-600/20 to-blue-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-purple-900/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-blue-900/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container Card */}
      <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col items-center text-center p-8 sm:p-12 rounded-3xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-2xl shadow-2xl shadow-purple-950/30">
        
        {/* Modern Symbol / Logo */}
        <div className="relative mb-8 group">
          {/* Subtle logo background glow */}
          <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-600 rounded-3xl blur-md opacity-60 group-hover:opacity-100 transition-all duration-700" />
          
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-[#121829] to-[#0a0d18] border border-white/15 flex items-center justify-center shadow-2xl">
            <span className="text-4xl sm:text-5xl font-black tracking-wider bg-gradient-to-r from-purple-400 via-pink-300 to-indigo-300 bg-clip-text text-transparent select-none drop-shadow-sm">
              AH
            </span>
            
            {/* Live Indicator Dot */}
            <div className="absolute top-2.5 right-2.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0e1424] shadow-sm shadow-emerald-400/50 animate-pulse" />
          </div>
        </div>

        {/* Welcome Message */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-snug mb-10">
          أهلاً بكم في منصة{' '}
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300 bg-clip-text text-transparent">
            AH
          </span>
        </h1>

        {/* Enter Platform Button */}
        <button
          onClick={onEnter}
          className="w-full sm:w-auto min-w-[240px] flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 text-white font-bold text-base sm:text-lg shadow-xl shadow-purple-900/40 hover:shadow-purple-700/60 hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 cursor-pointer border border-white/20 group"
        >
          <span>الدخول إلى المنصة</span>
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1.5 transition-transform duration-300" />
        </button>

      </div>
    </div>
  );
}
