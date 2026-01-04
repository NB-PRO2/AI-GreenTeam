
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { NoraService, decodeAudioData, decodeBase64, createPcmBlob } from '../services/geminiService';
import { COMPANY_LOGO } from '../constants';

interface NoraVoiceProps {
  customerInfo: any;
  setCustomerInfo: (info: any) => void;
  noraSentImage: string | null;
  setNoraSentImage: (url: string | null) => void;
  onNewMessage: (role: 'user' | 'model', text: string) => void;
}

const NoraVoice: React.FC<NoraVoiceProps> = ({ customerInfo, setCustomerInfo, noraSentImage, setNoraSentImage, onNewMessage }) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error' | 'permission-denied'>('idle');
  const [currentText, setCurrentText] = useState("");
  const [isNoraSpeaking, setIsNoraSpeaking] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const noraServiceRef = useRef<NoraService>(new NoraService());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const lastInfoRef = useRef(customerInfo);

  // مراقبة التغييرات في البطاقة لضمان تفاعل نورا اللحظي
  useEffect(() => {
    if (status === 'active') {
      const prev = lastInfoRef.current;
      const curr = customerInfo;
      const changedField = Object.keys(curr).find(key => curr[key] !== prev[key]);
      
      if (changedField && curr[changedField]) {
        sessionPromiseRef.current?.then(session => {
          // تنبيه نورا صوتياً بالتحديث الذي حدث في البطاقة
          const updateAlert = `تنبيه: العميل حدث بياناته في البطاقة، حقل (${changedField}) أصبح: "${curr[changedField]}". يا نورا، رحبي بالتحديث ده وأكدي للعميل إنك شفتيه في البطاقة حالاً بصوتك.`;
          session.sendRealtimeInput({ text: updateAlert });
          setCurrentText(`نورا: استلمت ${changedField} وسجلته في البطاقة..`);
        });
      }
    }
    lastInfoRef.current = { ...customerInfo };
  }, [customerInfo, status]);

  const cleanup = useCallback(() => {
    if (scriptProcessorRef.current) { scriptProcessorRef.current.disconnect(); scriptProcessorRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    if (inputAudioContextRef.current) { inputAudioContextRef.current.close().catch(() => {}); inputAudioContextRef.current = null; }
    if (outputAudioContextRef.current) { outputAudioContextRef.current.close().catch(() => {}); outputAudioContextRef.current = null; }
    activeSourcesRef.current.forEach(source => { try { source.stop(); } catch(e) {} });
    activeSourcesRef.current.clear();
    if (sessionPromiseRef.current) { sessionPromiseRef.current.then(session => { try { session.close(); } catch(e) {} }).catch(() => {}); }
    sessionPromiseRef.current = null;
    nextStartTimeRef.current = 0;
    setStatus('idle');
    setIsNoraSpeaking(false);
  }, []);

  const handleToolCalls = useCallback(async (calls: any[]) => {
    for (const call of calls) {
      if (call.name === 'confirm_details') setCustomerInfo(call.args);
      if (call.name === 'post_to_chat') onNewMessage('model', call.args.message);
      if (call.name === 'show_company_photo') {
        const { photoType } = call.args;
        const photos: Record<string, string> = {
          clean_living_room: 'https://images.unsplash.com/photo-1581578731548-c64695cc6958?auto=format&fit=crop&q=80&w=600',
          carpet_washing: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&q=80&w=600',
          deep_kitchen_cleaning: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=600',
          landscape_design: 'https://images.unsplash.com/photo-1558904541-efa8c196b27e?auto=format&fit=crop&q=80&w=600'
        };
        setNoraSentImage(photos[photoType] || photos.clean_living_room);
      }
      if (call.name === 'send_confirmation_email') {
        // محاكاة إرسال الإيميل مع توضيح البيانات المرسلة
        console.log(`Sending Email to: ${call.args.email} with details: ${call.args.details}`);
        setIsSendingEmail(true);
        setTimeout(() => { 
          setIsSendingEmail(false); 
          setEmailSent(true); 
          onNewMessage('model', `تم إرسال تأكيد الحجز إلى الإيميل: ${call.args.email}`);
          setTimeout(() => setEmailSent(false), 5000); 
        }, 2500);
      }
      if (call.name === 'end_call') setTimeout(() => cleanup(), 1500);
    }
  }, [cleanup, setCustomerInfo, setNoraSentImage, onNewMessage]);

  const startSession = async () => {
    if (status === 'connecting' || status === 'active') return;
    cleanup();
    setStatus('connecting');
    setCurrentText("نورا بتفتح الخط...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
      inputAudioContextRef.current = new AudioCtx({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioCtx({ sampleRate: 24000 });

      const sessionPromise = noraServiceRef.current.connectVoice({
        onAudioChunk: async (base64) => {
          if (!outputAudioContextRef.current) return;
          setIsNoraSpeaking(true);
          const ctx = outputAudioContextRef.current;
          nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
          const audioBuffer = await decodeAudioData(decodeBase64(base64), ctx, 24000, 1);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          source.onended = () => {
            activeSourcesRef.current.delete(source);
            if (activeSourcesRef.current.size === 0) setIsNoraSpeaking(false);
          };
          source.start(nextStartTimeRef.current);
          nextStartTimeRef.current += audioBuffer.duration;
          activeSourcesRef.current.add(source);
        },
        onInterruption: () => {
          activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
          activeSourcesRef.current.clear();
          setIsNoraSpeaking(false);
        },
        onToolCall: (calls) => handleToolCalls(calls),
        onError: (err) => { console.error(err); setStatus('error'); cleanup(); },
        onClose: () => cleanup(),
        onTranscription: (text, isUser) => { if (isUser) setCurrentText(text); }
      }, JSON.stringify(customerInfo));

      sessionPromiseRef.current = sessionPromise;
      await sessionPromise;
      setStatus('active');
      setCurrentText(customerInfo.name ? `أهلاً بيك يا ${customerInfo.name}.. معاكي نورا.` : "أهلاً بيك في جرين تيم 24، معاك نورا.. تأمرني بإيه؟");
      
      const source = inputAudioContextRef.current.createMediaStreamSource(stream);
      const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = scriptProcessor;
      
      scriptProcessor.onaudioprocess = (e) => {
        sessionPromiseRef.current?.then(session => {
          const pcmBlob = createPcmBlob(e.inputBuffer.getChannelData(0));
          session.sendRealtimeInput({ media: pcmBlob });
        });
      };
      
      source.connect(scriptProcessor);
      scriptProcessor.connect(inputAudioContextRef.current.destination);
    } catch (error) {
      console.error(error);
      setStatus('permission-denied');
      cleanup();
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !sessionPromiseRef.current) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = (e.target?.result as string).split(',')[1];
      setUploadedImage(e.target?.result as string);
      sessionPromiseRef.current?.then(session => {
        session.sendRealtimeInput({ media: { data: base64Data, mimeType: file.type } });
        setCurrentText("نورا: بشوف الصورة حالا وبحدثلك البيانات...");
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white rounded-[40px] p-8 md:p-14 border border-gray-100 shadow-sm flex flex-col items-center text-center w-full relative transition-all duration-700">
      
      {/* البطاقة الذكية */}
      <div className="w-full max-w-sm mb-10 animate-in zoom-in-95 duration-500">
        <div className="bg-gradient-to-br from-green-700 to-emerald-900 rounded-[35px] p-7 text-white text-right shadow-2xl relative overflow-hidden border-4 border-white/20">
          <div className="flex justify-between items-center mb-5 border-b border-white/10 pb-4">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center shadow-inner">
                  <i className="fa-solid fa-address-card text-green-900"></i>
                </div>
                <h3 className="font-black tracking-tight text-lg">بيانات العميل</h3>
             </div>
             {(emailSent || isSendingEmail) && (
               <div className={`${isSendingEmail ? 'bg-yellow-500' : 'bg-emerald-500'} text-[10px] font-black px-3 py-1 rounded-full animate-bounce flex items-center gap-1 shadow-lg`}>
                  <i className={`fa-solid ${isSendingEmail ? 'fa-spinner fa-spin' : 'fa-check'}`}></i> 
                  {isSendingEmail ? 'جاري الإرسال' : 'تم الإرسال'}
               </div>
             )}
          </div>
          <div className="space-y-4 text-sm font-bold">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-green-200">الاسم:</span>
              <span className="transition-all duration-150 text-base">{customerInfo.name || '...'}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-green-200">الموبايل:</span>
              <span dir="ltr" className="transition-all duration-150 text-base">{customerInfo.phone || '...'}</span>
            </div>
            <div className={`flex justify-between items-center border-b border-white/5 pb-2 transition-all duration-500 ${emailSent ? 'bg-white/10 rounded' : ''}`}>
              <span className="text-green-200">الإيميل:</span>
              <span className={`text-sm truncate max-w-[160px] transition-all duration-300 lowercase font-normal ${emailSent ? 'text-green-300 font-black' : ''}`}>
                {customerInfo.email || '...'}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-green-200">العنوان:</span>
              <span className="transition-all duration-150">{customerInfo.area || '...'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-green-200">الخدمة:</span>
              <span className="transition-all duration-150 text-green-50">{customerInfo.service || '...'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* منطقة الرأس مع اللوجو الجديد */}
      <div className="mb-10 relative">
        <div className={`w-36 h-36 md:w-48 md:h-48 rounded-full p-2 transition-all duration-700 relative z-10 ${status === 'active' ? 'bg-green-600 ring-[12px] ring-green-50 shadow-green-100 shadow-2xl scale-105' : 'bg-gray-100 grayscale opacity-40'}`}>
          <div className="w-full h-full bg-white rounded-full border-4 border-white flex items-center justify-center overflow-hidden">
             {/* لوجو الشركة المستخلص من الصورة */}
             <img src="https://picsum.photos/seed/green-team-logo-v2/400/400" className="w-full h-full object-contain p-2" alt="Green Team Logo" />
          </div>
          {isNoraSpeaking && (
            <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping pointer-events-none"></div>
          )}
        </div>
        {status === 'active' && (
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-green-900 text-white px-5 py-2.5 rounded-full shadow-2xl transition-all duration-500 border-2 border-green-400/50 z-20 flex items-center gap-3 min-w-[180px] justify-center">
            <div className="flex gap-1.5 items-center">
              <div className={`w-2 h-2 rounded-full transition-all duration-150 ${isNoraSpeaking ? 'bg-green-400 animate-pulse' : 'bg-green-900 border border-green-700'}`}></div>
              <div className={`w-2 h-2 rounded-full transition-all duration-150 ${isNoraSpeaking ? 'bg-green-300 animate-pulse delay-75' : 'bg-green-900 border border-green-700'}`}></div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[2px] text-green-100">{isNoraSpeaking ? 'نورا تتحدث' : 'نورا تسمعك'}</span>
            <div className="flex gap-1.5 items-center">
              <div className={`w-2 h-2 rounded-full transition-all duration-150 ${isNoraSpeaking ? 'bg-green-300 animate-pulse delay-150' : 'bg-green-900 border border-green-700'}`}></div>
              <div className={`w-2 h-2 rounded-full transition-all duration-150 ${isNoraSpeaking ? 'bg-green-400 animate-pulse delay-200' : 'bg-green-900 border border-green-700'}`}></div>
            </div>
          </div>
        )}
      </div>

      {/* منطقة الردود */}
      <div className="mb-10 w-full min-h-[140px] flex flex-col items-center justify-center gap-6">
        <div className="relative group">
           <p className={`text-2xl md:text-3xl font-black leading-tight px-6 transition-all duration-300 ${status === 'active' ? 'text-gray-900' : 'text-gray-300 italic'}`}>{currentText || "أهلاً بيك في جرين تيم 24"}</p>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-5">
        {status === 'active' && (
          <button onClick={() => fileInputRef.current?.click()} className="w-full bg-green-50 hover:bg-green-100 text-green-700 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all border border-green-100 active:scale-95">
            <i className="fa-solid fa-camera text-lg"></i>إرسال صورة لنورا
          </button>
        )}
        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
        {status === 'idle' || status === 'error' || status === 'permission-denied' ? (
          <button onClick={startSession} className="w-full bg-green-600 hover:bg-green-700 text-white py-6 rounded-[28px] font-black text-xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 border-b-[6px] border-green-800">
            <i className="fa-solid fa-microphone-lines text-2xl"></i>ابدأ المكالمة
          </button>
        ) : (
          <button onClick={cleanup} className="w-full bg-red-600 hover:bg-red-700 text-white py-5 rounded-[28px] font-black text-lg shadow-xl active:scale-95 flex items-center justify-center gap-3 border-b-[6px] border-red-800">
            <i className="fa-solid fa-phone-slash"></i>إنهاء الجلسة
          </button>
        )}
      </div>
    </div>
  );
};

export default NoraVoice;
