import React, { useState } from 'react';
import { Suit } from '../types';
import { drawRandomCardForTrump, DeckCard, SUITS } from '../utils/pocha';
import { Sparkles, X, Shuffle, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CardDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrump: (suit: Suit) => void;
  title?: string;
  subtitle?: string;
}

export const CardDrawModal: React.FC<CardDrawModalProps> = ({
  isOpen,
  onClose,
  onSelectTrump,
  title = 'Elección Aleatoria de Triunfo',
  subtitle = 'Selecciona una carta boca abajo para descubrir el palo de triunfo de esta ronda',
}) => {
  const [selectedCard, setSelectedCard] = useState<{ index: number; card: DeckCard } | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!isOpen) return null;

  const handlePickCard = (cardIndex: number) => {
    if (isFlipped) return;
    const drawn = drawRandomCardForTrump();
    setSelectedCard({ index: cardIndex, card: drawn });
    setIsFlipped(true);

    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // ignore
    }
  };

  const handleConfirm = () => {
    if (selectedCard) {
      onSelectTrump(selectedCard.card.suit);
      // Reset state and close
      setSelectedCard(null);
      setIsFlipped(false);
      onClose();
    }
  };

  const handleReset = () => {
    setSelectedCard(null);
    setIsFlipped(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-yellow-600 p-5 text-slate-950 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-6 h-6 fill-slate-950" />
            <div>
              <h3 className="font-black text-lg leading-tight uppercase tracking-wide">{title}</h3>
              <p className="text-xs font-semibold text-slate-950/80">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-950/20 hover:bg-slate-950/30 transition text-slate-950 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 text-center">
          {!isFlipped ? (
            <>
              <p className="text-sm font-semibold text-slate-300">
                🎴 ¡Corta la baraja! Toca una de las 4 cartas boca abajo para revelar la carta elegida:
              </p>

              <div className="grid grid-cols-4 gap-3 py-2">
                {[0, 1, 2, 3].map((idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePickCard(idx)}
                    className="group relative aspect-[2/3] bg-gradient-to-br from-amber-950 via-slate-900 to-yellow-950 border-2 border-amber-500/50 hover:border-amber-400 rounded-xl flex items-center justify-center shadow-lg hover:shadow-amber-500/20 transition-all transform hover:-translate-y-1 cursor-pointer overflow-hidden"
                  >
                    {/* Pattern on card back */}
                    <div className="absolute inset-1.5 border border-amber-500/20 rounded-lg flex items-center justify-center bg-slate-950/40">
                      <span className="text-2xl group-hover:scale-125 transition">👑</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            selectedCard && (
              <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Carta Revelada
                </p>

                {/* Drawn Card Display */}
                <div
                  className={`max-w-[180px] mx-auto aspect-[2/3] rounded-2xl p-4 border-2 shadow-2xl flex flex-col justify-between ${
                    SUITS[selectedCard.card.suit].bgColor
                  } ${SUITS[selectedCard.card.suit].borderColor}`}
                >
                  <div className="text-left font-black text-xl text-white">
                    {selectedCard.card.rank}
                  </div>
                  <div className="text-6xl text-center my-auto">
                    {selectedCard.card.symbol}
                  </div>
                  <div className="text-right font-bold text-sm text-amber-300">
                    {SUITS[selectedCard.card.suit].name}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="text-base font-extrabold text-white">
                    Ha salido: <span className="text-yellow-400 font-black">{selectedCard.card.name}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    El triunfo de la ronda será:{' '}
                    <strong className={`${SUITS[selectedCard.card.suit].color}`}>
                      {SUITS[selectedCard.card.suit].name} {SUITS[selectedCard.card.suit].symbol}
                    </strong>
                  </p>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition text-sm flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Shuffle className="w-4 h-4" />
                    <span>Volver a tirar</span>
                  </button>

                  <button
                    onClick={handleConfirm}
                    className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-black rounded-xl transition text-sm flex items-center justify-center space-x-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    <Check className="w-5 h-5 text-slate-950" />
                    <span>Confirmar Triunfo</span>
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
