import React, { useState, useRef, useEffect } from 'react';
import { Player, PlayerStats, Round } from '../types';
import { PLAYER_AVATARS, PLAYER_COLORS, getMaxCards } from '../utils/pocha';
import {
  UserPlus,
  Sparkles,
  Mic,
  X,
  Check,
  Award,
  ArrowRight,
  Table,
  Crown,
  Users,
  GripVertical,
  ChevronUp,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingPlayers: Player[];
  stats: PlayerStats[];
  currentRoundIndex: number;
  currentRound?: Round;
  deckCards?: number;
  onAddPlayer: (
    newPlayer: Player,
    insertPosition?: number,
    recalculateRoundTable?: boolean,
    customOrderedPlayers?: Player[]
  ) => void;
}

export const AddPlayerModal: React.FC<AddPlayerModalProps> = ({
  isOpen,
  onClose,
  existingPlayers,
  stats,
  currentRoundIndex,
  currentRound,
  deckCards = 40,
  onAddPlayer,
}) => {
  // Find player with lowest total points
  const minPoints = stats.length > 0 ? Math.min(...stats.map((s) => s.totalPoints)) : 0;
  const minPlayer = stats.find((s) => s.totalPoints === minPoints);

  const dealerIdx = currentRound ? currentRound.dealerIndex % existingPlayers.length : 0;
  const currentDealer = existingPlayers[dealerIdx] || existingPlayers[0];

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(
    PLAYER_AVATARS[(existingPlayers.length + 2) % PLAYER_AVATARS.length]
  );
  const [color, setColor] = useState(
    PLAYER_COLORS[existingPlayers.length % PLAYER_COLORS.length]
  );
  const [recalculateRoundTable, setRecalculateRoundTable] = useState(true);

  // Table seating order state: array of items (existing players + new player token)
  const NEW_PLAYER_ID = '__NEW_PLAYER__';
  const [seatingOrder, setSeatingOrder] = useState<string[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const initSeatingOrder = () => {
    // Default position is immediately after dealer
    const order: string[] = [];
    existingPlayers.forEach((p, idx) => {
      order.push(p.id);
      if (idx === dealerIdx) {
        order.push(NEW_PLAYER_ID);
      }
    });
    if (!order.includes(NEW_PLAYER_ID)) {
      order.push(NEW_PLAYER_ID);
    }
    setSeatingOrder(order);
  };

  useEffect(() => {
    if (isOpen) {
      setName('');
      setAvatar(PLAYER_AVATARS[(existingPlayers.length + 2) % PLAYER_AVATARS.length]);
      setColor(PLAYER_COLORS[existingPlayers.length % PLAYER_COLORS.length]);
      setRecalculateRoundTable(true);
      setDraggedIdx(null);
      initSeatingOrder();
    }
  }, [isOpen, existingPlayers.length]);

  if (!isOpen) return null;

  const currentMaxCards = getMaxCards(existingPlayers.length, deckCards);
  const newMaxCards = getMaxCards(existingPlayers.length + 1, deckCards);

  const handleVoiceDictate = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Dictado por voz no disponible en este navegador.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'es-ES';

    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);

    rec.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const cleaned = transcript.trim();
      if (cleaned) {
        const formatted = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        setName(formatted);
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const moveSeatingItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= seatingOrder.length || fromIdx === toIdx) return;
    setSeatingOrder((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      return copy;
    });
  };

  const setPresetPosition = (position: 'after-dealer' | 'end') => {
    if (position === 'after-dealer') {
      initSeatingOrder();
    } else {
      const order = existingPlayers.map((p) => p.id);
      order.push(NEW_PLAYER_ID);
      setSeatingOrder(order);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || `Jugador ${existingPlayers.length + 1}`;

    const newPlayer: Player = {
      id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: finalName,
      avatar,
      color,
      startingPoints: minPoints,
      joinedAtRoundIndex: currentRoundIndex,
    };

    // Calculate ordered players list according to seatingOrder
    const playerMap: Record<string, Player> = {};
    existingPlayers.forEach((p) => {
      playerMap[p.id] = p;
    });
    playerMap[NEW_PLAYER_ID] = newPlayer;

    const finalOrderedPlayers: Player[] = seatingOrder
      .map((id) => playerMap[id])
      .filter(Boolean);

    const newPlayerInsertIndex = seatingOrder.indexOf(NEW_PLAYER_ID);

    onAddPlayer(
      newPlayer,
      newPlayerInsertIndex >= 0 ? newPlayerInsertIndex : dealerIdx + 1,
      recalculateRoundTable,
      finalOrderedPlayers
    );
    onClose();
  };

  const newPlayerIndexInOrder = seatingOrder.indexOf(NEW_PLAYER_ID);
  const dealerIndexInOrder = seatingOrder.indexOf(currentDealer.id);
  const isImmediatelyAfterDealer =
    dealerIndexInOrder >= 0 &&
    newPlayerIndexInOrder === (dealerIndexInOrder + 1) % seatingOrder.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Añadir Jugador y Posición en Mesa</h3>
              <p className="text-xs text-slate-400">
                Incorpora un nuevo jugador, organízalo en la mesa y adapta las rondas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rule Banner: Starts with fewest points */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
            <Award className="w-4 h-4 shrink-0" />
            <span>Puntuación Inicial por Reglas Oficiales</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            El nuevo jugador entra con la puntuación de quien tiene{' '}
            <strong className="text-amber-300">menos puntos ({minPoints} pts)</strong> para no alterar la equidad de la partida.
          </p>
          {minPlayer && (
            <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-400">Puntos heredados de {minPlayer.player.name}:</span>
              <span className="font-extrabold text-amber-300">{minPoints} pts</span>
            </div>
          )}
        </div>

        {/* Player Setup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Input */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Nombre del Nuevo Jugador
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Jugador ${existingPlayers.length + 1}`}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none transition"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={handleVoiceDictate}
                className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
                }`}
                title="Dictar nombre por voz"
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Interactive Seating Reordering List */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                <Crown className="w-3.5 h-3.5" />
                <span>Posición y Asiento en la Mesa</span>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setPresetPosition('after-dealer')}
                  className={`text-[11px] px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                    isImmediatelyAfterDealer
                      ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                  title="Sentar inmediatamente a la izquierda del repartidor"
                >
                  Tras Repartidor (Mano)
                </button>
                <button
                  type="button"
                  onClick={() => setPresetPosition('end')}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold transition cursor-pointer"
                  title="Sentar al final"
                >
                  Al Final
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Arrastra o usa las flechas para situar al nuevo jugador en el lugar exacto de la mesa:
            </p>

            {/* List of seats with drag & drop */}
            <div className="space-y-1.5">
              {seatingOrder.map((id, idx) => {
                const isNewPlayer = id === NEW_PLAYER_ID;
                const existing = existingPlayers.find((p) => p.id === id);
                const isDealer = existing && existing.id === currentDealer.id;
                const isMano = idx === (dealerIndexInOrder + 1) % seatingOrder.length;
                const isDragging = draggedIdx === idx;

                const displayName = isNewPlayer
                  ? name.trim() || 'Nuevo Jugador'
                  : existing?.name || `Jugador`;
                const displayAvatar = isNewPlayer ? avatar : existing?.avatar || '👤';
                const displayColor = isNewPlayer ? color : existing?.color || '#3b82f6';

                return (
                  <div
                    key={id}
                    draggable
                    onDragStart={(e) => {
                      setDraggedIdx(idx);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', `${idx}`);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedIdx !== null && draggedIdx !== idx) {
                        moveSeatingItem(draggedIdx, idx);
                      }
                      setDraggedIdx(null);
                    }}
                    onDragEnd={() => setDraggedIdx(null)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition select-none ${
                      isDragging
                        ? 'border-amber-500 ring-2 ring-amber-500 bg-amber-500/20 scale-[1.01]'
                        : isNewPlayer
                        ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md shadow-emerald-950/20'
                        : isDealer
                        ? 'bg-amber-950/30 border-amber-500/40'
                        : 'bg-slate-900/70 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className="text-slate-500 hover:text-amber-400 p-0.5 cursor-grab active:cursor-grabbing"
                        title="Arrastrar para mover posición"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>

                      <span className="w-5 h-5 rounded-md bg-slate-800 text-[11px] font-black text-slate-300 flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>

                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 border"
                        style={{
                          backgroundColor: `${displayColor}25`,
                          borderColor: `${displayColor}60`,
                        }}
                      >
                        {displayAvatar}
                      </div>

                      <div className="flex items-center space-x-1.5 truncate">
                        <span
                          className={`font-bold text-xs truncate ${
                            isNewPlayer ? 'text-emerald-300 font-black' : 'text-white'
                          }`}
                        >
                          {displayName}
                        </span>

                        {isNewPlayer && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                            NUEVO
                          </span>
                        )}

                        {isDealer && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                            👑 Dador
                          </span>
                        )}

                        {isMano && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40 shrink-0">
                            ✋ Mano
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Move Up/Down Controls */}
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveSeatingItem(idx, idx - 1)}
                        disabled={idx === 0}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 disabled:pointer-events-none text-slate-300 hover:text-white transition cursor-pointer"
                        title="Mover antes en la mesa"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSeatingItem(idx, idx + 1)}
                        disabled={idx === seatingOrder.length - 1}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 disabled:pointer-events-none text-slate-300 hover:text-white transition cursor-pointer"
                        title="Mover después en la mesa"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table seating preview */}
            <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800/80 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Sentido de juego resultante:
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-slate-300 text-xs">
                {seatingOrder.map((id, idx) => {
                  const isNewPlayer = id === NEW_PLAYER_ID;
                  const existing = existingPlayers.find((p) => p.id === id);
                  const isDealer = existing && existing.id === currentDealer.id;
                  const isMano = idx === (dealerIndexInOrder + 1) % seatingOrder.length;

                  return (
                    <React.Fragment key={id}>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center space-x-1 ${
                          isNewPlayer
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                            : isDealer
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : isMano
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {isDealer && <span>👑</span>}
                        {isMano && <span>✋</span>}
                        <span>
                          {isNewPlayer ? name.trim() || 'Nuevo Jugador' : existing?.name}
                        </span>
                      </span>
                      {idx < seatingOrder.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Change Round Tables Option */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                <Table className="w-3.5 h-3.5" />
                <span>Adaptar Tablas de Rondas</span>
              </span>
              <span className="text-[11px] font-extrabold text-slate-300">
                {existingPlayers.length} ➔ {existingPlayers.length + 1} Jugadores
              </span>
            </div>

            <label className="flex items-start space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={recalculateRoundTable}
                onChange={(e) => setRecalculateRoundTable(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 accent-emerald-500"
              />
              <div className="text-xs leading-relaxed">
                <span className="font-bold text-white block">
                  Cambiar y regenerar las rondas restantes de la partida
                </span>
                <span className="text-slate-400 text-[11px] block mt-0.5">
                  Recalcula las cartas máximas ({currentMaxCards} ➔ {newMaxCards} cartas) y redistribuye equitativamente las manos restantes (subastado, vueltas y bajada) para {existingPlayers.length + 1} jugadores.
                </span>
              </div>
            </label>
          </div>

          {/* Avatar Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Avatar
            </label>
            <div className="flex flex-wrap gap-2">
              {PLAYER_AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition border cursor-pointer ${
                    avatar === a
                      ? 'bg-amber-500/20 border-amber-500 scale-110'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Color Distintivo
            </label>
            <div className="flex flex-wrap gap-2">
              {PLAYER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition cursor-pointer ${
                    color === c ? 'ring-4 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition text-sm cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-xl transition text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Unir y Guardar Mesa</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
