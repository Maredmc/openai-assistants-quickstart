"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import styles from "./chat.module.css";
import { AssistantStream } from "openai/lib/AssistantStream";
import Markdown from "react-markdown";
// @ts-expect-error - no types for this yet
import { AssistantStreamEvent } from "openai/resources/beta/assistants/assistants";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";
import ContactForm from "./contact-form";
import ProductCard from "./product-card";
import FloatingContact from "./floating-contact";
import QueueStatus from "./queue-status";
import PriorityModal from "./priority-modal";
import { addToCart, getCart, getCartItemCount } from "../lib/cart";
import { trackAddToCart, trackProductView } from "../lib/shopify-analytics";
import { performanceMonitor } from "../utils/performance-monitor";

type MessageProps = {
  role: "user" | "assistant" | "code";
  text: string;
  showContactForm?: boolean;
  chatHistory?: Array<{ role: string; content: string; timestamp?: string }>;
  onContactDeclined?: () => void;
  showAlternativeOffer?: boolean;
  products?: any[];
  onAddToCart?: (product: any) => void;
};

interface Product {
  id: string;
  name: string;
  price: string;
  description: string;
  images: string[];
  url: string;
  inStock: boolean;
}

type QueueState = {
  isInQueue: boolean;
  pendingMessage: string | null;
  ticketId: string | null;
  statusEndpoint: string | null;
  streamEndpoint: string | null;
  initialPosition: number | null;
  initialQueuedAhead: number | null;
  retryAfter: number | null;
  status: string | null;
  error: string | null;
  hasStreamStarted: boolean;
};

type QueueResponsePayload = {
  ticketId: string;
  position?: number;
  queuedAhead?: number;
  retryAfter?: number;
  statusEndpoint: string;
  streamEndpoint: string;
  message?: string;
};

type QueueTicketStatus = {
  ticketId: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  position: number;
  queuedAhead: number;
  retryAfter?: number;
  enqueuedAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

const INITIAL_QUEUE_STATE: QueueState = {
  isInQueue: false,
  pendingMessage: null,
  ticketId: null,
  statusEndpoint: null,
  streamEndpoint: null,
  initialPosition: null,
  initialQueuedAhead: null,
  retryAfter: null,
  status: null,
  error: null,
  hasStreamStarted: false,
};

const UserBubble = ({ text }: { text: string }) => {
  return <div className={styles.userMessage}>{text}</div>;
};

const AssistantBubble = ({
  text,
  showContactForm,
  chatHistory,
  onContactDeclined,
  showAlternativeOffer,
  products,
  onAddToCart,
}: {
  text: string;
  showContactForm?: boolean;
  chatHistory?: Array<{ role: string; content: string; timestamp?: string }>;
  onContactDeclined?: () => void;
  showAlternativeOffer?: boolean;
  products?: any[];
  onAddToCart?: (product: any) => void;
}) => {
  // Rimuovi i tag [PRODOTTO: id] dal testo visualizzato
  const cleanText = text.replace(/\[PRODOTTO:\s*[^\]]+\]/gi, "").trim();

  return (
    <div className={styles.assistantMessage}>
      <span className={styles.assistantLabel}>Assistente</span>
      
      {/* 🔗 Markdown con link che si aprono in nuova scheda */}
      <Markdown
        components={{
          a: ({ href, children, ...props }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          )
        }}
      >
        {cleanText}
      </Markdown>

      {/* 🛍️ Card prodotti sempre mostrate quando disponibili */}
      {products && products.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            marginTop: "16px",
          }}
        >
          {products.map((product) => {
            // Track product view quando viene mostrato
            if (typeof window !== "undefined") {
              trackProductView(product.id, product.name);
            }

            return (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                description={product.description}
                image={product.images?.[0]}
                url={product.url}
                inStock={product.inStock}
                onAddToCart={() => {
                  if (onAddToCart) {
                    onAddToCart(product);
                  }
                }}
              />
            );
          })}
        </div>
      )}
      
      {(showContactForm || showAlternativeOffer) && chatHistory && (
        <ContactForm 
          chatHistory={chatHistory} 
          onContactDeclined={onContactDeclined}
          showAlternativeOffer={showAlternativeOffer}
        />
      )}
    </div>
  );
};

const LoadingBubble = () => {
  return (
    <div className={styles.assistantMessage}>
      <span className={styles.assistantLabel}>Assistente</span>
      <div className={styles.thinkingDots}>
        <div className={styles.dot}></div>
        <div className={styles.dot}></div>
        <div className={styles.dot}></div>
      </div>
    </div>
  );
};

