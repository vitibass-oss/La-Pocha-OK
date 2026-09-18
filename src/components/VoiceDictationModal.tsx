import React, { useState, useEffect, useRef } from 'react';
import { Player } from '../types';
import { parseVoiceInput } from '../utils/pocha';
import { Mic, MicOff, Volume2, Sparkles, Check, X, HelpCircle, Send } from 'lucide-react';

interface VoiceDictationModalProps {
  isOpen: boolean;
  mode: 'bids' | 'actuals';
  players: Player[];
  cards: number;
  onClose: () => void;
  onApplyScores: (scores: Record<string, number>) => void;
}

export const VoiceDictationModal: React.FC<VoiceDictationModalProps> = ({
  isOpen,
  mode,
  players,
  cards,
  onClose,
  onApplyScores,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [manualText, setManualText] = useState('');
  const [parsedScores, setParsedScores] = useState<Record<string, number>>({});
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef<boolean>(false);

  useEffect(() => {
    let recInstance: any = null;

    if (typeof window !== 'undefined' && isOpen) {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = false;
          rec.interimResults = true;
          rec.lang = 'es-ES';

          rec.onstart = () => {
            setIsListening(true);
          };

          rec.onend = () => {
            setIsListening(false);
            shouldListenRef.current = false;
          };

          rec.onerror = (e: any) => {
            console.warn('Speech recognition status:', e?.error);
            setIsListening(false);
            shouldListenRef.current = false;
          };

          rec.onresult = (event: any) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript + ' ';
            }
            setSpokenText(transcript);
            const { parsedScores: parsed } = parseVoiceInput(transcript, players);
            setParsedScores((prev) => ({ ...prev, ...parsed }));
          };

          recognitionRef.current = rec;
          recInstance = rec;
        } catch (e) {
          console.warn('Failed to initialize speech recognition:', e);
        }
      }
    }

    return () => {
      shouldListenRef.current = false;
      if (recInstance) {
        try {
          recInstance.abort();
        } catch (e) {}
      }
      recognitionRef.current = null;
      setIsListening(false);
    };
  }, [isOpen, players]);

  if (!isOpen) return null;

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Tu navegador no soporta reconocimiento de voz directo. Puedes usar el campo de texto.');
      return;
    }

    if (isListening) {
      shouldListenRef.current = false;
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    } else {
      setSpokenText('');
      shouldListenRef.current = true;
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Start speech error:', e);
        setIsListening(false);
      }
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    const { parsedScores: parsed } = parseVoiceInput(manualText, players);
    setParsedScores(parsed);
  };

  const handleApply = () => {
    onApplyScores(parsedScores);
    onClose();
  };

  const modeTitle = mode === 'bids' ? 'Bazas Pedidas (Subasta)' : 'Bazas Hechas (Resultados)';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-yellow-600 p-5 text-slate-950 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Mic className="w-6 h-6 fill-slate-950" />
            <div>
              <h3 className="font-extrabold text-lg leading-tight">Dictado por Voz y Texto</h3>
              <p className="text-xs font-semibold text-slate-900/80">
                Anotar {modeTitle} para {cards} cartas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-950/20 hover:bg-slate-950/30 transition text-slate-950 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-white">
          {/* Microphone Activation Button */}
          <div className="flex flex-col items-center justify-center space-y-3 bg-slate-950/60 p-6 rounded-2xl border border-slate-800 text-center">
            <button
              onClick={toggleListening}
              className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl transition shadow-xl cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse ring-8 ring-rose-500/30'
                  : 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 hover:scale-105 shadow-amber-500/20'
              }`}
            >
              {isListening ? <Mic className="w-10 h-10 animate-spin" /> : <Mic className="w-10 h-10" />}
            </button>

            <span className="text-sm font-bold">
              {isListening
                ? 'Escuchando en vivo (Español)... Haz clic para detener'
                : recognitionRef.current
                ? 'Haz clic en el micrófono para dictar por voz'
                : 'Reconocimiento de voz no soportado'}
            </span>

            {spokenText && (
              <p className="text-xs text-amber-300 italic bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                "{spokenText}"
              </p>
            )}
          </div>

          {/* Text Input Fallback */}
          <form onSubmit={handleTextSubmit} className="space-y-2">
            <label className="text-xs font-bold text-slate-400 block">
              O escribe la puntuación (ej: "{players[0]?.name || 'Carlos'} 2, {players[1]?.name || 'Ana'} 1, 0, 3"):
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={manualText}
                onChange={(e) => {
                  setManualText(e.target.value);
                  const { parsedScores: parsed } = parseVoiceInput(e.target.value, players);
                  setParsedScores(parsed);
                }}
                placeholder={`Ej: ${players[0]?.name || 'Carlos'} 2, ${players[1]?.name || 'Ana'} 0...`}
                className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none"
              />
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Parsed Player Values Preview */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Valores Reconocidos:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {players.map((p) => {
                const val = parsedScores[p.id];
                return (
                  <div
                    key={p.id}
                    className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-2.5 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-sm">{p.avatar}</span>
                      <span className="text-xs font-bold truncate">{p.name}</span>
                    </div>
                    <span
                      className={`text-sm font-black px-2 py-0.5 rounded ${
                        val !== undefined
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {val !== undefined ? val : '-'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-slate-800 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              disabled={Object.keys(parsedScores).length === 0}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl transition shadow-lg shadow-amber-500/20 disabled:opacity-40 cursor-pointer flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Aplicar Puntuaciones</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
