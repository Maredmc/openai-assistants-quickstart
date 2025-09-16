'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bed, Moon, Heart, Ruler, Package, Sparkles, Home as HomeIcon, Bot } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface QuickQuestion {
  icon: React.ReactNode;
  text: string;
  color: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Ciao! 👋 Sono il tuo assistente personale per la scelta del letto perfetto. Posso aiutarti a trovare il letto ideale in base alle tue esigenze di comfort, spazio, stile e budget. Come posso aiutarti oggi?'
    }
  ]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initThread = async () => {
      try {
        const response = await fetch('/api/assistants/threads', {
          method: 'POST'
        });
        const data = await response.json();
        setThreadId(data.threadId);
      } catch (error) {
        console.error('Error creating thread:', error);
      }
    };
    initThread();
  }, []);

  const handleSubmit = async (e?: React.FormEvent | { preventDefault: () => void }) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (!inputValue.trim() || isLoading || !threadId) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/assistants/threads/${threadId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: userMessage,
        }),
      });

      const stream = response.body;
      if (!stream) return;
      
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                assistantMessage += parsed.text;
              }
            } catch (e) {
              // Ignora errori di parsing
            }
          }
        }
      }

      if (assistantMessage) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: assistantMessage 
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Mi dispiace, c\'è stato un errore. Riprova per favore.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
    setTimeout(() => {
      handleSubmit({ preventDefault: () => {} });
    }, 100);
  };

  const quickQuestions: QuickQuestion[] = [
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
      {/* Header */}
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
        <div className="max-w-5xl mx-auto h-full flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-5 py-4 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg'
                      : 'bg-white text-gray-800 shadow-xl border border-gray-100'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                        <Bot className="w-4 h-4 text-indigo-600" />
                      </div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assistente AI</span>
                    </div>
                  )}
                  <p className="text-[15px] leading-relaxed whitespace-pre-line">{message.content}</p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start animate-fadeIn">
                <div className="bg-white rounded-2xl px-5 py-4 shadow-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce"></div>
                      <div className="w-2.5 h-2.5 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2.5 h-2.5 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <span className="text-sm text-gray-500">Sto pensando...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length === 1 && !isLoading && (
            <div className="px-6 py-4 bg-white/50 backdrop-blur-sm">
              <p className="text-sm text-gray-600 font-medium mb-3 text-center">💡 Domande frequenti:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickQuestions.map((q, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickQuestion(q.text)}
                    className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-left group hover:scale-[1.02]"
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

          {/* Input Area */}
          <div className="p-6 bg-white border-t border-gray-100">
            <div className="max-w-5xl mx-auto">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    placeholder="Chiedimi qualsiasi cosa sui letti..."
                    className="w-full px-6 py-4 pr-12 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-[15px] transition-all shadow-sm"
                    disabled={isLoading || !threadId}
                  />
                  <HomeIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                <button
                  onClick={() => handleSubmit()}
                  disabled={isLoading || !inputValue.trim() || !threadId}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl font-medium"
                >
                  <Send className="w-5 h-5" />
                  <span className="hidden sm:inline">Invia</span>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Premi Invio per inviare • Shift+Invio per andare a capo
              </p>
            </div>
          </div>
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
}