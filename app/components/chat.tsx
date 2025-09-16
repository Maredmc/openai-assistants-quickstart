"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import styles from "./chat.module.css";
import { AssistantStream } from "openai/lib/AssistantStream";
import Markdown from "react-markdown";
// @ts-expect-error - no types for this yet
import { AssistantStreamEvent } from "openai/resources/beta/assistants/assistants";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";

type MessageProps = {
  role: "user" | "assistant" | "code";
  text: string;
};

const UserMessage = ({ text }: { text: string }) => {
  return <div className={styles.userMessage}>{text}</div>;
};

const AssistantMessage = ({ text }: { text: string }) => {
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

const Message = ({ role, text }: MessageProps) => {
  switch (role) {
    case "user":
      return <UserMessage text={text} />;
    case "assistant":
      return <AssistantMessage text={text} />;
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
    const response = await fetch(
      `/api/assistants/threads/${threadId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          content: text,
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
            <div className={styles.welcomeIcon}>👋</div>
            <h2>Benvenuto!</h2>
            <p>Sono il tuo assistente personale per la scelta del letto perfetto. Come posso aiutarti oggi?</p>
            <div className={styles.quickQuestions}>
              <p className={styles.quickQuestionsTitle}>Domande frequenti:</p>
              <button 
                onClick={() => setUserInput("Che misura mi consigli per una camera di 15mq?")}
                className={styles.quickQuestion}
              >
                Che misura mi consigli per una camera di 15mq?
              </button>
              <button 
                onClick={() => setUserInput("Qual è il miglior materasso per dormire bene?")}
                className={styles.quickQuestion}
              >
                Qual è il miglior materasso per dormire bene?
              </button>
              <button 
                onClick={() => setUserInput("Letto adatto per chi soffre di mal di schiena?")}
                className={styles.quickQuestion}
              >
                Letto adatto per chi soffre di mal di schiena?
              </button>
              <button 
                onClick={() => setUserInput("Vantaggi dei letti contenitore")}
                className={styles.quickQuestion}
              >
                Vantaggi dei letti contenitore
              </button>
            </div>
          </div>
        )}
        
        {messages.map((msg, index) => (
          <Message key={index} role={msg.role} text={msg.text} />
        ))}
        
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