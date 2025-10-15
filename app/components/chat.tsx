"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import styles from "./chat.module.css";
import { AssistantStream } from "openai/lib/AssistantStream";
import Markdown from "react-markdown";
// @ts-expect-error - no types for this yet
import { AssistantStreamEvent } from "openai/resources/beta/assistants/assistants";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";
import ContactForm from "./contact-form";
import ProductCard from "./product-card";
import { addToCart, getCart, getCartItemCount } from "../lib/cart";
import { trackAddToCart, trackProductView } from "../lib/shopify-analytics";

type MessageProps = {
  role: "user" | "assistant" | "code";
  text: string;
  showContactForm?: boolean;
  chatHistory?: Array<{role: string; content: string; timestamp?: string}>;
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

const UserMessage = ({ text }: { text: string }) => {
  return <div className={styles.userMessage}>{text}</div>;
};

const AssistantMessage = ({ text, showContactForm, chatHistory, onContactDeclined, showAlternativeOffer, products, onAddToCart }: { 
  text: string;
  showContactForm?: boolean;
  chatHistory?: Array<{role: string; content: string; timestamp?: string}>;
  onContactDeclined?: () => void;
  showAlternativeOffer?: boolean;
  products?: any[];
  onAddToCart?: (product: any) => void;
}) => {
  // Rimuovi i tag [PRODOTTO: id] dal testo visualizzato
  const cleanText = text.replace(/\[PRODOTTO:\s*[^\]]+\]/gi, '').trim();
  
  return (
    <div className={styles.assistantMessage}>
      <div className={styles.assistantHeader}>
        <div className={styles.assistantIcon}>
          <Image 
            src="/logo_nabè.png" 
            alt="Logo" 
            width={20} 
            height={20}
          />
        </div>
        <span className={styles.assistantLabel}>Assistente</span>
      </div>
      <Markdown>{cleanText}</Markdown>
      
      {/* Mostra prodotti consigliati */}
      {products && products.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '16px' }}>
          {products.map((product) => {
            // Track product view quando viene mostrato
            if (typeof window !== 'undefined') {
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

const LoadingMessage = () => {
  return (
    <div className={styles.assistantMessage}>
      <div className={styles.assistantHeader}>
        <div className={`${styles.assistantIcon} ${styles.assistantIconThinking}`}>
          <Image 
            src="/logo_nabè.png" 
            alt="Logo" 
            width={20} 
            height={20}
          />
        </div>
        <span className={styles.assistantLabel}>Assistente</span>
      </div>
      <div className={styles.thinkingDots}>
        <div className={styles.dot}></div>
        <div className={styles.dot}></div>
        <div className={styles.dot}></div>
      </div>
    </div>
  );
};

const CodeMessage = ({ text }: { text: string }) => {
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

const Message = ({ role, text, showContactForm, chatHistory, onContactDeclined, showAlternativeOffer, products, onAddToCart }: MessageProps) => {
  switch (role) {
    case "user":
      return <UserMessage text={text} />;
    case "assistant":
      return <AssistantMessage 
        text={text} 
        showContactForm={showContactForm} 
        chatHistory={chatHistory} 
        onContactDeclined={onContactDeclined}
        showAlternativeOffer={showAlternativeOffer}
        products={products}
        onAddToCart={onAddToCart}
      />;
    case "code":
      return <CodeMessage text={text} />;
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
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [threadId, setThreadId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasAssistantResponded, setHasAssistantResponded] = useState(false);
  const [contactDeclined, setContactDeclined] = useState(false);
  const [showAlternativeOffer, setShowAlternativeOffer] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  // Inizializza cart count
  useEffect(() => {
    const cart = getCart();
    setCartCount(getCartItemCount(cart));
  }, []);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

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

  const sendMessage = async (text) => {
    // Proviamo a rilevare se l'utente sta chiedendo prodotti specifici
    const productKeywords = ['letto', 'prodotto', 'prezzo', 'costo', 'catalogo', 'modello', 'disponibilità', 'montessori', 'bambino', 'sponde', 'materasso'];
    const hasProductQuery = productKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );

    let systemInstructions = `ISTRUZIONI IMPORTANTI:
- Rispondi in modo CONCISO e DIRETTO
- Quando consigli prodotti usa ELENCHI PUNTATI con GRASSETTI sui punti principali
- Massimo 3-4 frasi per spiegazione, poi vai al sodo
- Evita giri di parole, sii pratico e utile

FORMATO PRODOTTI:
Quando consigli un prodotto, usa ESATTAMENTE questo formato:
[PRODOTTO: nome-prodotto-handle]
Dove 'nome-prodotto-handle' è l'ID del prodotto (es: letto-montessori-casetta-baldacchino-zeropiu)

Esempio:
Per un bambino di 3 anni ti consiglio:
[PRODOTTO: letto-montessori-casetta-baldacchino-zeropiu]
Questo letto è perfetto perché...

IMPORTANTE: Usa [PRODOTTO: id] ogni volta che consigli un prodotto specifico!`;

    // Se l'utente chiede prodotti, aggiungiamo i dati reali
    if (hasProductQuery) {
      try {
        console.log('🛍️ [AI] User asking about products, fetching data...');
        const response = await fetch('/api/products?action=list', {
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log('📊 [AI] Products API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📋 [AI] Products API data:', {
            success: data.success,
            productsCount: data.products?.length || 0,
            totalProducts: data.totalProducts,
            lastSync: data.lastSync
          });
          
          if (data.success && data.products && data.products.length > 0) {
            const productsInfo = data.products.map(product => 
              `ID: ${product.id}
Nome: ${product.name}
Prezzo: ${product.price}
Descrizione: ${product.description.substring(0, 100)}...
Disponibile: ${product.inStock ? 'Sì' : 'No'}
---`
            ).join('\n');
            
            systemInstructions += `

PRODOTTI NABÈ DISPONIBILI (dati reali e aggiornati):
${productsInfo}

⚡ IMPORTANTE: 
- USA QUESTI DATI REALI per rispondere
- Menziona prezzi specifici e nomi esatti dei prodotti
- Quando consigli un prodotto, usa [PRODOTTO: id] dove 'id' è l'ID del prodotto sopra
- Esempio: [PRODOTTO: ${data.products[0].id}]`;
            console.log(`✅ [AI] Added ${data.products.length} real products to AI context`);
          } else {
            console.log('⚠️ [AI] No products found in API response');
            // Fallback con prodotti base
            systemInstructions += `

PRODOTTI NABÈ (informazioni base):
**Letto Montessori zero+ Dream**: da €590 - Letto evolutivo con casetta/baldacchino
**Sponde Protettive zero+**: da €120 - Sponde modulari per sicurezza bambini`;
          }
        } else {
          console.error('❌ [AI] Products API failed:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('❌ [AI] Error fetching products:', error);
        // Fallback con informazioni base
        systemInstructions += `

PRODOTTI NABÈ:
**Letto Montessori zero+ Dream**: da €590 - Letto evolutivo montessoriano
**Sponde Protettive zero+**: da €120 - Accessori di sicurezza`;
      }
    }

    systemInstructions += `\n\nDomanda utente: ${text}`;
    
    const response = await fetch(
      `/api/assistants/threads/${threadId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          content: systemInstructions,
        }),
      }
    );
    const stream = AssistantStream.fromReadableStream(response.body);
    handleReadableStream(stream);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    
    // Controlla se l'utente sta rifiutando di essere contattato
    const refusalKeywords = ['no grazie', 'non voglio', 'non interessato', 'no thanks', 'non ora', 'magari dopo', 'non mi interessa', 'non ho bisogno', 'preferirei di no', 'non adesso'];
    const contactKeywords = ['contatto', 'contattare', 'preventivo', 'modulo', 'email', 'telefono', 'ricontattare', 'chiamare'];
    const userInputLower = userInput.toLowerCase();
    const hasRefused = refusalKeywords.some(keyword => userInputLower.includes(keyword));
    const wantsContact = contactKeywords.some(keyword => userInputLower.includes(keyword));
    
    if (hasRefused && !contactDeclined) {
      setShowAlternativeOffer(true);
    }
    
    // Se l'utente chiede esplicitamente di essere contattato, riattiva il sistema
    if (wantsContact && contactDeclined) {
      setContactDeclined(false);
      setShowAlternativeOffer(false);
    }
    
    sendMessage(userInput);
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", text: userInput },
    ]);
    setUserInput("");
    setInputDisabled(true);
    setIsLoading(true);
    scrollToBottom();
  };

  const handleTextCreated = () => {
    appendMessage("assistant", "");
    if (!hasAssistantResponded) {
      setHasAssistantResponded(true);
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
    setInputDisabled(true);
    submitActionResult(runId, toolCallOutputs);
  };

  const handleRunCompleted = async () => {
    setInputDisabled(false);
    setIsLoading(false);
    
    // Dopo che l'AI ha finito, cerca prodotti nel messaggio
    // Usiamo setTimeout per eseguire dopo il render
    setTimeout(async () => {
      setMessages((prevMessages) => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.text) {
          // Esegui fetch in background
          extractAndFetchProducts(lastMessage.text).then((products) => {
            if (products.length > 0) {
              console.log(`✅ Found ${products.length} products in AI response:`, products.map(p => p.name));
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
              console.log('⚠️ No products found in AI response');
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

  // Funzione per estrarre e fetchare prodotti dal testo dell'AI
  const extractAndFetchProducts = async (text: string) => {
    try {
      console.log('🔍 Searching for [PRODOTTO: id] tags in text...');
      
      // Cerca tag [PRODOTTO: id] nel testo
      const productTagRegex = /\[PRODOTTO:\s*([^\]]+)\]/gi;
      const matches = Array.from(text.matchAll(productTagRegex));
      
      if (matches.length === 0) {
        console.log('⚠️ No [PRODOTTO: id] tags found in AI response');
        return [];
      }
      
      console.log(`🎯 Found ${matches.length} product tags:`, matches.map(m => m[1]));
      
      // Estrai gli ID dei prodotti
      const productIds = matches.map(match => match[1].trim());
      
      // Fetch tutti i prodotti
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
      
      // Trova i prodotti corrispondenti agli ID
      const foundProducts = productIds
        .map(id => {
          const product = data.products.find((p: Product) => p.id === id);
          if (product) {
            console.log(`✅ Found product: ${product.name} (${id})`);
          } else {
            console.log(`❌ Product not found: ${id}`);
          }
          return product;
        })
        .filter(Boolean); // Rimuovi null/undefined
      
      console.log(`✅ Total products to display: ${foundProducts.length}`);
      
      return foundProducts.slice(0, 3); // Max 3 prodotti
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
    setContactDeclined(true);
    setShowAlternativeOffer(false);
    // Dopo 3 messaggi dell'utente, riattiva l'offerta alternativa
    setTimeout(() => {
      setShowAlternativeOffer(true);
    }, 10000); // 10 secondi dopo, o potresti basarti sul conteggio messaggi
  };

  const handleShowAlternativeOffer = () => {
    setShowAlternativeOffer(true);
    setContactDeclined(false); // Reset per permettere il form
  };

  // Funzione per convertire i messaggi in formato cronologia chat
  const getChatHistory = () => {
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.text,
      timestamp: new Date().toISOString()
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
    <div className={styles.chatContainer}>
      <div className={styles.messages}>
        {messages.length === 0 && (
  <div className={styles.welcomeMessage}>
    <h2>Benvenutə in Nabè</h2>
    <p>Sono il tuo consulente specializzato per trovare il letto perfetto per il tuo bambino. Insieme creeremo il rifugio dei sogni ideale!</p>
            <div className={styles.quickQuestions}>
  <p className={styles.quickQuestionsTitle}>Iniziamo con queste domande:</p>
  <button 
    onClick={() => setUserInput("Ho un bambino di 3 anni, che letto mi consigli?")}
    className={styles.quickQuestion}
  >
    Ho un bambino di 3 anni, che letto mi consigli?
  </button>
  <button 
    onClick={() => setUserInput("Ho due figli di 4 e 7 anni, mi serve un letto a castello?")}
    className={styles.quickQuestion}
  >
    Ho due figli di 4 e 7 anni, mi serve un letto a castello?
  </button>
  <button 
    onClick={() => setUserInput("Mio figlio ha iniziato a camminare, quali sponde mi consigli?")}
    className={styles.quickQuestion}
  >
    Mio figlio ha iniziato a camminare, quali sponde mi consigli?
  </button>
  <button 
    onClick={() => setUserInput("La cameretta è piccola, che dimensioni mi consigli?")}
    className={styles.quickQuestion}
  >
    La cameretta è piccola, che dimensioni mi consigli?
  </button>
</div>
          </div>
        )}
        
        {messages.map((msg, index) => {
          const isLastAssistantMessage = 
            msg.role === 'assistant' && 
            hasAssistantResponded && 
            !isLoading && 
            index === messages.length - 1;
          
          // Logica per mostrare il form di contatto
          const shouldShowContactForm = isLastAssistantMessage && !contactDeclined && !showAlternativeOffer;
          const shouldShowAlternative = isLastAssistantMessage && showAlternativeOffer;
          
          return (
            <Message 
              key={index} 
              role={msg.role} 
              text={msg.text}
              showContactForm={shouldShowContactForm}
              chatHistory={shouldShowContactForm ? getChatHistory() : undefined}
              onContactDeclined={handleContactDeclined}
              showAlternativeOffer={shouldShowAlternative}
              products={msg.products}
              onAddToCart={handleAddToCart}
            />
          );
        })}
        
        {isLoading && <LoadingMessage />}
        
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={handleSubmit}
        className={`${styles.inputForm} ${styles.clearfix}`}
      >
        <input
          type="text"
          className={styles.input}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Scrivi il tuo messaggio..."
        />
        <button
          type="submit"
          className={styles.button}
          disabled={inputDisabled}
        >
          Invia
        </button>
      </form>
    </div>
  );
};

export default Chat;