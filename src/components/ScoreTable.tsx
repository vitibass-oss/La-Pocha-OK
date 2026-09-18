import React, { useState } from 'react';
import { Player, Round, Suit } from '../types';
import { SUITS } from '../utils/pocha';
import { Table, Edit2, Check, X, ChevronRight, Eye } from 'lucide-react';

interface ScoreTableProps {
  players: Player[];
  rounds: Round[];
  currentRoundIndex: number;
  onEditRoundScore: (roundIndex: number, playerId: string, bid: number, actual: number) => void;
  onSelectRoundIndex: (roundIndex: number) => void;
  onOpenEditRoundModal?: () => void;
}

export const ScoreTable: React.FC<ScoreTableProps> = ({
  players,
  rounds,
  currentRoundIndex,
  onEditRoundScore,
  onSelectRoundIndex,
  onOpenEditRoundModal,
}) => {
  const [editingCell, setEditingCell] = useState<{
    roundIndex: number;
    playerId: string;
    bid: number;
    actual: number;
  } | null>(null);

  const handleStartEdit = (roundIndex: number, player: Player, currentBid: number, currentActual: number) => {
    setEditingCell({
      roundIndex,
      playerId: player.id,
      bid: currentBid,
      actual: currentActual,
    });
  };

  const handleSaveEdit = () => {
    if (editingCell) {
      onEditRoundScore(
        editingCell.roundIndex,
        editingCell.playerId,
        editingCell.bid,
        editingCell.actual
      );
      setEditingCell(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Table Header Controls */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Table className="w-5 h-5 text-amber-400" />
          <h3 className="font-extrabold text-white text-base">Tabla General de Puntuaciones</h3>
        </div>
        <div className="flex items-center space-x-3">
          {onOpenEditRoundModal && (
            <button
              onClick={onOpenEditRoundModal}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center space-x-1"
              title="Abrir editor completo para corregir puntuaciones de cualquier ronda"
            >
              <Edit2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Corregir Ronda</span>
            </button>
          )}
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Toca cualquier celda o botón para corregir
          </span>
        </div>
      </div>

      {/* Overflow Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-extrabold">
              <th className="p-3 w-14 text-center">Ronda</th>
              <th className="p-3 w-16 text-center">Cartas</th>
              <th className="p-3 w-16 text-center">Triunfo</th>
              <th className="p-3 w-28 text-left">Repartidor</th>

              {/* Player Columns */}
              {players.map((p) => (
                <th
                  key={p.id}
                  className="p-3 text-center min-w-[100px] border-l border-slate-800/80"
                >
                  <div className="flex flex-col items-center justify-center space-y-0.5">
                    <span className="text-base">{p.avatar}</span>
                    <span className="font-bold text-white text-xs truncate max-w-[80px]">
                      {p.name}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60">
            {rounds.map((round, rIdx) => {
              const isCurrent = rIdx === currentRoundIndex;
              const isCompleted = round.phase === 'completed';
              const dealer = players[round.dealerIndex] || players[0] || { name: 'Jugador 1' };
              const suit = SUITS[round.trump] || SUITS['oros'];

              return (
                <tr
                  key={round.id}
                  onClick={() => isCompleted && onSelectRoundIndex(rIdx)}
                  className={`transition cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-500/10 font-bold border-y-2 border-amber-500/50'
                      : isCompleted
                      ? 'hover:bg-slate-800/50'
                      : 'opacity-40 bg-slate-950/30'
                  }`}
                >
                  {/* Round Number */}
                  <td className="p-3 text-center font-bold text-slate-300">
                    {round.roundNumber}
                  </td>

                  {/* Cards Count */}
                  <td className="p-3 text-center font-extrabold text-amber-300">
                    {round.cards}
                  </td>

                  {/* Trump Suit */}
                  <td className="p-3 text-center">
                    <span
                      className={`inline-flex items-center space-x-1 px-2 py-1 rounded border text-xs font-bold ${suit.bgColor} ${suit.color} ${suit.borderColor}`}
                    >
                      <span>{suit.symbol}</span>
                      {suit.isDouble && (
                        <span className="text-[9px] bg-amber-500 text-slate-950 px-1 rounded font-black">
                          x2
                        </span>
                      )}
                    </span>
                  </td>

                  {/* Dealer */}
                  <td className="p-3 text-left font-medium text-slate-300">
                    <span className="truncate block max-w-[100px] text-xs">
                      👑 {dealer.name}
                    </span>
                  </td>

                  {/* Player Scores in this round */}
                  {players.map((player) => {
                    const score = round.scores[player.id];
                    const isEditingThisCell =
                      editingCell?.roundIndex === rIdx && editingCell?.playerId === player.id;

                    return (
                      <td
                        key={player.id}
                        className="p-2.5 text-center border-l border-slate-800/60 relative"
                      >
                        {isEditingThisCell ? (
                          /* Cell Edit Form */
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900 border border-amber-500 rounded-lg p-2 space-y-1 shadow-2xl z-20 min-w-[90px]"
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>Pedidas:</span>
                              <input
                                type="number"
                                min={0}
                                max={round.cards}
                                value={editingCell.bid}
                                onChange={(e) =>
                                  setEditingCell({
                                    ...editingCell,
                                    bid: parseInt(e.target.value, 10) || 0,
                                  })
                                }
                                className="w-10 bg-slate-800 border border-slate-700 text-white rounded text-center font-bold"
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>Hechas:</span>
                              <input
                                type="number"
                                min={0}
                                max={round.cards}
                                value={editingCell.actual}
                                onChange={(e) =>
                                  setEditingCell({
                                    ...editingCell,
                                    actual: parseInt(e.target.value, 10) || 0,
                                  })
                                }
                                className="w-10 bg-slate-800 border border-slate-700 text-white rounded text-center font-bold"
                              />
                            </div>
                            <div className="flex items-center justify-end space-x-1 pt-1">
                              <button
                                onClick={handleSaveEdit}
                                className="p-1 bg-emerald-500 text-slate-950 rounded font-bold"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingCell(null)}
                                className="p-1 bg-slate-700 text-slate-300 rounded"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ) : isCompleted && score && score.bid !== null && score.bid !== undefined && score.actual !== null && score.actual !== undefined ? (
                          /* Render Completed Score Cell */
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(rIdx, player, score.bid ?? 0, score.actual ?? 0);
                            }}
                            className="group flex flex-col items-center justify-center p-1 rounded hover:bg-slate-800 transition"
                            title="Haz clic para corregir este resultado"
                          >
                            <div className="flex items-center space-x-1 text-xs">
                              <span className="font-semibold text-slate-400">
                                P:{score.bid}
                              </span>
                              <span className="text-slate-600">|</span>
                              <span
                                className={`font-bold ${
                                  score.hit ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                H:{score.actual}
                              </span>
                            </div>

                            {/* Round Points & Total */}
                            <div className="flex flex-col items-center space-y-0.5 mt-0.5">
                              {score.isPocha && (
                                <span className="text-[9px] font-black bg-amber-400 text-slate-950 px-1 rounded uppercase tracking-wider">
                                  🔥 POCHA
                                </span>
                              )}
                              <div className="flex items-center space-x-1.5">
                                <span
                                  className={`text-xs font-black px-1.5 py-0.2 rounded ${
                                    (score.points ?? 0) >= 0
                                      ? 'bg-emerald-500/15 text-emerald-400'
                                      : 'bg-rose-500/15 text-rose-400'
                                  }`}
                                >
                                  {(score.points ?? 0) >= 0 ? `+${score.points ?? 0}` : score.points}
                                </span>
                                <span className="text-[11px] text-slate-300 font-bold">
                                  ({score.accumulatedPoints ?? 0})
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : isCurrent ? (
                          <span className="text-xs text-amber-400 font-extrabold animate-pulse">
                            En Juego...
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
