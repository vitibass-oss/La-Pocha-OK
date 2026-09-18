import React, { useState, useEffect } from 'react';
import { Player, Round, GameRules, Suit } from '../types';
import { SUITS, calculateBiddingStatus } from '../utils/pocha';
import { Edit3, Check, X, AlertTriangle, ChevronLeft, ChevronRight, Trash2, Calculator, ShieldAlert } from 'lucide-react';

interface EditRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  rounds: Round[];
  players: Player[];
  rules: GameRules;
  initialRoundIndex?: number;
  onSaveRoundScore: (
    roundIndex: number,
    updatedScores: Record<string, { bid: number; actual: number }>,
    updatedTrump?: Suit
  ) => void;
  onDeleteRound?: (roundIndex: number) => void;
}

export const EditRoundModal: React.FC<EditRoundModalProps> = ({
  isOpen,
  onClose,
  rounds,
  players,
  rules,
  initialRoundIndex = 0,
  onSaveRoundScore,
  onDeleteRound,
}) => {
  const [selectedRoundIdx, setSelectedRoundIdx] = useState(initialRoundIndex);
  const [localScores, setLocalScores] = useState<
    Record<string, { bid: number; actual: number }>
  >({});
  const [selectedTrump, setSelectedTrump] = useState<Suit>('oros');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const idx = Math.min(initialRoundIndex, rounds.length - 1);
      setSelectedRoundIdx(idx);
      if (rounds[idx]) {
        setSelectedTrump(rounds[idx].trump);
      }
    }
  }, [isOpen, initialRoundIndex, rounds.length]);

  const currentRound = rounds[selectedRoundIdx];

  useEffect(() => {
    if (currentRound) {
      setSelectedTrump(currentRound.trump);
      const initialMap: Record<string, { bid: number; actual: number }> = {};
      players.forEach((p) => {
        const s = currentRound.scores[p.id];
        initialMap[p.id] = {
          bid: s?.bid !== null && s?.bid !== undefined ? s.bid : 0,
          actual: s?.actual !== null && s?.actual !== undefined ? s.actual : 0,
        };
      });
      setLocalScores(initialMap);
    }
  }, [currentRound, players]);

  if (!isOpen || !currentRound) return null;

  const currentSuit = SUITS[selectedTrump] || SUITS[currentRound.trump];
  const dealer = players[currentRound.dealerIndex] || players[0];

  // Calculate sum of actual tricks and bidding analysis
  const totalActuals = Object.values(localScores).reduce((acc: number, curr: { bid: number; actual: number }) => acc + (curr.actual || 0), 0);
  const tricksMatch = totalActuals === currentRound.cards;

  const currentBidsMap = Object.fromEntries(
    Object.entries(localScores).map(([pId, val]) => [pId, val.bid])
  );

  const biddingAnalysis = calculateBiddingStatus(
    currentRound.cards,
    currentBidsMap,
    players,
    currentRound.dealerIndex,
    rules
  );

  const handleBidChange = (playerId: string, delta: number) => {
    setLocalScores((prev) => {
      const current = prev[playerId] || { bid: 0, actual: 0 };
      const nextBid = Math.max(0, Math.min(currentRound.cards, current.bid + delta));
      return { ...prev, [playerId]: { ...current, bid: nextBid } };
    });
  };

  const handleActualChange = (playerId: string, delta: number) => {
    setLocalScores((prev) => {
      const current = prev[playerId] || { bid: 0, actual: 0 };
      const nextActual = Math.max(0, Math.min(currentRound.cards, current.actual + delta));
      return { ...prev, [playerId]: { ...current, actual: nextActual } };
    });
  };

  const handleSave = () => {
    onSaveRoundScore(selectedRoundIdx, localScores, selectedTrump);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Corregir / Editar Ronda</h3>
              <p className="text-xs text-slate-400">Modifica bazas pedidas y hechas de cualquier ronda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Round Selector Header */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
          <button
            disabled={selectedRoundIdx <= 0}
            onClick={() => setSelectedRoundIdx((prev) => Math.max(0, prev - 1))}
            className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-white font-bold transition cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <span className="text-xs text-slate-400 uppercase font-extrabold tracking-wider block">
              Seleccionar Ronda
            </span>
            <div className="flex items-center justify-center space-x-2 mt-0.5">
              <span className="text-lg font-black text-amber-300">
                Ronda {currentRound.roundNumber} de {rounds.length}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                {currentRound.cards} {currentRound.cards === 1 ? 'carta' : 'cartas'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Repartió: 👑 {dealer.name}
            </p>
          </div>

          <button
            disabled={selectedRoundIdx >= rounds.length - 1}
            onClick={() => setSelectedRoundIdx((prev) => Math.min(rounds.length - 1, prev + 1))}
            className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-white font-bold transition cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Trump Suit Selector in Edit Round */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Modificar Triunfo de la Ronda
            </span>
            <span className="text-xs font-bold text-slate-300">
              Actual: {currentSuit.symbol} {currentSuit.name} {currentSuit.isDouble ? '(x2)' : ''}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {(Object.keys(SUITS) as Suit[]).map((sKey) => {
              const s = SUITS[sKey];
              const isSelected = selectedTrump === sKey;
              return (
                <button
                  key={sKey}
                  type="button"
                  onClick={() => setSelectedTrump(sKey)}
                  className={`py-2 px-2 rounded-lg border text-xs font-black flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                    isSelected
                      ? `${s.bgColor} ${s.color} ${s.borderColor} ring-2 ring-amber-400 scale-[1.03] shadow-md`
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-sm">{s.symbol}</span>
                  <span>{s.name}</span>
                  {s.isDouble && (
                    <span className="text-[9px] bg-amber-500 text-slate-950 px-1 rounded font-black">
                      x2
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Validation indicators: Bidding & Actuals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Bidding validation card */}
          <div
            className={`p-3 rounded-xl border text-xs space-y-1 ${
              biddingAnalysis.hasIndividualInvalidBids || biddingAnalysis.isDealerForbiddenViolated
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : biddingAnalysis.bidsStatus === 'under'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : biddingAnalysis.bidsStatus === 'over'
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center space-x-1.5">
                <Calculator className="w-4 h-4" />
                <span>Bazas Pedidas:</span>
              </span>
              <span className="font-black text-white">
                {biddingAnalysis.totalBids} / {currentRound.cards}
              </span>
            </div>
            <p className="text-[11px] opacity-90">
              {biddingAnalysis.hasIndividualInvalidBids
                ? '⚠️ Hay apuestas imposibles (> cartas)'
                : biddingAnalysis.isDealerForbiddenViolated
                ? `🚫 Prohibido: Repartidor no puede pedir ${biddingAnalysis.forbiddenDealerBid}`
                : biddingAnalysis.bidsStatus === 'under'
                ? `Faltan ${biddingAnalysis.differenceAbs} bazas por pedir`
                : biddingAnalysis.bidsStatus === 'over'
                ? `+${biddingAnalysis.differenceAbs} bazas de más`
                : 'Suma exacta'}
            </p>
          </div>

          {/* Actuals validation card */}
          <div
            className={`p-3 rounded-xl border text-xs space-y-1 ${
              tricksMatch
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center space-x-1.5">
                {tricksMatch ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                <span>Bazas Hechas:</span>
              </span>
              <span className="font-black text-white">
                {totalActuals} / {currentRound.cards}
              </span>
            </div>
            <p className="text-[11px] opacity-90">
              {tricksMatch ? '✓ Cuadre perfecto con las cartas' : `Deben sumar exactamente ${currentRound.cards} bazas`}
            </p>
          </div>
        </div>

        {/* Players Score Inputs Table */}
        <div className="space-y-3">
          {players.map((p) => {
            const joinedIdx = p.joinedAtRoundIndex;
            const joinedAfter = joinedIdx !== undefined && selectedRoundIdx < joinedIdx;

            if (joinedAfter) {
              return (
                <div
                  key={p.id}
                  className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3 flex items-center justify-between text-xs text-slate-500"
                >
                  <div className="flex items-center space-x-2">
                    <span>{p.avatar}</span>
                    <span className="font-bold">{p.name}</span>
                  </div>
                  <span className="italic">(Aún no se había unido a la partida)</span>
                </div>
              );
            }

            const current = localScores[p.id] || { bid: 0, actual: 0 };

            return (
              <div
                key={p.id}
                className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Player info */}
                <div className="flex items-center space-x-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-base border border-slate-700"
                    style={{ backgroundColor: `${p.color}20`, borderColor: p.color }}
                  >
                    {p.avatar}
                  </div>
                  <span className="font-extrabold text-white text-sm">{p.name}</span>
                </div>

                {/* Score Controls */}
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  {/* Pedidas */}
                  <div className="flex items-center space-x-1.5 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-amber-400/80 mr-1">
                      Pedidas:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBidChange(p.id, -1)}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 font-black text-white text-sm transition"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={currentRound.cards}
                      value={current.bid}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setLocalScores((prev) => ({
                          ...prev,
                          [p.id]: { ...prev[p.id], bid: Math.max(0, Math.min(currentRound.cards, val)) },
                        }));
                      }}
                      className="w-8 bg-transparent text-center font-black text-amber-300 text-sm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleBidChange(p.id, 1)}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 font-black text-white text-sm transition"
                    >
                      +
                    </button>
                  </div>

                  {/* Hechas */}
                  <div className="flex items-center space-x-1.5 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-emerald-400/80 mr-1">
                      Hechas:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleActualChange(p.id, -1)}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 font-black text-white text-sm transition"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={currentRound.cards}
                      value={current.actual}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setLocalScores((prev) => ({
                          ...prev,
                          [p.id]: { ...prev[p.id], actual: Math.max(0, Math.min(currentRound.cards, val)) },
                        }));
                      }}
                      className="w-8 bg-transparent text-center font-black text-emerald-400 text-sm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleActualChange(p.id, 1)}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 font-black text-white text-sm transition"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          {showDeleteConfirm ? (
            <div className="bg-red-950/40 border border-red-500/40 p-3.5 rounded-xl space-y-2.5">
              <div className="flex items-center space-x-2 text-red-400 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>¿Seguro que deseas eliminar la Ronda {currentRound.roundNumber} ({currentRound.cards} {currentRound.cards === 1 ? 'carta' : 'cartas'})?</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Esta acción borrará esta mano de la partida y reordenará las rondas restantes automáticamente.
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteRound) {
                      onDeleteRound(selectedRoundIdx);
                    }
                    setShowDeleteConfirm(false);
                    onClose();
                  }}
                  className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center justify-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sí, Eliminar Ronda</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              {onDeleteRound && rounds.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="py-2.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl transition text-xs font-bold flex items-center space-x-1.5 cursor-pointer shrink-0"
                  title="Eliminar esta ronda de la partida"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Eliminar Ronda</span>
                </button>
              )}

              <div className="flex items-center space-x-2 flex-1 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition text-xs sm:text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-xl transition text-xs sm:text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar y Recalcular</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
