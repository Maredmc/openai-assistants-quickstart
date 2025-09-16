'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bed, Sparkles, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';

// Componente per l'animazione di pensiero
const ThinkingAnimation = () => {
  return (
    <div className="flex items-center gap-2 text-gray-500">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
};

// Componente per il logo animato
const AnimatedLogo = ({ isThinking = false }) => {
  return (
    <div className="relative">
      <div className={`relative bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-lg transition-all duration-300 ${isThinking ? 'scale-110' : 'scale-100'}`}>
        <Bed className={`w-5 h-5 text-white transition-all duration-300 ${isThinking ? 'animate-pulse' : ''}`} />
      </div>
      {isThinking && (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg animate-ping opacity-75"></div>
      )}
    </div>
  );
};

const BedAdvisorChatbot = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Ciao! 👋 Sono il tuo assistente personale per la scelta del letto perfetto. Posso aiutarti a trovare il letto ideale in base alle tue esigenze di comfort, spazio, stile e budget. Come posso aiutarti oggi?'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Inizializza il thread al primo caricamento
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !threadId) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Aggiungi il messaggio dell'utente
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setIsThinking(true);

    try {
      // Aggiungi messaggio dell'assistente vuoto (per mostrare "thinking")
      setMessages(prev => [...prev, { role: 'assistant', content: '', isTyping: true }]);

      const response = await fetch(`/api/assistants/threads/${threadId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: userMessage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Simula un breve delay per il "thinking"
      await new Promise(resolve => setTimeout(resolve, 800));
      setIsThinking(false);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        
        // Aggiorna l'ultimo messaggio con il contenuto in streaming
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: fullResponse,
            isTyping: true
          };
          return newMessages;
        });
      }

      // Segna come completato
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        newMessages[lastIndex].isTyping = false;
        return newMessages;
      });

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: 'Mi dispiace, c\'è stato un errore. Riprova per favore.',
          isTyping: false
        };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
      setIsThinking(false);
    }
  };

  const quickQuestions = [
    "Che misura mi consigli per una camera di 15mq?",
    "Qual è il miglior materasso per dormire bene?",
    "Letto adatto per chi soffre di mal di schiena?",
    "Vantaggi dei letti contenitore"
  ];

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header minimalista */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2.5 rounded-lg">
                <Bed className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Assistente Letti AI</h1>
              <p className="text-xs text-gray-500">Sempre disponibile</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 mt-1">
                  <AnimatedLogo isThinking={message.isTyping} />
                </div>
              )}
              
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.role === 'assistant' && message.isTyping && !message.content ? (
                  <ThinkingAnimation />
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <Markdown>{message.content}</Markdown>
                    {message.isTyping && message.content && (
                      <span className="inline-block w-1 h-4 ml-1 bg-gray-900 animate-pulse"></span>
                    )}
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 mt-1">
                  <div className="bg-indigo-600 p-2.5 rounded-lg">
                    <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-semibold text-indigo-600">
                      U
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Quick Questions - Show only at start */}
          {messages.length === 1 && (
            <div className="space-y-3 pt-4">
              <p className="text-sm text-gray-500 text-center">Domande frequenti:</p>
              <div className="grid grid-cols-1 gap-2">
                {quickQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setInputValue(question)}
                    className="text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all duration-200 text-sm text-gray-700 hover:text-indigo-700"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Scrivi il tuo messaggio..."
                disabled={isLoading || !threadId}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 transition-all"
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim() || !threadId}
              className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-medium"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Premi Invio per inviare • Shift+Invio per andare a capo
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        
        .animate-bounce {
          animation: bounce 1s infinite;
        }
      `}</style>
    </div>
  );
};

export default BedAdvisorChatbot;