const CodeBubble = ({ text }: { text: string }) => {
  return (
    <div className={styles.codeMessage}>
      {text.split("\n").map((line, index) => (
        <div key={index}>
          <span>{`${index + 1}. `}</span>
          {line}
        </div>
      ))}
    </div>
  );
};

const Message = ({
  role,
  text,
  showContactForm,
  chatHistory,
  onContactDeclined,
  showAlternativeOffer,
  products,
  onAddToCart,
}: MessageProps) => {
  switch (role) {
    case "user":
      return <UserBubble text={text} />;
    case "assistant":
      return (
        <AssistantBubble
          text={text}
          showContactForm={showContactForm}
          chatHistory={chatHistory}
          onContactDeclined={onContactDeclined}
          showAlternativeOffer={showAlternativeOffer}
          products={products}
          onAddToCart={onAddToCart}
        />
      );
    case "code":
      return <CodeBubble text={text} />;
    default:
      return null;
  }
};

type ChatProps = {
  functionCallHandler?: (
    toolCall: RequiredActionFunctionToolCall
  ) => Promise<string>;
  initialContext?: {
    product?: string;
    price?: string;
    fromShopify?: boolean;
    prefillQuestion?: string;
  } | null;
  onBackToHome?: () => void;
};

const Chat = ({
  functionCallHandler = () => Promise.resolve(""),
  initialContext = null,
  onBackToHome,
}: ChatProps) => {
  // Stati consolidati per performance
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatState, setChatState] = useState({
    inputDisabled: false,
    isLoading: false,
    hasAssistantResponded: false,
    contactDeclined: false,
    showAlternativeOffer: false,
    showFloatingContact: false
  });
  const [threadId, setThreadId] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [responseStartTime, setResponseStartTime] = useState<number | null>(null);
  const [showScrollToEnd, setShowScrollToEnd] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [inactivityCountdown, setInactivityCountdown] = useState(60);
  
  // ⏰ Configurazione timeout inattività
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minuti
  const WARNING_BEFORE_TIMEOUT = 1 * 60 * 1000; // Avviso 1 minuto prima
  
  // 🎯 Stati per sistema di coda - AGGIUNTI
  const [userId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = sessionStorage.getItem('chatUserId');
      if (!id) {
        id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('chatUserId', id);
      }
      return id;
    }
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  });
  const [queueInfo, setQueueInfo] = useState<QueueState>(() => ({
    ...INITIAL_QUEUE_STATE,
  }));
  
  // 🎯 Priority Modal State
  const [showPriorityModal, setShowPriorityModal] = useState(false);

  // Inizializza cart count
  useEffect(() => {
    const cart = getCart();
    setCartCount(getCartItemCount(cart));
  }, []);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const initialPrefillAppliedRef = useRef(false);
  
  // 🎯 Controlla se l'utente è vicino al fondo
  const isUserNearBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;
    const container = messagesContainerRef.current;
    const threshold = 150;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    return isNearBottom;
  }, []);
  
  // 📜 Scroll semplice al fondo
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);
  
  // 🔄 Monitora la posizione dello scroll per decidere se mostrare il bottone
  const handleScroll = useCallback(() => {
    const isNear = isUserNearBottom();
    const shouldShow = !isNear && messages.length > 0 && !chatState.isLoading;
    setShowScrollToEnd(shouldShow);
  }, [isUserNearBottom, messages.length, chatState.isLoading]);
  
  // 🎧 Listener per scroll dell'utente
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);
  
  // ✅ Auto-scroll solo quando l'utente invia un messaggio
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // 🆕 Crea nuovo thread
  const createNewThread = useCallback(async () => {
    const res = await fetch(`/api/assistants/threads`, {
      method: "POST",
    });
    const data = await res.json();
    setThreadId(data.threadId);
    setLastActivityTime(Date.now());
    console.log('🆕 Nuovo thread creato:', data.threadId);
  }, []);

  // 🔄 Inizializza thread al mount
  useEffect(() => {
    createNewThread();
  }, [createNewThread]);

  // ⏰ Monitor inattività - Reset dopo 5 minuti
  useEffect(() => {
    const checkInactivity = setInterval(() => {
      const inactiveTime = Date.now() - lastActivityTime;
      const timeUntilTimeout = INACTIVITY_TIMEOUT - inactiveTime;
      
      // Mostra warning 1 minuto prima del timeout
      if (timeUntilTimeout <= WARNING_BEFORE_TIMEOUT && timeUntilTimeout > 0 && messages.length > 0) {
        setShowInactivityWarning(true);
        setInactivityCountdown(Math.ceil(timeUntilTimeout / 1000));
      } else {
        setShowInactivityWarning(false);
      }
      
      if (inactiveTime > INACTIVITY_TIMEOUT && messages.length > 0) {
        console.log('⏰ Timeout inattività raggiunto - Reset conversazione');
        
        // Reset completo dello stato
        setMessages([]);
        setChatState({
          inputDisabled: false,
          isLoading: false,
          hasAssistantResponded: false,
          contactDeclined: false,
          showAlternativeOffer: false,
          showFloatingContact: false
        });
        setUserInput("");
        setQueueInfo(INITIAL_QUEUE_STATE);
        setShowInactivityWarning(false);
        
        // Crea nuovo thread
        createNewThread();
      }
    }, 1000); // Check ogni secondo per countdown preciso

    return () => clearInterval(checkInactivity);
  }, [lastActivityTime, messages.length, createNewThread, INACTIVITY_TIMEOUT, WARNING_BEFORE_TIMEOUT]);

  // 📝 Aggiorna lastActivityTime ad ogni interazione utente
  const updateActivity = useCallback(() => {
    setLastActivityTime(Date.now());
  }, []);

  /**
   * 📊 Controlla status priority utente
   */
  const checkPriorityStatus = useCallback(async () => {
    if (!userId) {
      return;
    }
    try {
      const response = await fetch('/api/priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'status',
          userId,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.hasPriority) {
        console.log('✅ Priority access active!', data.user);
      }
    } catch (err) {
      console.error('Failed to check priority status:', err);
    }
  }, [userId]);

  // 🎯 Check priority status on mount
  useEffect(() => {
    void checkPriorityStatus();
  }, [checkPriorityStatus]);

  const adjustInputHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = 180;
    const minHeight = 44;
    const next = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
    el.style.height = `${next}px`;
  }, []);

  const handlePrefillQuestion = useCallback((text: string) => {
    setUserInput(text);
    updateActivity();
    requestAnimationFrame(() => {
      adjustInputHeight();
      inputRef.current?.focus();
    });
  }, [adjustInputHeight, updateActivity]);

  useEffect(() => {
    adjustInputHeight();
  }, [userInput, adjustInputHeight]);

  useEffect(() => {
    const applyInitialPrefill = initialContext?.prefillQuestion?.trim();
    if (!applyInitialPrefill || initialPrefillAppliedRef.current) {
      return;
    }
    handlePrefillQuestion(applyInitialPrefill);
    initialPrefillAppliedRef.current = true;
  }, [initialContext, handlePrefillQuestion]);

  useEffect(() => {
    const handleIncomingPrefill = (event: MessageEvent) => {
      const payload = event.data;
      if (
        !payload ||
        typeof payload !== "object" ||
        payload.type !== "NABE_PREFILL_QUESTION" ||
        typeof payload.text !== "string"
      ) {
        return;
      }
      handlePrefillQuestion(payload.text);
    };

    window.addEventListener("message", handleIncomingPrefill);
    return () => window.removeEventListener("message", handleIncomingPrefill);
  }, [handlePrefillQuestion]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "NABE_CHAT_READY" }, "*");
    }
  }, []);

  const handleQueueStatusUpdate = useCallback((status: QueueTicketStatus) => {
    setQueueInfo((prev) => {
      if (!prev.isInQueue || prev.ticketId !== status.ticketId) {
        return prev;
      }

      return {
        ...prev,
        status: status.status,
        retryAfter: status.retryAfter ?? prev.retryAfter,
        initialPosition:
          prev.initialPosition ?? (status.position > 0 ? status.position : prev.initialPosition),
        initialQueuedAhead:
          prev.initialQueuedAhead ?? status.queuedAhead,
        error: status.errorMessage ?? null,
      };
    });
  }, []);

  const internalSendMessage = async (text: string) => {
    if (!threadId) {
      console.warn("Thread non pronto, messaggio ignorato.");
      return;
    }

    const startTime = performanceMonitor.startChatResponse();
    setResponseStartTime(startTime);
    
    const productKeywords = ['letto', 'prodotto', 'prezzo', 'costo', 'catalogo', 'modello', 'disponibilità', 'montessori', 'bambino', 'sponde', 'materasso'];
    const hasProductQuery = productKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );

    try {
      // 🎯 Includi userId per tracking coda
      const response = await fetch(
        `/api/assistants/threads/${threadId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            content: text,
            userId: userId,
          }),
        }
      );

      if (response.status === 202) {
        let queueData: QueueResponsePayload | null = null;
        try {
          queueData = (await response.json()) as QueueResponsePayload;
        } catch {
          throw new Error(
            "Non sono riuscito a recuperare le informazioni sulla coda. Riprova tra qualche istante."
          );
        }

        if (
          !queueData ||
          !queueData.ticketId ||
          !queueData.streamEndpoint ||
          !queueData.statusEndpoint
        ) {
          throw new Error(
            "Le informazioni restituite dalla coda non sono valide."
          );
        }

        setQueueInfo({
          ...INITIAL_QUEUE_STATE,
          isInQueue: true,
          pendingMessage: text,
          ticketId: queueData.ticketId,
          statusEndpoint: queueData.statusEndpoint,
          streamEndpoint: queueData.streamEndpoint,
          initialPosition: queueData.position ?? null,
          initialQueuedAhead: queueData.queuedAhead ?? null,
          retryAfter: queueData.retryAfter ?? null,
          status: "queued",
          hasStreamStarted: false,
        });

        setChatState((prev) => ({ ...prev, isLoading: false }));

        if (hasProductQuery) {
          fetchProductsInBackground();
        }

        void fetchQueuedStream(queueData);
        return;
      }

      // 🚨 Gestione errori specifici (sovraccarico, timeout)
      if (!response.ok) {
        let errorMessage = "Mi dispiace, ho avuto un problema tecnico. Prova di nuovo tra qualche istante.";
        
        try {
          const errorData = await response.json();

          if (response.status === 503 || errorData.code === 'QUEUE_FULL' || errorData.code === 'SYSTEM_OVERLOADED') {
            // 🎯 Sistema sovraccarico - Mostra priority modal
            console.log('🚦 Sistema sovraccarico - Mostra priority modal');
            
            // Mostra modal priority
            setShowPriorityModal(true);
            
            setQueueInfo({
              ...INITIAL_QUEUE_STATE,
              isInQueue: true,
              pendingMessage: text,
              error: 'Sistema sovraccarico. Registrati per accesso prioritario!',
            });
            
            setChatState(prev => ({ ...prev, inputDisabled: false, isLoading: false }));
            return;
          } else if (response.status === 408 || errorData.code === 'TIMEOUT') {
            errorMessage = "⏱️ La richiesta ha impiegato troppo tempo. Il sistema è sotto carico, riprova tra qualche secondo.";
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Se non riusciamo a parsare l'errore, usa messaggio generico
        }

        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error("Risposta vuota dal server");
      }

      const stream = AssistantStream.fromReadableStream(response.body);
      handleReadableStream(stream);
    } catch (error) {
      console.error("Errore durante l'invio del messaggio:", error);
      performanceMonitor.endChatResponse(startTime);
      setResponseStartTime(null);

      const errorMessage = error instanceof Error
        ? error.message
        : "Mi dispiace, ho avuto un problema tecnico. Prova di nuovo tra qualche istante o contattaci su hello@nabecreation.com.";

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant",
          text: errorMessage,
        },
      ]);
      setChatState((prev) => ({
        ...prev,
        inputDisabled: false,
        isLoading: false,
      }));
      performanceMonitor.recordApiError("assistant-run", error instanceof Error ? error.message : "Unknown error");
      return;
    }

    // FETCH PRODOTTI IN BACKGROUND
    if (hasProductQuery) {
      fetchProductsInBackground();
    }
  };

  const sendMessage = internalSendMessage;

  const fetchProductsInBackground = async () => {
    try {
      console.log('🛍️ [Background] Fetching products for future responses...');
      const response = await fetch('/api/products?action=list', {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ [Background] Products cached: ${data.products?.length || 0} items`);
        performanceMonitor.recordCacheHit();
      } else {
        performanceMonitor.recordCacheMiss();
      }
    } catch (error: any) {
      console.warn('⚠️ [Background] Products fetch failed (non-blocking):', error.message);
      performanceMonitor.recordApiError('products', error.message);
    }
  };

  const submitActionResult = async (runId: any, toolCallOutputs: any) => {
    const response = await fetch(
      `/api/assistants/threads/${threadId}/actions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runId: runId,
          toolCallOutputs: toolCallOutputs,
        }),
      }
    );
    const stream = AssistantStream.fromReadableStream(response.body);
    handleReadableStream(stream);
  };

  const processUserMessage = () => {
    const outboundText = userInput.trim();
    if (!outboundText || chatState.inputDisabled) return;
    if (!threadId) {
      console.warn("Thread non pronto, attendi qualche istante prima di inviare.");
      return;
    }
    
    // 📝 Aggiorna attività utente
    updateActivity();

    const refusalKeywords = ['no grazie', 'non voglio', 'non interessato', 'no thanks', 'non ora', 'magari dopo', 'non mi interessa', 'non ho bisogno', 'preferirei di no', 'non adesso'];
    const contactKeywords = ['contatto', 'contattare', 'preventivo', 'modulo', 'email', 'telefono', 'ricontattare', 'chiamare'];
    const userInputLower = outboundText.toLowerCase();
    const hasRefused = refusalKeywords.some(keyword => userInputLower.includes(keyword));
    const wantsContact = contactKeywords.some(keyword => userInputLower.includes(keyword));
    
    if (hasRefused && !chatState.contactDeclined) {
      setChatState(prev => ({ ...prev, showAlternativeOffer: true }));
    }
    
    if (wantsContact && chatState.contactDeclined) {
      setChatState(prev => ({ ...prev, contactDeclined: false, showAlternativeOffer: false }));
    }
    
    sendMessage(outboundText);
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", text: outboundText },
    ]);
    setUserInput("");
    setChatState(prev => ({ ...prev, inputDisabled: true, isLoading: true }));
    
    setShowScrollToEnd(false);
    
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
        adjustInputHeight();
      }
    });
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    processUserMessage();
  };

  const handleTextCreated = () => {
    appendMessage("assistant", "");
    if (!chatState.hasAssistantResponded) {
      setChatState(prev => ({ ...prev, hasAssistantResponded: true }));
    }
  };

  const handleTextDelta = (delta: any) => {
    if (delta.value != null) {
      appendToLastMessage(delta.value);
    }
    if (delta.annotations != null) {
      annotateLastMessage(delta.annotations);
    }
  };

  const handleImageFileDone = (image: any) => {
    appendToLastMessage(`\n![${image.file_id}](/api/files/${image.file_id})\n`);
  };

  const toolCallCreated = (toolCall: any) => {
    if (toolCall.type != "code_interpreter") return;
    appendMessage("code", "");
  };

  const toolCallDelta = (delta: any, snapshot: any) => {
    if (delta.type != "code_interpreter") return;
    if (!delta.code_interpreter.input) return;
    appendToLastMessage(delta.code_interpreter.input);
  };

  const handleRequiresAction = async (
    event: AssistantStreamEvent.ThreadRunRequiresAction
  ) => {
    const runId = event.data.id;
    const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;
    const toolCallOutputs = await Promise.all(
      toolCalls.map(async (toolCall: any) => {
        const result = await functionCallHandler(toolCall);
        return { output: result, tool_call_id: toolCall.id };
      })
    );
    setChatState(prev => ({ ...prev, inputDisabled: true }));
    submitActionResult(runId, toolCallOutputs);
  };

  const handleRunCompleted = async () => {
    if (responseStartTime) {
      performanceMonitor.endChatResponse(responseStartTime);
      setResponseStartTime(null);
    }
    
    setChatState(prev => ({ ...prev, inputDisabled: false, isLoading: false }));
    setQueueInfo(() => ({ ...INITIAL_QUEUE_STATE }));
    
    setTimeout(() => {
      if (!isUserNearBottom()) {
        setShowScrollToEnd(true);
      }
    }, 500);
    
    setTimeout(async () => {
      setMessages((prevMessages) => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.text) {
          extractAndFetchProducts(lastMessage.text).then((products) => {
            if (products.length > 0) {
              console.log(`✅ Found ${products.length} products in AI response:`, products.map((p: any) => p.name));
              console.log('🎯 Showing product cards instead of text links');
              setMessages((msgs) => {
                const lastMsg: any = msgs[msgs.length - 1];
                if (lastMsg.role === 'assistant') {
                  return [
                    ...msgs.slice(0, -1),
                    { ...lastMsg, products: products }
                  ];
                }
                return msgs;
              });
            } else {
              console.log('⚠️ No products found in AI response - showing text only');
            }
          });
        }
        
        return prevMessages;
      });
    }, 100);
  };

  const handleReadableStream = (stream: AssistantStream) => {
    stream.on("textCreated", handleTextCreated);
    stream.on("textDelta", handleTextDelta);
    stream.on("imageFileDone", handleImageFileDone);
    stream.on("toolCallCreated", toolCallCreated);
    stream.on("toolCallDelta", toolCallDelta);

    stream.on("event", (event) => {
      if (event.event === "thread.run.requires_action")
        handleRequiresAction(event);
      if (event.event === "thread.run.completed") handleRunCompleted();
    });
  };

  const fetchQueuedStream = async (payload: QueueResponsePayload) => {
    setQueueInfo((prev) => {
      if (!prev.isInQueue || prev.ticketId !== payload.ticketId || prev.hasStreamStarted) {
        return prev;
      }
      return {
        ...prev,
        hasStreamStarted: true,
      };
    });

    try {
      const response = await fetch(payload.streamEndpoint);

      if (!response.ok) {
        let message = "Errore nel recupero della risposta dalla coda.";
        try {
          const errorPayload = await response.clone().json();
          if (errorPayload?.error) {
            message = errorPayload.error;
          }
        } catch {
          try {
            message = await response.text();
          } catch {
            // fallback al messaggio di default
          }
        }
        throw new Error(message);
      }

      if (!response.body) {
        throw new Error("Stream non disponibile per questo ticket.");
      }

      setQueueInfo((prev) => ({
        ...prev,
        isInQueue: false,
        pendingMessage: null,
        status: "processing",
      }));

      setChatState((prev) => ({ ...prev, isLoading: true }));

      const stream = AssistantStream.fromReadableStream(response.body);
      handleReadableStream(stream);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Non sono riuscito a completare la richiesta. Riprova tra qualche istante.";

      setQueueInfo({ ...INITIAL_QUEUE_STATE, error: message });
      setChatState((prev) => ({ ...prev, inputDisabled: false, isLoading: false }));

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: message,
        },
      ]);

      performanceMonitor.recordApiError(
        "assistant-queue",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  };

  const appendToLastMessage = (text: string) => {
    setMessages((prevMessages: any) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      const updatedLastMessage = {
        ...lastMessage,
        text: lastMessage.text + text,
      };
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });
  };

  const extractAndFetchProducts = async (text: string) => {
    try {
      console.log('🔍 Searching for [PRODOTTO: handle] tags in text...');
      
      const productTagRegex = /\[PRODOTTO:\s*([^\]]+)\]/gi;
      const matches = Array.from(text.matchAll(productTagRegex));
      
      if (matches.length === 0) {
        console.log('⚠️ No [PRODOTTO: handle] tags found in AI response');
        return [];
      }
      
      console.log(`🎯 Found ${matches.length} product tags:`, matches.map(m => m[1]));
      
      const productHandles = matches.map(match => match[1].trim());
      
      const response = await fetch('/api/products?action=list');
      if (!response.ok) {
        console.error('❌ Products API failed');
        return [];
      }
      
      const data = await response.json();
      if (!data.success || !data.products) {
        console.error('❌ No products in API response');
        return [];
      }
      
      console.log(`📦 Total products available: ${data.products.length}`);
      
      const foundProducts = productHandles
        .map(handle => {
          const product = data.products.find((p: Product) => p.id === handle);
          if (product) {
            console.log(`✅ Found product by handle: ${product.name} (${handle})`);
            console.log(`🔗 Product URL: ${product.url}`);
          } else {
            console.log(`❌ Product not found by handle: ${handle}`);
            const availableHandles = data.products.slice(0, 3).map((p: any) => p.id);
            console.log('🔍 Sample available handles:', availableHandles);
          }
          return product;
        })
        .filter(Boolean);
      
      console.log(`✅ Total products to display as cards: ${foundProducts.length}`);
      
      return foundProducts.slice(0, 6);
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      return [];
    }
  };

  const appendMessage = (role: string, text: string) => {
    setMessages((prevMessages: any) => [...prevMessages, { role, text }]);
  };

  const handleContactDeclined = () => {
    setChatState(prev => ({ 
      ...prev, 
      contactDeclined: true, 
      showAlternativeOffer: false, 
      showFloatingContact: true 
    }));
    setTimeout(() => {
      setChatState(prev => ({ ...prev, showAlternativeOffer: true }));
    }, 30000);
  };

  const getChatHistory = () => {
    return messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.text,
      timestamp: new Date().toISOString()
    }));
  };

  const handleFloatingContactSuccess = () => {
    setChatState(prev => ({ 
      ...prev, 
      showFloatingContact: false,
      contactDeclined: false,
      showAlternativeOffer: false
    }));
  };

  const handleAddToCart = (product: any) => {
    try {
      addToCart({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || '/logo_nabè.png',
        url: product.url
      });
      
      const cart = getCart();
      setCartCount(getCartItemCount(cart));
      
      trackAddToCart(product.id, product.name, 1);
      
      console.log('✅ Prodotto aggiunto al carrello:', product.name);
      alert(`✅ ${product.name} aggiunto al carrello!`);
    } catch (error) {
      console.error('❌ Errore aggiunta al carrello:', error);
      alert('❌ Errore durante l\'aggiunta al carrello');
    }
  };

  /**
   * 🎯 Handler per successo registrazione priority
   */
  const handlePrioritySuccess = () => {
    setShowPriorityModal(false);
    void checkPriorityStatus();
    
    // Riprova messaggio pendente se presente
    if (queueInfo.pendingMessage) {
      const message = queueInfo.pendingMessage;
      setQueueInfo(INITIAL_QUEUE_STATE);
      setTimeout(() => {
        sendMessage(message);
      }, 500);
    }
  };

  const annotateLastMessage = (annotations: any) => {
    setMessages((prevMessages: any) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      const updatedLastMessage = {
        ...lastMessage,
      };
      annotations.forEach((annotation: any) => {
        if (annotation.type === 'file_path') {
          updatedLastMessage.text = updatedLastMessage.text.replaceAll(
            annotation.text,
            `/api/files/${annotation.file_path.file_id}`
          );
        }
      });
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });
  };

  return (
    <div className={styles.chatContainer} style={{ position: 'relative' }}>
      {/* 🌑 Overlay scuro quando coda è attiva */}
      {queueInfo.isInQueue && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          backdropFilter: 'blur(3px)'
        }} />
      )}
      
      <div className={styles.chatHeader}>
        <div className={styles.chatHeaderContent}>
          <div className={styles.chatHeaderIdentity}>
            <div className={styles.chatHeaderIcon}>
              <Image
                src="/logo_nabè.png"
                alt="Logo Nabè"
                width={24}
                height={24}
              />
            </div>
            <div className={styles.chatHeaderText}>
              <span className={styles.chatHeaderTitle}>Assistente AI di Nabè</span>
              <span className={styles.chatHeaderSubtitle}>Sempre a tua disposizione</span>
            </div>
          </div>
          <div className={styles.chatHeaderStatus}>
            {onBackToHome && (
              <button className={styles.backToHomeButton} onClick={onBackToHome} title="Torna alla selezione modalità">
                ← Indietro
              </button>
            )}
            <span className={styles.chatHeaderBadge}>vers. Beta</span>
          </div>
        </div>
      </div>
      
      <div className={styles.messages} ref={messagesContainerRef}>
        {messages.length === 0 && (
          <div className={styles.welcomeMessage}>
            {initialContext?.fromShopify ? (
              <>
                <h2>👋 Ciao! Vedo che stai guardando {initialContext.product || 'un nostro prodotto'}</h2>
                <p>
                  Perfetto! Sono l&apos;assistente AI di Nabè e posso aiutarti con qualsiasi domanda su questo prodotto 
                  o consigliarti alternative perfette per le tue esigenze.
                </p>
                <div className={styles.quickQuestions}>
                  <p className={styles.quickQuestionsTitle}>
                    Ecco alcune domande che potresti volermi fare:
                  </p>
                  <button
                    onClick={() =>
                      handlePrefillQuestion(`Mi puoi dare più informazioni su ${initialContext.product || 'questo prodotto'}?`)
                    }
                    className={styles.quickQuestion}
                  >
                    Mi puoi dare più informazioni su {initialContext.product || 'questo prodotto'}?
                  </button>
                  <button
                    onClick={() =>
                      handlePrefillQuestion("È adatto per un bambino di [età]? Come si configura?")
                    }
                    className={styles.quickQuestion}
                  >
                    È adatto per un bambino di [età]? Come si configura?
                  </button>
                  <button
                    onClick={() =>
                      handlePrefillQuestion("Ci sono alternative o accessori che consigli?")
                    }
                    className={styles.quickQuestion}
                  >
                    Ci sono alternative o accessori che consigli?
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>Benvenutə in Nabè</h2>
                <p>
                  Sono il tuo consulente specializzato per trovare il letto
                  perfetto per il tuo bambino. Insieme creeremo il rifugio dei
                  sogni ideale!
                </p>
                <div className={styles.quickQuestions}>
                  <p className={styles.quickQuestionsTitle}>
                    Iniziamo con queste domande:
                  </p>
                  <button
                    onClick={() =>
                      handlePrefillQuestion("Ho un bambino di età compresa tra 0 e 3 anni, che letto mi consigli?")
                    }
                    className={styles.quickQuestion}
                  >
                    Ho un bambino di età compresa tra 0 e 3 anni, che letto mi consigli?
                  </button>
                  <button
                    onClick={() =>
                      handlePrefillQuestion("Ho un bambino di età superiore ai 3 anni, che letto mi consigli?")
                    }
                    className={styles.quickQuestion}
                  >
                    Ho un bambino di età superiore ai 3 anni, che letto mi consigli?
                  </button>
                  <button
                    onClick={() =>
                      handlePrefillQuestion(
                        "Ho due bambini, cosa mi consigli di fare?"
                      )
                    }
                    className={styles.quickQuestion}
                  >
                    Ho due bambini, cosa mi consigli di fare?
                  </button>
                  <button
                    onClick={() =>
                      handlePrefillQuestion(
                        "La cameretta è piccola, che dimensioni mi consigli?"
                      )
                    }
                    className={styles.quickQuestion}
                  >
                    La cameretta è piccola, che dimensioni mi consigli?
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {messages.map((msg: any, index: number) => {
          const isAssistant = msg.role === "assistant";
          const isUser = msg.role === "user";
          const rowClass = [
            styles.messageRow,
            isAssistant ? styles.assistantRow : "",
            isUser ? styles.userRow : "",
          ]
            .filter(Boolean)
            .join(" ");

          const isLastAssistantMessage =
            isAssistant &&
            chatState.hasAssistantResponded &&
            !chatState.isLoading &&
            index === messages.length - 1;

          const shouldShowContactForm =
            isLastAssistantMessage &&
            !chatState.contactDeclined &&
            !chatState.showAlternativeOffer;
          const shouldShowAlternative =
            isLastAssistantMessage && chatState.showAlternativeOffer;

          return (
            <div key={index} className={rowClass}>
              {isAssistant && (
                <div className={styles.avatarAssistant}>
                  <Image
                    src="/logo_nabè.png"
                    alt="Assistente Nabè"
                    width={28}
                    height={28}
                  />
                </div>
              )}
              {isUser && (
                <div className={styles.avatarUser} aria-hidden="true">
                  Tu
                </div>
              )}
              {!isAssistant && !isUser && (
                <div className={styles.avatarCode} aria-hidden="true">
                  {"</>"}
                </div>
              )}
              <div className={styles.messageBubble}>
                <Message
                  role={msg.role}
                  text={msg.text}
                  showContactForm={shouldShowContactForm}
                  chatHistory={
                    shouldShowContactForm ? getChatHistory() : undefined
                  }
                  onContactDeclined={handleContactDeclined}
                  showAlternativeOffer={shouldShowAlternative}
                  products={msg.products}
                  onAddToCart={handleAddToCart}
                />
              </div>
            </div>
          );
        })}

        {chatState.isLoading && (
          <div className={`${styles.messageRow} ${styles.assistantRow}`}>
            <div className={styles.avatarAssistant}>
              <Image
                src="/logo_nabè.png"
                alt="Assistente Nabè"
                width={28}
                height={28}
              />
            </div>
            <div className={styles.messageBubble}>
              <LoadingBubble />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 🎯 Componente Coda - Mostra posizione quando utente è in coda */}
      {queueInfo.isInQueue && queueInfo.ticketId && queueInfo.statusEndpoint && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1001,
          width: '90%',
          maxWidth: '400px'
        }}>
          <QueueStatus 
            ticketId={queueInfo.ticketId}
            statusEndpoint={queueInfo.statusEndpoint}
            initialPosition={queueInfo.initialPosition ?? 1}
            initialQueuedAhead={
              queueInfo.initialQueuedAhead ??
              Math.max(0, (queueInfo.initialPosition ?? 1) - 1)
            }
            retryAfterHint={queueInfo.retryAfter}
            onStatus={handleQueueStatusUpdate}
          />
        </div>
      )}

      {/* 🎯 Priority Modal - Registrazione per accesso prioritario */}
      <PriorityModal
        userId={userId}
        isVisible={showPriorityModal}
        onClose={() => setShowPriorityModal(false)}
        onSuccess={handlePrioritySuccess}
        trigger="queue"
      />
      
      {/* 📍 Bottone "Vai alla fine del messaggio" */}
      {showScrollToEnd && !queueInfo.isInQueue && (
        <div 
          className={styles.scrollToEndButton}
          onClick={() => {
            scrollToBottom();
            setShowScrollToEnd(false);
          }}
          style={{
            position: 'absolute',
            bottom: '90px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg,#79aea3,#5a9d8f)',
            color: 'white',
            border: 'none',
            borderRadius: '25px',
            padding: '12px 20px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: 1000,
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap'
          }}
          title="Vai alla fine del messaggio"
        >
          <span>Vai alla fine</span>
          <span style={{ fontSize: '16px' }}>↓</span>
        </div>
      )}
      
      <div className={styles.composer}>
        <FloatingContact 
          chatHistory={getChatHistory()}
          isVisible={chatState.showFloatingContact}
          onSuccess={handleFloatingContactSuccess}
        />
        
        <form onSubmit={handleSubmit} className={styles.inputForm}>
          <textarea
            ref={inputRef}
            rows={1}
            className={styles.input}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onInput={adjustInputHeight}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                processUserMessage();
              }
            }}
            placeholder={queueInfo.isInQueue ? "In attesa in coda..." : "Scrivi il tuo messaggio..."}
            disabled={queueInfo.isInQueue}
          />
          <button
            type="submit"
            className={styles.button}
            disabled={chatState.inputDisabled || queueInfo.isInQueue}
          >
            {queueInfo.isInQueue ? 'In coda...' : 'Invia'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
