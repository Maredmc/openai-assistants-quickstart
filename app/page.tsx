'use client';

import React, { useState } from 'react';
import Chat from './components/chat';
import { Bed, Moon, Heart, Ruler, Package, Sparkles, Home } from 'lucide-react';

const BedAdvisorChatbot = () => {
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);

  const quickQuestions = [
    { 
      icon: <Ruler className="w-4 h-4" />, 
      text: "Che misura mi consigli per una camera di 15mq?",
      color: "from-blue-500 to-blue-600"
    },
    { 
      icon: <Moon className="w-4 h-4" />, 
      text: "Qual è il miglior materasso per dormire bene?",
      color: "from-purple-500 to-purple-600"
    },
    { 
      icon: <Heart className="w-4 h-4" />, 
      text: "Letto adatto per chi soffre di mal di schiena?",
      color: "from-pink-500 to-pink-600"
    },
    { 
      icon: <Package className="w-4 h-4" />, 
      text: "Vantaggi dei letti contenitore",
      color: "from-green-500 to-green-600"
    }
  ];

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header Premium */}
      <div className="bg-white shadow-lg border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl blur opacity-30"></div>
              <div className="relative bg-gradient-to-br from-indigo-600 to-purple-600 p-3 rounded-xl">
                <Bed className="w-7 h-7 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Assistente Letti AI
                </h1>
                <Sparkles className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-sm text-gray-600 font-medium">Il tuo consulente personale per il riposo perfetto</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700">Online 24/7</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          <div className="flex-1 overflow-hidden">
            <Chat />
          </div>

          {/* Quick Questions - Mostra solo all'inizio */}
          {showQuickQuestions && (
            <div className="px-6 py-4 bg-white/50 backdrop-blur-sm">
              <p className="text-sm text-gray-600 font-medium mb-3 text-center">💡 Domande frequenti:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickQuestions.map((q, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setShowQuickQuestions(false);
                      // Qui dovresti implementare l'invio automatico della domanda
                      // Per ora solo nascondiamo le domande rapide
                    }}
                    className={`flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-left group hover:scale-[1.02]`}
                  >
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${q.color} text-white group-hover:scale-110 transition-transform`}>
                      {q.icon}
                    </div>
                    <span className="text-sm font-medium text-gray-700 flex-1">{q.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default BedAdvisorChatbot;