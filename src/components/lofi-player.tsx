'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Music, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LofiPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // We use a high quality, free-to-use Lo-Fi track from Pixabay
    const audio = new Audio('https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3');
    audio.loop = true;
    audio.volume = 0.4; // Default to a soothing, non-intrusive volume
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
        }).catch(error => {
          console.error("Autoplay prevented:", error);
        });
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    
    const newMutedState = !isMuted;
    audioRef.current.muted = newMutedState;
    setIsMuted(newMutedState);
  };

  return (
    <div className="fixed bottom-6 left-6 z-[9998] flex items-center gap-2">
      <button
        onClick={togglePlay}
        className={cn(
          "bg-[#0A0A0A]/80 backdrop-blur-md border border-white/10 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center gap-3 group relative overflow-hidden",
          isPlaying ? "border-[#CCFF00]/50 shadow-[0_0_15px_rgba(204,255,0,0.2)]" : ""
        )}
        aria-label="Toggle Lo-Fi Music"
      >
        {isPlaying ? (
          <div className="absolute inset-0 bg-[#CCFF00]/10 animate-pulse"></div>
        ) : null}
        
        <div className="relative z-10 flex items-center justify-center">
          {isPlaying ? <Pause className="w-5 h-5 text-[#CCFF00]" /> : <Play className="w-5 h-5" />}
        </div>
        
        <div className="relative z-10 flex flex-col items-start mr-2">
          <span className="font-semibold text-xs leading-none mb-1 text-slate-200 group-hover:text-white transition-colors">Lo-Fi Vibes</span>
          {isPlaying ? (
             <div className="flex items-center gap-1 h-2">
               <span className="w-1 bg-[#CCFF00] h-full animate-[bounce_1s_infinite] rounded-full"></span>
               <span className="w-1 bg-[#CCFF00] h-full animate-[bounce_1.2s_infinite_0.1s] rounded-full"></span>
               <span className="w-1 bg-[#CCFF00] h-full animate-[bounce_0.8s_infinite_0.2s] rounded-full"></span>
               <span className="w-1 bg-[#CCFF00] h-full animate-[bounce_1.1s_infinite_0.3s] rounded-full"></span>
             </div>
          ) : (
             <span className="text-[10px] text-slate-400 leading-none">Klik untuk fokus</span>
          )}
        </div>
      </button>

      {isPlaying && (
        <button
          onClick={toggleMute}
          className="bg-[#0A0A0A]/80 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white p-2.5 rounded-full transition-colors animate-fade-in"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}
