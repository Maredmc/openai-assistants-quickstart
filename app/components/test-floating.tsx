// TEST rapido per verificare che FloatingContact funzioni
import React, { useState } from 'react';
import FloatingContact from './floating-contact';

export default function TestFloatingContact() {
  const [showIcon, setShowIcon] = useState(true);
  
  const mockChatHistory = [
    { role: 'user', content: 'Ciao', timestamp: new Date().toISOString() },
    { role: 'assistant', content: 'Ciao! Come posso aiutarti?', timestamp: new Date().toISOString() }
  ];
  
  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      <h1>Test Icona Fluttuante</h1>
      <button onClick={() => setShowIcon(!showIcon)}>
        {showIcon ? 'Nascondi' : 'Mostra'} Icona
      </button>
      
      <FloatingContact 
        chatHistory={mockChatHistory}
        isVisible={showIcon}
        onSuccess={() => {
          alert('Form inviato con successo!');
          setShowIcon(false);
        }}
      />
    </div>
  );
}