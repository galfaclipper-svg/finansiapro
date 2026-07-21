'use client';
import React from 'react';

export function DynamicBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-[#CCFF00]/10 md:bg-[#CCFF00]/15 rounded-full blur-[100px] md:blur-[120px] mix-blend-screen animate-blob-1"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-indigo-600/10 rounded-full blur-[120px] md:blur-[150px] mix-blend-screen animate-blob-2"></div>
    </div>
  );
}
