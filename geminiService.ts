
import { GoogleGenAI, Modality, LiveServerMessage, Blob, Type, FunctionDeclaration, Chat } from "@google/genai";
import { getNoraSystemPrompt } from "../constants";

const COMMON_TOOLS: FunctionDeclaration[] = [
  {
    name: 'confirm_details',
    parameters: {
      type: Type.OBJECT,
      description: 'Update customer details on the card instantly.',
      properties: {
        name: { type: Type.STRING },
        phone: { type: Type.STRING },
        email: { type: Type.STRING },
        area: { type: Type.STRING },
        service: { type: Type.STRING }
      },
    },
  },
  {
    name: 'post_to_chat',
    parameters: {
      type: Type.OBJECT,
      description: 'Send a text message to the chat window for the user to read.',
      properties: {
        message: { type: Type.STRING, description: 'The text message to display in chat' }
      },
      required: ['message'],
    },
  },
  {
    name: 'show_company_photo',
    parameters: {
      type: Type.OBJECT,
      description: 'Show a specific service or company photo to the customer.',
      properties: {
        photoType: { 
          type: Type.STRING, 
          enum: ['clean_living_room', 'carpet_washing', 'deep_kitchen_cleaning', 'landscape_design'],
          description: 'The category of the photo to show'
        },
        message: { type: Type.STRING, description: 'Optional message from Nora about the photo' }
      },
      required: ['photoType'],
    },
  },
  {
    name: 'send_confirmation_email',
    parameters: {
      type: Type.OBJECT,
      description: 'Send a confirmation email to the customer.',
      properties: {
        email: { type: Type.STRING },
        details: { type: Type.STRING }
      },
      required: ['email'],
    },
  },
  {
    name: 'end_call',
    parameters: { 
      type: Type.OBJECT, 
      description: 'End the current session.',
      properties: {} 
    },
  }
];

export class NoraService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public createChat(pastMemory?: string): Chat {
    return this.ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: getNoraSystemPrompt(pastMemory),
        tools: [{ functionDeclarations: COMMON_TOOLS }]
      },
    });
  }

  public async connectVoice(callbacks: {
    onAudioChunk: (base64: string) => void;
    onInterruption: () => void;
    onError: (e: any) => void;
    onClose: () => void;
    onTranscription?: (text: string, isUser: boolean) => void;
    onToolCall?: (functionCalls: any[]) => void;
  }, pastMemory?: string) {
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => console.debug('Nora Session Live'),
        onmessage: async (message: LiveServerMessage) => {
          const audioBase64 = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioBase64) callbacks.onAudioChunk(audioBase64);
          if (message.serverContent?.interrupted) callbacks.onInterruption();
          
          if (message.toolCall) {
            callbacks.onToolCall?.(message.toolCall.functionCalls);
            sessionPromise.then(session => {
              message.toolCall?.functionCalls.forEach(fc => {
                session.sendToolResponse({
                  functionResponses: { id: fc.id, name: fc.name, response: { result: "success" } }
                });
              });
            });
          }
          
          if (message.serverContent?.outputTranscription) {
            callbacks.onTranscription?.(message.serverContent.outputTranscription.text, false);
          } else if (message.serverContent?.inputTranscription) {
            callbacks.onTranscription?.(message.serverContent.inputTranscription.text, true);
          }
        },
        onerror: (e) => callbacks.onError(e),
        onclose: () => callbacks.onClose(),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: getNoraSystemPrompt(pastMemory),
        tools: [{ functionDeclarations: COMMON_TOOLS }],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
    });

    return sessionPromise;
  }
}

export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

export function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function createPcmBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encodeBase64(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}
