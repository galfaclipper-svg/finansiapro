'use client';
import React from 'react';
import { MessageCircle } from 'lucide-react';

export function WhatsAppFloat() {
  const handleChat = () => {
    // 62881010129990
    window.open('https://wa.me/62881010129990?text=Halo%20Admin%20FinansiaProf,%20saya%20butuh%20bantuan...', '_blank');
  };

  return (
    <button
      onClick={handleChat}
      className="fixed bottom-6 left-6 z-[9999] bg-[#25D366] hover:bg-[#128C7E] text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center group"
      aria-label="Chat WhatsApp Customer Service"
    >
      <MessageCircle className="w-7 h-7" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs group-hover:ml-3 transition-all duration-300 ease-in-out font-medium text-sm">
        Bantuan Live Chat
      </span>
      {/* Pulse effect */}
      <span className="absolute w-full h-full bg-[#25D366] rounded-full opacity-50 animate-ping -z-10"></span>
    </button>
  );
}
