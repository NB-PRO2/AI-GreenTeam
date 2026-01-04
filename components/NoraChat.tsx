
import React, { useState, useEffect, useRef } from 'react';
import { NoraService } from '../services/geminiService';
import { Message } from '../types';

interface NoraChatProps {
  customerInfo: any;
  messages: Message[];
  onAddMessage: (role: 'user' | 'model', text: string) => void;
  onUpdateInfo: (info: any) => void;
  onShowPhoto: (url: string) => void;
}

const NoraChat: React.FC<NoraChatProps> = ({ customerInfo, messages, onAddMessage, onUpdateInfo, onShowPhoto }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nora = new NoraService();
    chatRef.current = nora.createChat(JSON.stringify(customerInfo));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleToolCall = (functionCalls: any[]) => {
    for (const fc of functionCalls) {
      if (fc.name === 'confirm_details') {
        onUpdateInfo(fc.args);
      } else if (fc.name === 'show_company_photo') {
        const photos: Record<string, string> = {
          clean_living_room: 'https://images.unsplash.com/photo-1581578731548-c64695cc6958?auto=format&fit=crop&q=80&w=600',
          carpet_washing: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&q=80&w=600',
          deep_kitchen_cleaning: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=600',
          landscape_design: 'https://images.unsplash.com/photo-1558904541-efa8c196b27e?auto=format&fit=crop&q=80&w=600'
        };
        onShowPhoto(photos[fc.args.photoType] || photos.clean_living_room);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    onAddMessage('user', userMessage);
    setIsLoading(true);

    try {
      const response = await chatRef.current.sendMessage({ message: userMessage });
      if (response.functionCalls) handleToolCall(response.functionCalls);
      onAddMessage('model', response.text || 'تمام يا فندم، سجلت طلبك.');
    } catch (error) {
      console.error(error);
      onAddMessage('model', 'معلش يا فندم حصل مشكلة بسيطة، ممكن تجرب تاني؟');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-80 md:w-96 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-100 animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-green-600 p-4 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-400 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                <img src="https://picsum.photos/seed/nora/100/100" alt="Nora" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">نورا (نصي)</h3>
                <p className="text-xs text-green-100">خدمة عملاء ذكية</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 h-96 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-green-600 text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-end">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="اكتب إيميلك أو أي شيء..."
              className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <i className="fa-solid fa-paper-plane rotate-180"></i>
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-green-600 text-white w-16 h-16 rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform active:scale-95 group relative"
      >
        <i className={`fa-solid ${isOpen ? 'fa-comment-slash' : 'fa-comment-dots'} text-2xl`}></i>
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white"></span>
          </span>
        )}
      </button>
    </div>
  );
};

export default NoraChat;
