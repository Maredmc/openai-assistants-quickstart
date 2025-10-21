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
};

const Chat = ({
  functionCallHandler = () => Promise.resolve(""),
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

  // Inizializza cart count
  useEffect(() => {
    const cart = getCart();
    setCartCount(getCartItemCount(cart));
  }, []);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  
  // 🎯 Controlla se l'utente è vicino al fondo
  const isUserNearBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;
    const container = messagesContainerRef.current;
    const threshold = 150; // pixels dal fondo
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
    // Mostra il bottone solo se:
    // 1. L'utente non è vicino al fondo E
    // 2. C'è almeno un messaggio dell'assistente E
    // 3. L'assistente non sta attualmente scrivendo (per evitare flickering)
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
  
  // ✅ Auto-scroll solo quando:
  // 1. L'utente invia un messaggio
  // 2. L'assistente INIZIA a rispondere (non durante)
  // 3. L'utente clicca il bottone per andare al fondo
  useEffect(() => {
    // Auto-scroll solo per i messaggi dell'utente, non durante la scrittura del bot
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const createThread = async () => {
      const res = await fetch(`/api/assistants/threads`, {
        method: "POST",
      });
      const data = await res.json();
      setThreadId(data.threadId);
    };
    createThread();
  }, []);

  const adjustInputHeight = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = 180;
    const minHeight = 44;
    const next = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
    el.style.height = `${next}px`;
  };

  useEffect(() => {
    adjustInputHeight();
  }, [userInput]);

  const sendMessage = async (text: string) => {
    if (!threadId) {
      console.warn("Thread non pronto, messaggio ignorato.");
      return;
    }

    // Inizia monitoraggio performance
    const startTime = performanceMonitor.startChatResponse();
    setResponseStartTime(startTime);
    // Rileva query prodotti
    const productKeywords = ['letto', 'prodotto', 'prezzo', 'costo', 'catalogo', 'modello', 'disponibilità', 'montessori', 'bambino', 'sponde', 'materasso'];
    const hasProductQuery = productKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );

    try {
      const response = await fetch(
        `/api/assistants/threads/${threadId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            content: text,
          }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error(`Richiesta fallita con status ${response.status}`);
      }

      const stream = AssistantStream.fromReadableStream(response.body);
      handleReadableStream(stream);
    } catch (error) {
      console.error("Errore durante l'invio del messaggio:", error);
      performanceMonitor.endChatResponse(startTime);
      setResponseStartTime(null);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant",
          text: "Mi dispiace, ho avuto un problema tecnico. Prova di nuovo tra qualche istante o contattaci su hello@nabecreation.com.",
        },
      ]);
      setChatState((prev) => ({
        ...prev,
        inputDisabled: false,
        isLoading: false,
      }));
      performanceMonitor.recordApiError("assistant-run", error.message);
      return;
    }

    // FETCH PRODOTTI IN BACKGROUND - Non bloccante
    if (hasProductQuery) {
      fetchProductsInBackground();
    }
  };

  // Fetch prodotti in background senza bloccare l'UI
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
    } catch (error) {
      console.warn('⚠️ [Background] Products fetch failed (non-blocking):', error.message);
      performanceMonitor.recordApiError('products', error.message);
    }
  };

  const submitActionResult = async (runId, toolCallOutputs) => {
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

  const handlePrefillQuestion = (text: string) => {
    setUserInput(text);
    requestAnimationFrame(() => {
      adjustInputHeight();
      inputRef.current?.focus();
    });
  };

  const processUserMessage = () => {
    const outboundText = userInput.trim();
    if (!outboundText || chatState.inputDisabled) return;
    if (!threadId) {
      console.warn("Thread non pronto, attendi qualche istante prima di inviare.");
      return;
    }

    // Controlla se l'utente sta rifiutando di essere contattato
    const refusalKeywords = ['no grazie', 'non voglio', 'non interessato', 'no thanks', 'non ora', 'magari dopo', 'non mi interessa', 'non ho bisogno', 'preferirei di no', 'non adesso'];
    const contactKeywords = ['contatto', 'contattare', 'preventivo', 'modulo', 'email', 'telefono', 'ricontattare', 'chiamare'];
    const userInputLower = outboundText.toLowerCase();
    const hasRefused = refusalKeywords.some(keyword => userInputLower.includes(keyword));
    const wantsContact = contactKeywords.some(keyword => userInputLower.includes(keyword));
    
    if (hasRefused && !chatState.contactDeclined) {
      setChatState(prev => ({ ...prev, showAlternativeOffer: true }));
    }
    
    // Se l'utente chiede esplicitamente di essere contattato, riattiva il sistema
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
    
    // Nascondi il bottone scroll quando l'utente invia un messaggio
    setShowScrollToEnd(false);
    
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
        adjustInputHeight();
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    processUserMessage();
  };

  const handleTextCreated = () => {
    appendMessage("assistant", "");
    if (!chatState.hasAssistantResponded) {
      setChatState(prev => ({ ...prev, hasAssistantResponded: true }));
    }
  };

  const handleTextDelta = (delta) => {
    if (delta.value != null) {
      appendToLastMessage(delta.value);
    };
    if (delta.annotations != null) {
      annotateLastMessage(delta.annotations);
    }
  };

  const handleImageFileDone = (image) => {
    appendToLastMessage(`\n![${image.file_id}](/api/files/${image.file_id})\n`);
  }

  const toolCallCreated = (toolCall) => {
    if (toolCall.type != "code_interpreter") return;
    appendMessage("code", "");
  };

  const toolCallDelta = (delta, snapshot) => {
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
      toolCalls.map(async (toolCall) => {
        const result = await functionCallHandler(toolCall);
        return { output: result, tool_call_id: toolCall.id };
      })
    );
    setChatState(prev => ({ ...prev, inputDisabled: true }));
    submitActionResult(runId, toolCallOutputs);
  };

  const handleRunCompleted = async () => {
    // Completa monitoraggio performance
    if (responseStartTime) {
      performanceMonitor.endChatResponse(responseStartTime);
      setResponseStartTime(null);
    }
    
    setChatState(prev => ({ ...prev, inputDisabled: false, isLoading: false }));
    
    // Mostra il bottone scroll alla fine del messaggio se l'utente non è in fondo
    setTimeout(() => {
      if (!isUserNearBottom()) {
        setShowScrollToEnd(true);
      }
    }, 500);
    
    // 🛍️ PRIORITÀ ALLE CARD PRODOTTO: Cerca sempre prodotti nei messaggi AI
    setTimeout(async () => {
      setMessages((prevMessages) => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.text) {
          // Cerca prodotti SEMPRE per mostrare le belle card invece dei link testuali
          extractAndFetchProducts(lastMessage.text).then((products) => {
            if (products.length > 0) {
              console.log(`✅ Found ${products.length} products in AI response:`, products.map(p => p.name));
              console.log('🎯 Showing product cards instead of text links');
              setMessages((msgs) => {
                const lastMsg = msgs[msgs.length - 1];
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

  const appendToLastMessage = (text) => {
    setMessages((prevMessages) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      const updatedLastMessage = {
        ...lastMessage,
        text: lastMessage.text + text,
      };
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });
  };

  // 🛍️ FUNZIONE MIGLIORATA: Ricerca prodotti per handle Shopify
  const extractAndFetchProducts = async (text: string) => {
    try {
      console.log('🔍 Searching for [PRODOTTO: handle] tags in text...');
      
      // Cerca tag [PRODOTTO: handle] nel testo
      const productTagRegex = /\[PRODOTTO:\s*([^\]]+)\]/gi;
      const matches = Array.from(text.matchAll(productTagRegex));
      
      if (matches.length === 0) {
        console.log('⚠️ No [PRODOTTO: handle] tags found in AI response');
        return [];
      }
      
      console.log(`🎯 Found ${matches.length} product tags:`, matches.map(m => m[1]));
      
      // Estrai gli handle dei prodotti
      const productHandles = matches.map(match => match[1].trim());
      
      // Fetch tutti i prodotti da Shopify
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
      
      // 🎯 MATCHING PERFETTO: l'id è già l'handle di Shopify
      const foundProducts = productHandles
        .map(handle => {
          const product = data.products.find((p: Product) => p.id === handle);
          if (product) {
            console.log(`✅ Found product by handle: ${product.name} (${handle})`);
            console.log(`🔗 Product URL: ${product.url}`);
          } else {
            console.log(`❌ Product not found by handle: ${handle}`);
            // Debug: mostra alcuni handle disponibili per debugging
            const availableHandles = data.products.slice(0, 3).map(p => p.id);
            console.log('🔍 Sample available handles:', availableHandles);
          }
          return product;
        })
        .filter(Boolean); // Rimuovi null/undefined
      
      console.log(`✅ Total products to display as cards: ${foundProducts.length}`);
      
      return foundProducts.slice(0, 6); // Max 6 prodotti per performance
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      return [];
    }
  };

  const appendMessage = (role, text) => {
    setMessages((prevMessages) => [...prevMessages, { role, text }]);
  };

  // Funzioni per gestire il rifiuto del contatto
  const handleContactDeclined = () => {
    setChatState(prev => ({ 
      ...prev, 
      contactDeclined: true, 
      showAlternativeOffer: false, 
      showFloatingContact: true 
    }));
    // Dopo 30 secondi, riattiva l'offerta alternativa
    setTimeout(() => {
      setChatState(prev => ({ ...prev, showAlternativeOffer: true }));
    }, 30000); // Aumentato a 30 secondi per dare più spazio
  };

  // Funzione per convertire i messaggi in formato cronologia chat
  const getChatHistory = () => {
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.text,
      timestamp: new Date().toISOString()
    }));
  };

  // Gestisce successo del form floating contact
  const handleFloatingContactSuccess = () => {
    setChatState(prev => ({ 
      ...prev, 
      showFloatingContact: false,
      contactDeclined: false,
      showAlternativeOffer: false
    }));
  };

  // Gestisci aggiunta al carrello
  const handleAddToCart = (product: any) => {
    try {
      addToCart({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || '/logo_nabè.png',
        url: product.url
      });
      
      // Aggiorna count locale
      const cart = getCart();
      setCartCount(getCartItemCount(cart));
      
      // Track analytics Shopify
      trackAddToCart(product.id, product.name, 1);
      
      // Mostra notifica
      console.log('✅ Prodotto aggiunto al carrello:', product.name);
      alert(`✅ ${product.name} aggiunto al carrello!`);
    } catch (error) {
      console.error('❌ Errore aggiunta al carrello:', error);
      alert('❌ Errore durante l\'aggiunta al carrello');
    }
  };

  const annotateLastMessage = (annotations) => {
    setMessages((prevMessages) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      const updatedLastMessage = {
        ...lastMessage,
      };
      annotations.forEach((annotation) => {
        if (annotation.type === 'file_path') {
          updatedLastMessage.text = updatedLastMessage.text.replaceAll(
            annotation.text,
            `/api/files/${annotation.file_path.file_id}`
          );
        }
      })
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });
  }

  return (
    <div className={styles.chatContainer} style={{ position: 'relative' }}>
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
            <span className={styles.chatHeaderBadge}>vers. Beta</span>
          </div>
        </div>
      </div>
      <div className={styles.messages} ref={messagesContainerRef}>
          {messages.length === 0 && (
            <div className={styles.welcomeMessage}>
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
                    handlePrefillQuestion("Ho un bambino di 3 anni, che letto mi consigli?")
                  }
                  className={styles.quickQuestion}
                >
                  Ho un bambino di 3 anni, che letto mi consigli?
                </button>
                <button
                  onClick={() =>
                    handlePrefillQuestion(
                      "Ho due figli di 4 e 7 anni, cosa mi consigli di fare?"
                    )
                  }
                  className={styles.quickQuestion}
                >
                  Ho due figli di 4 e 7 anni, cosa mi consigli di fare?
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
            </div>
          )}

          {messages.map((msg, index) => {
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

            // Logica per mostrare il form di contatto
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
        
        {/* 📍 Bottone "Vai alla fine del messaggio" - CENTRATO */}
        {showScrollToEnd && (
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
        {/* Icona fluttuante per richiesta preventivo - posizionata relativamente al composer */}
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
            placeholder="Scrivi il tuo messaggio..."
          />
          <button
            type="submit"
            className={styles.button}
            disabled={chatState.inputDisabled}
          >
            Invia
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;