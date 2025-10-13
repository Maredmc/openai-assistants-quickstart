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

type MessageProps = {
  role: "user" | "assistant" | "code";
  text: string;
  showContactForm?: boolean;
  chatHistory?: Array<{role: string; content: string; timestamp?: string}>;
  onContactDeclined?: () => void;
  showAlternativeOffer?: boolean;
};

const UserMessage = ({ text }: { text: string }) => {
  return <div className={styles.userMessage}>{text}</div>;
};

const AssistantMessage = ({ text, showContactForm, chatHistory, onContactDeclined, showAlternativeOffer }: { 
  text: string;
  showContactForm?: boolean;
  chatHistory?: Array<{role: string; content: string; timestamp?: string}>;
  onContactDeclined?: () => void;
  showAlternativeOffer?: boolean;
}) => {
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
      <Markdown>{text}</Markdown>
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

const Message = ({ role, text, showContactForm, chatHistory, onContactDeclined, showAlternativeOffer }: MessageProps) => {
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
- Usa formato: **Nome Prodotto**: breve descrizione benefici
- Evita giri di parole, sii pratico e utile`;

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
            const productsInfo = data.products.slice(0, 6).map(product => 
              `**${product.name}**: ${product.price} - ${product.description.substring(0, 80)}...`
            ).join('\n');
            
            systemInstructions += `

PRODOTTI NABÈ DISPONIBILI (dati reali e aggiornati):
${productsInfo}

⚡ IMPORTANTE: USA QUESTI DATI REALI per rispondere. Menziona prezzi specifici e nomi esatti dei prodotti.`;
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

  const handleRunCompleted = () => {
    setInputDisabled(false);
    setIsLoading(false);
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
    <h2>Benvenutə in Nabè!</h2>
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