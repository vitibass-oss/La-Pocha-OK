import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GameRules, Player } from '../types';
import { PLAYER_AVATARS, PLAYER_COLORS, getDefaultDeckForPlayers, TARGET_ROUNDS_FOR_PLAYERS, getMaxCards, getCardSequenceForProgression } from '../utils/pocha';
import { RecentWinner } from '../utils/history';
import { RecentWinnersBoard } from './RecentWinnersBoard';
import { RoundProgressionConfig } from './RoundProgressionConfig';
import { Users, Settings, Play, Sparkles, Check, HelpCircle, Mic, MicOff, FolderArchive, GripVertical, ChevronUp, ChevronDown, ArrowRight, Shuffle, RefreshCw } from 'lucide-react';

interface SetupGameProps {
  onStartGame: (players: Player[], rules: GameRules) => void;
  initialPlayers?: Player[];
  initialRules?: GameRules;
  recentWinners?: RecentWinner[];
  onOpenSavedGamesModal?: () => void;
  onResetAppToZero?: () => void;
}

export const SetupGame: React.FC<SetupGameProps> = ({
  onStartGame,
  initialPlayers,
  initialRules,
  recentWinners = [],
  onOpenSavedGamesModal,
  onResetAppToZero,
}) => {
  const [numPlayers, setNumPlayers] = useState<number>(initialPlayers?.length || 4);

  const defaultNames = ['Carlos', 'María', 'Pedro', 'Ana', 'Luis', 'Sofia', 'David', 'Javier'];

  const [playerList, setPlayerList] = useState<Array<{ name: string; color: string; avatar: string }>>(() => {
    if (initialPlayers && initialPlayers.length >= 4) {
      return initialPlayers.map((p) => ({
        name: p.name,
        color: p.color,
        avatar: p.avatar,
      }));
    }
    return Array.from({ length: 8 }).map((_, idx) => ({
      name: defaultNames[idx] || `Jugador ${idx + 1}`,
      color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
      avatar: PLAYER_AVATARS[idx % PLAYER_AVATARS.length],
    }));
  });

  const [rules, setRules] = useState<GameRules>(() => {
    const initNum = initialPlayers?.length || 4;
    const autoDeck = getDefaultDeckForPlayers(initNum);
    return initialRules || {
      forbiddenDealerBid: true,
      doubleOros: true,
      allowSinTriunfo: true,
      deckCards: autoDeck,
      pochaDoubleDouble: true,
      enableSubastado: true,
      singleMaxCardsRound: false,
      randomTrumpAfterSubastado: true,
      visibleTrumpAfterSubastado: false,
      zeroBidRule: 'standard',
      zeroBidCustomPoints: 10,
      zeroBidFailPenalty: 'standard',
    };
  });

  const [voiceTargetIndex, setVoiceTargetIndex] = useState<number | 'all' | null>(null);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceSpokenText, setVoiceSpokenText] = useState('');
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef<boolean>(false);

  const deckCards = rules.deckCards || getDefaultDeckForPlayers(numPlayers);

  // Total rounds computed dynamically based on selected progression mode
  const totalRounds = useMemo(() => {
    const maxC = getMaxCards(numPlayers, deckCards);
    return getCardSequenceForProgression(
      rules.roundProgressionMode || 'standard',
      numPlayers,
      maxC,
      {
        constantCardsCount: rules.constantCardsCount,
        constantRoundsCount: rules.constantRoundsCount,
        roundsPerLevel: rules.roundsPerLevel,
        customCardSequence: rules.customCardSequence,
      }
    ).length;
  }, [rules, numPlayers, deckCards]);

  // Auto-switch deck cards when player count changes
  const handleNumPlayersChange = (count: number) => {
    setNumPlayers(count);
    const autoDeck = getDefaultDeckForPlayers(count);
    setRules((prev) => ({ ...prev, deckCards: autoDeck }));
  };

  // Voice recognition setup for Player Names
  const startVoiceForPlayer = (target: number | 'all') => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Tu navegador no soporta micrófono de voz directo. Puedes escribir los nombres.');
      return;
    }

    if (isListeningVoice && voiceTargetIndex === target) {
      // Stop listening
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListeningVoice(false);
      setVoiceTargetIndex(null);
      return;
    }

    // Stop existing if any
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }

    setVoiceTargetIndex(target);
    setVoiceSpokenText('');
    shouldListenRef.current = true;

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'es-ES';

      rec.onstart = () => {
        setIsListeningVoice(true);
      };

      rec.onend = () => {
        setIsListeningVoice(false);
        setVoiceTargetIndex(null);
        shouldListenRef.current = false;
      };

      rec.onerror = (e: any) => {
        console.warn('Voice error:', e?.error);
        setIsListeningVoice(false);
        setVoiceTargetIndex(null);
        shouldListenRef.current = false;
      };

      rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        const cleaned = transcript.trim();
        setVoiceSpokenText(cleaned);

        if (target === 'all') {
          // Split names by comma, 'y', 'con', spaces or 'jugador'
          const rawNames = cleaned
            .replace(/jugador \d+/gi, '')
            .split(/[,;\n\t]|(?:\s+y\s+)|(?:\s+e\s+)/i)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

          if (rawNames.length > 0) {
            setPlayerList((prev) => {
              const copy = [...prev];
              rawNames.forEach((name, i) => {
                if (i < numPlayers) {
                  const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
                  copy[i].name = formattedName;
                }
              });
              return copy;
            });
          }
        } else if (typeof target === 'number') {
          if (cleaned) {
            const formattedName = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
            setPlayerList((prev) => {
              const copy = [...prev];
              copy[target].name = formattedName;
              return copy;
            });
          }
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.warn('Rec start error:', err);
      setIsListeningVoice(false);
      setVoiceTargetIndex(null);
      shouldListenRef.current = false;
    }
  };

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      recognitionRef.current = null;
      setIsListeningVoice(false);
    };
  }, []);

  const handleDeckCardsChange = (cardsCount: number) => {
    setRules((prev) => ({ ...prev, deckCards: cardsCount }));
  };

  const [draggedPlayerIndex, setDraggedPlayerIndex] = useState<number | null>(null);

  const movePlayerInList = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= numPlayers || fromIndex === toIndex) return;
    setPlayerList((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  };

  const handleNameChange = (index: number, name: string) => {
    const updated = [...playerList];
    updated[index].name = name;
    setPlayerList(updated);
  };

  const handleColorChange = (index: number, color: string) => {
    const updated = [...playerList];
    updated[index].color = color;
    setPlayerList(updated);
  };

  const handleAvatarChange = (index: number, avatar: string) => {
    const updated = [...playerList];
    updated[index].avatar = avatar;
    setPlayerList(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPlayers: Player[] = playerList.slice(0, numPlayers).map((p, idx) => ({
      id: `player_${idx + 1}`,
      name: p.name.trim() || `Jugador ${idx + 1}`,
      color: p.color,
      avatar: p.avatar,
    }));
    onStartGame(finalPlayers, rules);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* 🏆 Persistent History: Last 5 Winners Board */}
      <RecentWinnersBoard
        winners={recentWinners}
        onOpenHistoryModal={onOpenSavedGamesModal}
      />

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Bento Header Banner */}
        <div className="bg-slate-950 p-6 sm:p-8 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.6)] animate-pulse" />
                <span className="text-xs font-mono font-bold text-yellow-500 uppercase tracking-widest">
                  Partida Personalizada
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase italic">
                Pocha <span className="text-yellow-500 underline decoration-4 underline-offset-4">Tracker</span>
              </h1>
              <p className="text-slate-400 text-sm font-mono mt-1">
                Configura jugadores, mazo de cartas y normas de puntuación
              </p>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              {onResetAppToZero && (
                <button
                  type="button"
                  onClick={onResetAppToZero}
                  className="bg-slate-900 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/50 px-3 py-2.5 rounded-xl text-center text-xs font-bold text-slate-400 hover:text-rose-300 transition flex items-center space-x-1.5 cursor-pointer"
                  title="Reiniciar la aplicación de cero (restablecer cachés y datos locales)"
                >
                  <RefreshCw className="w-4 h-4 text-rose-400" />
                  <span className="hidden sm:inline">Restablecer de Cero</span>
                </button>
              )}

              {onOpenSavedGamesModal && (
                <button
                  type="button"
                  onClick={onOpenSavedGamesModal}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-700 px-3.5 py-2.5 rounded-xl text-center text-xs font-bold text-slate-300 hover:text-amber-400 transition flex items-center space-x-1.5 cursor-pointer"
                  title="Abrir almacén de partidas guardadas"
                >
                  <FolderArchive className="w-4 h-4 text-amber-400" />
                  <span>Histórico</span>
                </button>
              )}

              <div className="bg-slate-900 border border-slate-700 px-4 py-2.5 rounded-xl text-center min-w-[120px]">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cartas en Mazo</p>
                <p className="text-2xl font-black text-yellow-500">{deckCards}</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8 text-white">
          {/* 1. Selector de Jugadores & Cartas del Mazo (Bento Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Jugadores */}
            <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center space-x-2 text-yellow-500 font-bold">
                <Users className="w-5 h-5 text-yellow-500" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  1. Número de Jugadores
                </h3>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {[3, 4, 5, 6, 7, 8].map((count) => {
                  const isSelected = numPlayers === count;
                  const roundsCount = TARGET_ROUNDS_FOR_PLAYERS[count] || 32;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => handleNumPlayersChange(count)}
                      className={`py-2.5 px-1 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-yellow-500 text-slate-950 border-yellow-400 font-black shadow-[0_0_12px_rgba(234,179,8,0.4)] scale-105'
                          : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700 font-semibold'
                      }`}
                    >
                      <span className="text-lg font-black">{count}</span>
                      <span className="text-[9px] uppercase font-bold tracking-wider opacity-80">
                        Jug.
                      </span>
                      <span className={`text-[8px] font-black px-1 rounded mt-0.5 ${
                        isSelected ? 'bg-slate-950/20 text-slate-950' : 'text-amber-400/90'
                      }`}>
                        {roundsCount}R
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Cartas de la Baraja */}
            <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-yellow-500 font-bold">
                  <span className="text-lg">🎴</span>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    2. Cartas en la Baraja
                  </h3>
                </div>
                <span className="text-xs font-mono text-yellow-500 font-bold">
                  Max: {Math.floor(deckCards / numPlayers)} cartas/mano
                </span>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {[36, 40, 48, 49, 50, 52].map((cardCount) => {
                  const isSelected = deckCards === cardCount;
                  return (
                    <button
                      key={cardCount}
                      type="button"
                      onClick={() => handleDeckCardsChange(cardCount)}
                      className={`py-3 px-1 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-yellow-500 text-slate-950 border-yellow-400 font-black shadow-[0_0_12px_rgba(234,179,8,0.4)] scale-105'
                          : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700 font-semibold'
                      }`}
                    >
                      <span className="text-xl font-black">{cardCount}</span>
                      <span className="text-[9px] uppercase font-bold tracking-wider opacity-80">
                        Cartas
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Deck Card Input Option */}
              <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 font-medium">Personalizar número exacto:</span>
                <input
                  type="number"
                  min={12}
                  max={100}
                  value={deckCards}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val > 0) {
                      handleDeckCardsChange(val);
                    }
                  }}
                  className="w-20 bg-slate-900 border border-slate-700 focus:border-yellow-500 text-yellow-400 font-black rounded-lg px-2 py-1 text-center text-sm outline-none"
                />
              </div>
            </section>
          </div>

          {/* 3. Estructura y Cartas por Ronda (Configuración y definición manual de rondas) */}
          <RoundProgressionConfig
            numPlayers={numPlayers}
            deckCards={deckCards}
            rules={rules}
            onChangeRules={setRules}
          />

          {/* 4. Lista de Jugadores & Posición en Mesa */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2 text-yellow-500 font-bold">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  4. Nombres y Orden en la Mesa
                </h3>
              </div>

              {/* Dictar Todos por Voz */}
              <button
                type="button"
                onClick={() => startVoiceForPlayer('all')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                  isListeningVoice && voiceTargetIndex === 'all'
                    ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>
                  {isListeningVoice && voiceTargetIndex === 'all'
                    ? 'Escuchando nombres... (Clic para parar)'
                    : '🎙️ Dictar Todos los Nombres por Voz'}
                </span>
              </button>
            </div>

            {voiceSpokenText && (
              <p className="text-xs text-amber-300 italic bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                Oído: "{voiceSpokenText}"
              </p>
            )}

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-slate-300">
                <GripVertical className="w-4 h-4 text-amber-400" />
                <span>Arrastra o pulsa las flechas para ordenar según estén sentados en la mesa.</span>
              </span>
              <span className="text-[11px] text-amber-400/90 font-bold hidden sm:inline">
                Jugador 1 da cartas en Ronda 1
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {playerList.slice(0, numPlayers).map((p, idx) => {
                const isThisPlayerMicActive = isListeningVoice && voiceTargetIndex === idx;
                const isDragging = draggedPlayerIndex === idx;

                return (
                  <div
                    key={idx}
                    draggable
                    onDragStart={(e) => {
                      setDraggedPlayerIndex(idx);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', `${idx}`);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedPlayerIndex !== null && draggedPlayerIndex !== idx) {
                        movePlayerInList(draggedPlayerIndex, idx);
                      }
                      setDraggedPlayerIndex(null);
                    }}
                    onDragEnd={() => setDraggedPlayerIndex(null)}
                    className={`bg-slate-900/80 border rounded-xl p-3 flex items-center space-x-2.5 transition select-none ${
                      isDragging
                        ? 'border-amber-500 ring-2 ring-amber-500 bg-amber-500/10 scale-[1.02]'
                        : isThisPlayerMicActive
                        ? 'border-amber-500 ring-1 ring-amber-500'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Drag Handle & Seat Number */}
                    <div
                      className="flex flex-col items-center justify-center text-slate-500 hover:text-amber-400 cursor-grab active:cursor-grabbing shrink-0"
                      title="Arrastrar para reordenar"
                    >
                      <GripVertical className="w-4 h-4" />
                      <span className="text-[9px] font-black text-slate-400 mt-0.5">#{idx + 1}</span>
                    </div>

                    {/* Avatar button */}
                    <button
                      type="button"
                      onClick={() => {
                        const nextAvatarIdx =
                          (PLAYER_AVATARS.indexOf(p.avatar) + 1) % PLAYER_AVATARS.length;
                        handleAvatarChange(idx, PLAYER_AVATARS[nextAvatarIdx]);
                      }}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg bg-slate-800 hover:bg-slate-700 transition border border-slate-700 cursor-pointer shrink-0"
                      title="Cambiar avatar"
                    >
                      {p.avatar}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block truncate">
                          {idx === 0 ? '👑 Dador inicial (R1)' : `Jugador ${idx + 1}`}
                        </label>
                        {/* Mic per player */}
                        <button
                          type="button"
                          onClick={() => startVoiceForPlayer(idx)}
                          className={`p-1 rounded transition text-xs flex items-center space-x-1 ${
                            isThisPlayerMicActive
                              ? 'text-rose-400 bg-rose-500/20 animate-pulse font-bold'
                              : 'text-slate-400 hover:text-amber-400'
                          }`}
                          title="Dictar nombre para este jugador"
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span className="text-[9px]">{isThisPlayerMicActive ? 'Habla...' : 'Dictar'}</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => handleNameChange(idx, e.target.value)}
                        placeholder={`Jugador ${idx + 1}`}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-yellow-500 rounded-lg px-2.5 py-1 text-sm font-bold text-white placeholder-slate-600 outline-none transition"
                        required
                      />
                    </div>

                    {/* Move Up/Down Quick Controls */}
                    <div className="flex flex-col space-y-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => movePlayerInList(idx, idx - 1)}
                        disabled={idx === 0}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 disabled:pointer-events-none text-slate-300 hover:text-white transition cursor-pointer"
                        title="Mover antes en la mesa"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePlayerInList(idx, idx + 1)}
                        disabled={idx === numPlayers - 1}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 disabled:pointer-events-none text-slate-300 hover:text-white transition cursor-pointer"
                        title="Mover después en la mesa"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Color Swatches */}
                    <div className="flex flex-col gap-1 w-5 justify-center shrink-0">
                      {PLAYER_COLORS.slice(0, 3).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleColorChange(idx, c)}
                          className={`w-3.5 h-3.5 rounded-full transition cursor-pointer ${
                            p.color === c ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Seating Table Flow Preview */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Orden de turno en la mesa (Sentido Horario):
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
                {playerList.slice(0, numPlayers).map((p, idx) => (
                  <React.Fragment key={idx}>
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-bold flex items-center space-x-1 ${
                        idx === 0
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : idx === 1
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span>{p.avatar}</span>
                      <span>{p.name.trim() || `Jugador ${idx + 1}`}</span>
                      {idx === 0 && <span title="Repartidor inicial">👑</span>}
                      {idx === 1 && <span title="Mano inicial">✋</span>}
                    </span>
                    {idx < numPlayers - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </section>

          {/* 5. Normas y Opciones */}
          <section className="space-y-4 pt-2 border-t border-slate-800">
            <div className="flex items-center space-x-2 text-yellow-500 font-bold">
              <Settings className="w-5 h-5 text-yellow-500" />
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                5. Reglas de Puntuación
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Regla Pocha Doble del Doble */}
              <label className="bg-slate-900/40 border border-slate-800 hover:border-yellow-500/40 rounded-xl p-4 flex items-start space-x-3 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={rules.pochaDoubleDouble !== false}
                  onChange={(e) => setRules({ ...rules, pochaDoubleDouble: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded accent-yellow-500 bg-slate-950 border-slate-800"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-base">🔥</span>
                    <span className="font-bold text-sm text-yellow-400">
                      Hacer Pocha (Doble del Doble)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Si se piden todas las bazas en manos de 4+ cartas (Pocha): acierto = +(5×cartas + 10)×2 (o ×4 en Oros). Ej. 8c en Oros: +200 / -200 ptos (8×5=40 + 10=50, ×2 Oros = 100, ×2 Pocha = 200).
                  </p>
                </div>
              </label>

              {/* Regla Ronda Única de Todas las Cartas vs Vuelta Completa */}
              <label className="bg-slate-900/40 border border-slate-800 hover:border-yellow-500/40 rounded-xl p-4 flex items-start space-x-3 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={rules.singleMaxCardsRound !== false}
                  onChange={(e) => setRules({ ...rules, singleMaxCardsRound: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded accent-yellow-500 bg-slate-950 border-slate-800"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-base">🃏</span>
                    <span className="font-bold text-sm text-emerald-400">
                      1 Sola Ronda de Todas las Cartas
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {rules.singleMaxCardsRound !== false
                      ? 'Se juega exactamente 1 sola mano en la cima con todas las cartas, pasando directamente a la bajada.'
                      : 'Se juega 1 vuelta completa de todas las cartas (1 mano repartida por cada jugador).'}
                  </p>
                </div>
              </label>

              {/* Regla Ronda de Subastado */}
              <label className="bg-slate-900/40 border border-slate-800 hover:border-yellow-500/40 rounded-xl p-4 flex items-start space-x-3 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={rules.enableSubastado !== false}
                  onChange={(e) => setRules({ ...rules, enableSubastado: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded accent-yellow-500 bg-slate-950 border-slate-800"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-base">👑</span>
                    <span className="font-bold text-sm text-purple-300">
                      Subastado en Todas las Cartas
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    En la ronda de todas las cartas, el jugador que pida más bazas elige el palo de triunfo.
                  </p>
                </div>
              </label>

              {/* Regla Triunfo Aleatorio si no es Subastado */}
              <label className="bg-slate-900/40 border border-slate-800 hover:border-yellow-500/40 rounded-xl p-4 flex items-start space-x-3 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={rules.randomTrumpAfterSubastado !== false}
                  onChange={(e) => setRules({ ...rules, randomTrumpAfterSubastado: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded accent-yellow-500 bg-slate-950 border-slate-800"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-base">🎲</span>
                    <span className="font-bold text-sm text-cyan-300">
                      Triunfo Aleatorio por Repartidor
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Si no se juega subastado, en la vuelta de cartas máximas cada repartidor saca una carta al azar de la baraja para definir su triunfo.
                  </p>
                </div>
              </label>

              {/* Regla de Oros Doble */}
              <label className="bg-slate-900/40 border border-slate-800 hover:border-yellow-500/40 rounded-xl p-4 flex items-start space-x-3 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={rules.doubleOros}
                  onChange={(e) => setRules({ ...rules, doubleOros: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded accent-yellow-500 bg-slate-950 border-slate-800"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-base">🪙</span>
                    <span className="font-bold text-sm text-yellow-400">
                      Oros Puntea Doble
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Si el triunfo es Oros: +20 por acertar (+10/baza) y -20 por fallar (-10/baza fallada).
                  </p>
                </div>
              </label>

              {/* Regla Prohibido Empatar Repartidor */}
              <label className="bg-slate-900/40 border border-slate-800 hover:border-yellow-500/40 rounded-xl p-4 flex items-start space-x-3 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={rules.forbiddenDealerBid}
                  onChange={(e) => setRules({ ...rules, forbiddenDealerBid: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded accent-yellow-500 bg-slate-950 border-slate-800"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-base">🚫</span>
                    <span className="font-bold text-sm text-yellow-400">
                      Prohibido Igualar el Repartidor
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    La suma de bazas pedidas por todos los jugadores no puede coincidir con el total de cartas de la mano.
                  </p>
                </div>
              </label>
            </div>

            {/* Panel Especial: Apuestas a Cero (Pedir 0 Bazas) - Premiar vs Penalizar */}
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-950 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center space-x-2.5">
                  <span className="text-xl">🎯</span>
                  <div>
                    <h4 className="font-black text-sm text-amber-300">
                      Apuestas a Cero Bazas (Pocha a Cero)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Configura si deseas premiar el mérito de no llevarse ninguna baza o penalizar el juego conservador.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 hidden sm:inline-block">
                  Personalizable
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Premio / Penalización al Acertar 0 Bazas */}
                <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                  <label className="text-xs font-bold text-emerald-400 flex items-center justify-between">
                    <span>Puntuación al ACERTAR 0 Bazas:</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {rules.zeroBidRule === 'reduced_penalty'
                        ? '+5 pts'
                        : rules.zeroBidRule === 'bonus_reward'
                        ? '+20 pts'
                        : rules.zeroBidRule === 'scaled_cards'
                        ? '+10 + 2×cartas'
                        : rules.zeroBidRule === 'custom_points'
                        ? `+${rules.zeroBidCustomPoints ?? 10} pts`
                        : '+10 pts (Estándar)'}
                    </span>
                  </label>

                  <select
                    value={rules.zeroBidRule || 'standard'}
                    onChange={(e) =>
                      setRules({
                        ...rules,
                        zeroBidRule: e.target.value as any,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs font-bold focus:border-amber-400 focus:outline-none cursor-pointer"
                  >
                    <option value="standard">
                      🏆 Estándar Oficial (+10 pts)
                    </option>
                    <option value="scaled_cards">
                      📈 Escalar por Dificultad (+10 base + 2 por carta en juego)
                    </option>
                    <option value="reduced_penalty">
                      ⚠️ Penalizar Cero Fácil (+5 pts reducidos)
                    </option>
                    <option value="bonus_reward">
                      🌟 Superpremio a Cero (+20 pts fijos)
                    </option>
                    <option value="custom_points">
                      ✏️ Puntuación Fija Personalizada...
                    </option>
                  </select>

                  {rules.zeroBidRule === 'custom_points' && (
                    <div className="pt-2 flex items-center space-x-2">
                      <span className="text-xs text-slate-300 font-medium">Puntos fijos al acertar 0:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={rules.zeroBidCustomPoints !== undefined ? rules.zeroBidCustomPoints : 10}
                        onChange={(e) =>
                          setRules({
                            ...rules,
                            zeroBidCustomPoints: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="w-20 bg-slate-900 border border-amber-500/50 rounded px-2 py-1 text-xs font-bold text-amber-300 text-center focus:outline-none"
                      />
                      <span className="text-xs text-slate-400">pts</span>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 leading-tight">
                    {rules.zeroBidRule === 'scaled_cards'
                      ? 'Recompensa la dificultad real: en 1 carta da 12 pts, en 5 cartas 20 pts y en 8 cartas 26 pts (+doble en Oros).'
                      : rules.zeroBidRule === 'reduced_penalty'
                      ? 'Otorga solo +5 puntos para incentivar a pedir bazas y castigar el juego pasivo.'
                      : rules.zeroBidRule === 'bonus_reward'
                      ? 'Premia el riesgo de quedarse a cero con +20 puntos en lugar de los 10 habituales.'
                      : rules.zeroBidRule === 'custom_points'
                      ? 'Define exactamente la cantidad de puntos que gana un jugador al pedir y hacer 0 bazas.'
                      : 'Regla clásica oficial: 10 puntos fijos (+ 5×0 bazas = +10 pts).'}
                  </p>
                </div>

                {/* 2. Penalización al Fallar Apuesta de 0 Bazas */}
                <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                  <label className="text-xs font-bold text-rose-400 flex items-center justify-between">
                    <span>Penalización al FALLAR con 0 Bazas:</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {rules.zeroBidFailPenalty === 'double_penalty'
                        ? '-20 - 10×bazas'
                        : rules.zeroBidFailPenalty === 'harsh_20'
                        ? '-20 - 5×bazas'
                        : '-10 - 5×bazas (Estándar)'}
                    </span>
                  </label>

                  <select
                    value={rules.zeroBidFailPenalty || 'standard'}
                    onChange={(e) =>
                      setRules({
                        ...rules,
                        zeroBidFailPenalty: e.target.value as any,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs font-bold focus:border-rose-400 focus:outline-none cursor-pointer"
                  >
                    <option value="standard">
                      🛡️ Estándar Oficial (-10 base - 5 por cada baza hecha)
                    </option>
                    <option value="double_penalty">
                      💥 Castigo Doble (-20 base - 10 por cada baza involuntaria)
                    </option>
                    <option value="harsh_20">
                      ⚡ Penalización Agravada (-20 base fija - 5 por baza)
                    </option>
                  </select>

                  <p className="text-[11px] text-slate-400 leading-tight">
                    {rules.zeroBidFailPenalty === 'double_penalty'
                      ? 'Castiga duramente "comerse" bazas tras pedir cero: resta -20 de base y -10 por cada baza ganada sin querer.'
                      : rules.zeroBidFailPenalty === 'harsh_20'
                      ? 'Aumenta la penalización base por fallo de -10 a -20 puntos.'
                      : 'Regla clásica: se resta -10 puntos de base y -5 por cada baza involuntaria que se haya ganado.'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-800">
            <button
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black py-4 px-6 rounded-xl text-lg uppercase tracking-wider shadow-lg shadow-yellow-500/20 transition cursor-pointer flex items-center justify-center space-x-3"
            >
              <Play className="w-6 h-6 fill-slate-950" />
              <span>¡Comenzar Partida ({totalRounds} rondas, {deckCards} cartas)!</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
