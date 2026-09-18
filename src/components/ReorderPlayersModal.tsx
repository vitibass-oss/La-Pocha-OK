import React, { useState } from 'react';
import { Player, Round } from '../types';
import {
  Users,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Crown,
  Check,
  X,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface ReorderPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  currentRound?: Round;
  onSaveOrder: (newPlayers: Player[], rotateFutureDealers: boolean) => void;
}

export const ReorderPlayersModal: React.FC<ReorderPlayersModalProps> = ({
  isOpen,
  onClose,
  players,
  currentRound,
  onSaveOrder,
}) => {
  const [orderedPlayers, setOrderedPlayers] = useState<Player[]>(() => [...players]);
  const [rotateFutureDealers, setRotateFutureDealers] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Sync if modal opens with different players
  React.useEffect(() => {
    if (isOpen) {
      setOrderedPlayers([...players]);
      setRotateFutureDealers(true);
      setDraggedIndex(null);
    }
  }, [isOpen, players]);

  if (!isOpen) return null;

  const dealerId = currentRound ? players[currentRound.dealerIndex % players.length]?.id : null;

  const movePlayer = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedPlayers.length) return;

    setOrderedPlayers((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${index}`);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    setOrderedPlayers((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(draggedIndex, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
    setDraggedIndex(null);
  };

  const handleReset = () => {
    setOrderedPlayers([...players]);
  };

  const handleSave = () => {
    onSaveOrder(orderedPlayers, rotateFutureDealers);
    onClose();
  };

  const currentDealerInNewOrder = orderedPlayers.findIndex((p) => p.id === dealerId);
  const manoIndex =
    currentDealerInNewOrder >= 0
      ? (currentDealerInNewOrder + 1) % orderedPlayers.length
      : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xl shadow-md shadow-amber-500/10">
              🪑
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Posición en la Mesa</h3>
              <p className="text-xs text-slate-400">
                Arrastra o mueve los jugadores según su posición física real
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative description banner */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center space-x-1.5 text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span>Rotación de Mesa en Sentido Horario</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Total: {orderedPlayers.length} jugadores
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Organiza los jugadores en el orden exacto en que están sentados. El juego seguirá este
            orden para la subasta, turnos de pedir y dar cartas en las siguientes rondas.
          </p>
        </div>

        {/* Players Reorder List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] uppercase font-bold tracking-wider text-slate-400 px-2">
            <span>Orden de Asientos (Arrastra para mover)</span>
            <button
              type="button"
              onClick={handleReset}
              className="text-amber-400 hover:text-amber-300 flex items-center space-x-1 transition cursor-pointer lowercase first-letter:uppercase"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restablecer orden</span>
            </button>
          </div>

          <div className="space-y-2">
            {orderedPlayers.map((player, idx) => {
              const isDealer = player.id === dealerId;
              const isMano = idx === manoIndex && dealerId !== null;
              const isDragging = draggedIndex === idx;

              return (
                <div
                  key={player.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={() => setDraggedIndex(null)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition select-none cursor-grab active:cursor-grabbing ${
                    isDragging
                      ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500 scale-[1.02] shadow-xl'
                      : isDealer
                      ? 'bg-slate-950/90 border-amber-500/40 hover:border-amber-500/70'
                      : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* Drag Handle */}
                    <div className="text-slate-500 hover:text-slate-300 p-1 cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Seat Index Badge */}
                    <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-slate-300 shrink-0">
                      {idx + 1}
                    </div>

                    {/* Avatar & Color */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border"
                      style={{
                        backgroundColor: `${player.color}20`,
                        borderColor: `${player.color}60`,
                      }}
                    >
                      {player.avatar}
                    </div>

                    {/* Player Name and Badges */}
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-white truncate">
                          {player.name}
                        </span>
                        {isDealer && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1 shrink-0">
                            <Crown className="w-3 h-3" />
                            <span>Repartidor actual</span>
                          </span>
                        )}
                        {isMano && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                            ✋ Mano
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Move Up/Down Controls for Touch / Accessibility */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => movePlayer(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-300 hover:text-white transition cursor-pointer"
                      title="Mover arriba"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => movePlayer(idx, 'down')}
                      disabled={idx === orderedPlayers.length - 1}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-300 hover:text-white transition cursor-pointer"
                      title="Mover abajo"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Table Seating Simulation Preview */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 block">
            Sentido de juego en la mesa:
          </span>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {orderedPlayers.map((p, idx) => {
              const isDealer = p.id === dealerId;
              const isMano = idx === manoIndex && dealerId !== null;

              return (
                <React.Fragment key={p.id}>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 ${
                      isDealer
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                        : isMano
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    <span>{p.avatar}</span>
                    <span>{p.name}</span>
                    {isDealer && <span>👑</span>}
                    {isMano && <span>✋</span>}
                  </span>
                  {idx < orderedPlayers.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Future Dealers Rotation Checkbox */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <label className="flex items-start space-x-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={rotateFutureDealers}
              onChange={(e) => setRotateFutureDealers(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-400 accent-amber-500"
            />
            <div className="text-xs leading-relaxed">
              <span className="font-bold text-white block">
                Adaptar automáticamente los repartidores de las rondas futuras
              </span>
              <span className="text-slate-400 text-[11px]">
                Asegura que el turno de dar las cartas siga pasando de forma ordenada al siguiente
                jugador sentado a la izquierda.
              </span>
            </div>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition text-xs cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-xl transition text-xs shadow-lg shadow-amber-500/20 flex items-center space-x-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Guardar Nueva Posición</span>
          </button>
        </div>
      </div>
    </div>
  );
};
