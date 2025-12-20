import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { decode, decodeAudioData, createBlob } from '../services/audioUtils';
import { FINANCE_TOOLS } from '../services/financeService';

interface UseGeminiClientProps {
  onFunctionCall: (fc: any) => Promise<any>;
  onMessageUser?: (text: string) => void;
  onMessageAssistant?: (text: string) => void;
}

export const useGeminiClient = ({ onFunctionCall, onMessageUser, onMessageAssistant }: UseGeminiClientProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const sessionRef = useRef<any>(null);
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextsRef.current) {
      audioContextsRef.current.input.close();
      audioContextsRef.current.output.close();
      audioContextsRef.current = null;
    }
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    setIsListening(false);
    setIsConnecting(false);
  }, []);

  const handleFunctionCall = useCallback(async (fc: any) => {
    const result = await onFunctionCall(fc);
    if (result !== undefined && sessionRef.current) {
       sessionRef.current.sendToolResponse({
        functionResponses: { id: fc.id, name: fc.name, response: { result } }
      });
    }
  }, [onFunctionCall]);
  
  // Expose a method to manually send a tool response (e.g. after async confirmation)
  const sendToolResponse = useCallback((id: string, name: string, result: any) => {
      if (sessionRef.current) {
          sessionRef.current.sendToolResponse({
              functionResponses: { id, name, response: { result } }
          });
      }
  }, []);

  const startSession = async () => {
    if (isListening || isConnecting) return;
    setIsConnecting(true);

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API Key is missing. Please check your .env.local file.");
      }
      const ai = new GoogleGenAI({ apiKey });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextsRef.current = { input: inputCtx, output: outputCtx };

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsListening(true);
            setIsConnecting(false);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioContextsRef.current) {
              const outCtx = audioContextsRef.current.output;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const buffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outCtx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.inputTranscription?.text) {
               onMessageUser?.(message.serverContent.inputTranscription.text);
            }
            if (message.serverContent?.outputTranscription?.text) {
               onMessageAssistant?.(message.serverContent.outputTranscription.text);
            }

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) handleFunctionCall(fc);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => stopSession(),
          onclose: () => stopSession()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: FINANCE_TOOLS as any }],
          systemInstruction: `You are FinVocalist, an advanced AI Financial Advisor. 
          Your goals:
          1. Provide personalized financial advice: Use 'get_financial_profile' to understand user patterns. 
             - **CRITAL: Check the 'savings_rate_pct' and 'emergency_runway_months' metrics in the profile.**
             - If savings rate is < 20%, recommend specific cuts to discretionary spending (check the 'spending_summary').
             - If emergency runway is < 6 months, prioritizing saving for emergencies is the #1 recommendation.
             - Use 'add_financial_insight' to post these permanent recommendations to their dashboard.
          2. Voice-activated Bill Payment: Users can ask to pay bills. Use 'get_pending_bills' to identify them and 'pay_bill' to initiate. Mention that you are using "Voice ID Authentication" for security. Always confirm the amount and biller before proceeding.
          3. General Finance: Manage transactions and balances.
          4. Fund Transfers: You can transfer funds between accounts using 'transfer_funds'.
          Be proactive! If you see a user is overspending in a category, mention it. Be warm, professional, and secure.`
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        alert("Microphone access denied. Please allow microphone access in your browser settings to use the voice features.");
      } else {
        alert("Failed to connect: " + (err.message || "Unknown error"));
      }
      setIsConnecting(false);
    }
  };

  return { isListening, isConnecting, startSession, stopSession, sendToolResponse };
};
