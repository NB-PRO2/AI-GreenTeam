
import React, { useState, useEffect, useCallback } from 'react';
import NoraChat from './components/NoraChat';
import NoraVoice from './components/NoraVoice';
import { Message } from './types';

const App: React.FC = () => {
  const [customerInfo, setCustomerInfo] = useState<any>({
    name: '',
    phone: '',
    email: '',
    area: '',
    service: ''
  });
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'أهلاً بيك يا فندم! نورت جرين تيم 24، معاك نورا.. تأمرني بإيه النهاردة؟' }
  ]);
  const [noraSentImage, setNoraSentImage] = useState<string | null>(null);

  // تحميل الذاكرة عند البداية
  useEffect(() => {
    const saved = localStorage.getItem('nora_customer_memory');
    if (saved) {
      try {
        setCustomerInfo(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse memory", e);
      }
    }
  }, []);

  const updateCustomerInfo = (newInfo: any) => {
    setCustomerInfo((prev: any) => {
      const updated = { ...prev, ...newInfo };
      localStorage.setItem('nora_customer_memory', JSON.stringify(updated));
      return updated;
    });
  };

  const addMessage = useCallback((role: 'user' | 'model', text: string) => {
    setMessages(prev => [...prev, { role, text }]);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-cairo">
      
      {/* Brand Label */}
      <div className="fixed top-12 flex flex-col items-center opacity-80">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center">
             <i className="fa-solid fa-leaf text-white text-[10px]"></i>
          </div>
          <span className="text-lg font-black text-green-600 tracking-tight">جرين تيم 24</span>
        </div>
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Green Team 24 - Nora Assistant</p>
      </div>

      {/* Main Interaction Area */}
      <div className="w-full max-w-lg z-10">
        <NoraVoice 
          customerInfo={customerInfo} 
          setCustomerInfo={updateCustomerInfo}
          noraSentImage={noraSentImage}
          setNoraSentImage={setNoraSentImage}
          onNewMessage={addMessage}
        />
      </div>

      {/* Floating Chat in Corner */}
      <NoraChat 
        customerInfo={customerInfo} 
        messages={messages}
        onAddMessage={addMessage}
        onUpdateInfo={updateCustomerInfo}
        onShowPhoto={(url) => setNoraSentImage(url)}
      />
      
    </div>
  );
};

export default App;
