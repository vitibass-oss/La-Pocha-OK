import React, { useState, useEffect } from 'react';
import { GameRules, Player, Round, Suit } from '../types';
import {
  SUITS,
  getForbiddenDealerBid,
  getBiddingOrder,
  getHighestBidder,
  calculateScore,
  calculateBiddingStatus,
} from '../utils/pocha';
import { soundManager } from '../utils/audio';
import { CardDrawModal } from './CardDrawModal';
import {
  Mic,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Flame,
  Crown,
  Shuffle,
  Volume2,
  VolumeX,
  Calculator,
  Scale,
  TrendingDown,
  TrendingUp,
  Info,
  Layers,
  ChevronDown,
  ChevronUp,
  Package,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ActiveRoundProps {
  round: Round;
  players: Player[];
  rules: GameRules;
  totalRounds: number;
  onUpdateBids: (scores: Record<string, number>) => void;
  onUpdateActuals: (scores: Record<string, number>) => void;
  onChangeTrump: (trump: Suit) => void;
  onOpenVoiceModal: (mode: 'bids' | 'actuals') => void;
  onOpenAddPlayerModal?: () => void;
  onOpenEditRoundModal?: () => void;
  onOpenReorderPlayersModal?: () => void;
}

export const ActiveRound: React.FC<ActiveRoundProps> = ({
  round,
  players,
  rules,
  totalRounds,
  onUpdateBids,
  onUpdateActuals,
  onChangeTrump,
  onOpenVoiceModal,
  onOpenAddPlayerModal,
  onOpenEditRoundModal,
  onOpenReorderPlayersModal,
}) => {
  const cards = round.cards;
  const dealer = players[round.dealerIndex] || players[0];
  const biddingOrder = getBiddingOrder(players, round.dealerIndex);

  // Local state for bids & actuals inputs before confirming
  const [bids, setBids] = useState<Record<string, number>>({});
  const [actuals, setActuals] = useState<Record<string, number>>({});
  const [showCardDrawModal, setShowCardDrawModal] = useState(false);
  const [showDeckDetails, setShowDeckDetails] = useState(false);
  const [soundActive, setSoundActive] = useState<boolean>(() => soundManager.isEnabled());

  // Deck & Card distribution calculation based on active rules and players
  const totalDeckCards = rules?.deckCards || 48;
  const numPlayers = players.length;
  const cardsPerPlayer = round.cards;
  const totalCardsDealt = cardsPerPlayer * numPlayers;
  const leftoverCards = Math.max(0, totalDeckCards - totalCardsDealt);
  const maxCardsForTable = Math.floor(totalDeckCards / (numPlayers || 1));
  const isMaxRound = cardsPerPlayer === maxCardsForTable;
  const dealtPercentage = Math.min(100, Math.round((totalCardsDealt / totalDeckCards) * 100));
  const leftoverPercentage = Math.max(0, 100 - dealtPercentage);

  const handleToggleSound = () => {
    const next = soundManager.toggle();
    setSoundActive(next);
  };

  // Sync state when round or phase changes
  useEffect(() => {
    const initialBids: Record<string, number> = {};
    const initialActuals: Record<string, number> = {};

    players.forEach((p) => {
      const s = round.scores[p.id];
      if (s?.bid !== undefined && s.bid !== null) {
        initialBids[p.id] = s.bid;
      } else {
        // Default bids to 0 directly so user doesn't need to tap + then - for 0
        initialBids[p.id] = 0;
      }

      if (s?.actual !== undefined && s.actual !== null) {
        initialActuals[p.id] = s.actual;
      } else {
        initialActuals[p.id] = 0;
      }
    });

    setBids(initialBids);
    setActuals(initialActuals);
  }, [round.id, round.phase, players]);

  // Total sums & Full Bidding Analysis
  const totalBids = (Object.values(bids) as number[]).reduce((a: number, b: number) => a + (b || 0), 0);
  const totalActuals = (Object.values(actuals) as number[]).reduce((a: number, b: number) => a + (b || 0), 0);

  const biddingAnalysis = calculateBiddingStatus(
    cards,
    bids,
    players,
    round.dealerIndex,
    rules
  );

  const forbiddenDealerBid = biddingAnalysis.forbiddenDealerBid;
  const isDealerForbiddenViolated = biddingAnalysis.isDealerForbiddenViolated;

  const allBidsEntered = players.every((p) => bids[p.id] !== undefined && bids[p.id] !== null);
  const allActualsEntered = players.every((p) => actuals[p.id] !== undefined && actuals[p.id] !== null);

  const isBiddingPhase = round.phase === 'bidding';
  const isBidsOverCards = isBiddingPhase && totalBids > cards;

  // Subastado: Find highest bidder from current bids
  const highestBidderInfo = getHighestBidder(players, {
    ...round,
    scores: Object.fromEntries(
      Object.entries(bids).map(([pId, b]) => [pId, { playerId: pId, bid: b, actual: null, points: 0, accumulatedPoints: 0, hit: null, difference: 0 }])
    ),
  });

  // Adjust bid for a player with intelligent skip over forbidden dealer bid
  const handleBidChange = (playerId: string, delta: number) => {
    const current = bids[playerId] ?? 0;
    const isDealer = Boolean(dealer && playerId === dealer.id);
    let nextVal = current + delta;

    if (isDealer && rules.forbiddenDealerBid && forbiddenDealerBid !== null) {
      if (nextVal === forbiddenDealerBid) {
        // Skip over the forbidden bid in the same direction
        nextVal = delta > 0 ? nextVal + 1 : nextVal - 1;
      }
    }

    if (nextVal >= 0 && nextVal <= cards) {
      setBids((prev) => ({ ...prev, [playerId]: nextVal }));
    }
  };

  const handleSelectExactBid = (playerId: string, val: number) => {
    const isDealer = Boolean(dealer && playerId === dealer.id);
    if (isDealer && rules.forbiddenDealerBid && val === forbiddenDealerBid) {
      return;
    }
    setBids((prev) => ({ ...prev, [playerId]: Math.max(0, Math.min(cards, val)) }));
  };

  // Adjust actual tricks won for a player
  const handleActualChange = (playerId: string, delta: number) => {
    const current = actuals[playerId] ?? 0;
    const nextVal = Math.max(0, Math.min(cards, current + delta));
    setActuals((prev) => ({ ...prev, [playerId]: nextVal }));

    const playerBid = bids[playerId];
    if (playerBid !== undefined && nextVal !== current) {
      if (nextVal !== playerBid) {
        soundManager.playMiss();
      } else {
        soundManager.playHit();
      }
    }
  };

  const handleSelectExactActual = (playerId: string, val: number) => {
    const nextVal = Math.max(0, Math.min(cards, val));
    setActuals((prev) => ({ ...prev, [playerId]: nextVal }));
    const playerBid = bids[playerId];
    if (playerBid !== undefined) {
      if (nextVal !== playerBid) {
        soundManager.playMiss();
      } else {
        soundManager.playHit();
      }
    }
  };

  // Auto balance actual tricks if only 1 player remains
  const handleAutoBalance = () => {
    const missingPlayer = players.find((p) => actuals[p.id] === undefined);
    if (missingPlayer) {
      const remaining = Math.max(0, cards - totalActuals);
      setActuals((prev) => ({ ...prev, [missingPlayer.id]: remaining }));
    } else {
      // Balance last player
      const lastPlayer = players[players.length - 1];
      const otherSum = Object.entries(actuals)
        .filter(([id]) => id !== lastPlayer.id)
        .reduce((sum: number, [, val]: [string, number]) => sum + val, 0);
      const remaining = Math.max(0, cards - otherSum);
      setActuals((prev) => ({ ...prev, [lastPlayer.id]: remaining }));
    }
  };

  const handleConfirmBids = () => {
    onUpdateBids(bids);
  };

  const handleConfirmActuals = () => {
    // Check if anyone got a Pocha to fire celebratory confetti
    const pochaPlayer = players.find((p) => {
      const b = bids[p.id];
      const a = actuals[p.id];
      return cards >= 4 && b === cards && a === cards;
    });

    const failedPochaPlayer = players.find((p) => {
      const b = bids[p.id];
      const a = actuals[p.id];
      return cards >= 4 && b === cards && a !== cards;
    });

    const hasMisses = players.some((p) => {
      const b = bids[p.id];
      const a = actuals[p.id];
      return b !== undefined && a !== undefined && b !== a;
    });

    if (pochaPlayer) {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
        });
      } catch (e) {}
      soundManager.playPochaHit();
    } else if (failedPochaPlayer) {
      soundManager.playPochaMiss();
    } else if (hasMisses) {
      soundManager.playMiss();
    } else {
      soundManager.playHit();
    }

    onUpdateActuals(actuals);
  };

  const suitInfo = SUITS[round.trump];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all">
      {/* Active Round Header Banner */}
      <div className="bg-slate-950 p-5 sm:p-6 border-b border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Round & Card Count */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                Ronda {round.roundNumber} / {totalRounds}
              </span>
              {round.phaseName && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                  round.isSubastado
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    : round.isRandomTrumpMax
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    : round.isVisibleTrumpMax
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {round.isSubastado && '👑 '}
                  {round.isRandomTrumpMax && '🎲 '}
                  {round.isVisibleTrumpMax && '👁️ '}
                  {round.phaseName}
                </span>
              )}

              {/* Quick Modals Triggers */}
              {onOpenEditRoundModal && (
                <button
                  type="button"
                  onClick={onOpenEditRoundModal}
                  className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-md transition flex items-center space-x-1 cursor-pointer"
                  title="Corregir un error en la puntuación o triunfo de esta u otra ronda"
                >
                  <span>✏️ Corregir</span>
                </button>
              )}

              {onOpenReorderPlayersModal && (
                <button
                  type="button"
                  onClick={onOpenReorderPlayersModal}
                  className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 px-2.5 py-1 rounded-md transition flex items-center space-x-1 cursor-pointer"
                  title="Cambiar el orden o asiento físico de los jugadores en la mesa"
                >
                  <span>🪑 Orden Mesa</span>
                </button>
              )}

              {onOpenAddPlayerModal && (
                <button
                  type="button"
                  onClick={onOpenAddPlayerModal}
                  className="text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-md transition flex items-center space-x-1 cursor-pointer"
                  title="Añadir un nuevo jugador a mitad de partida"
                >
                  <span>➕ Unir Jugador</span>
                </button>
              )}

              {/* Sound Toggle Button */}
              <button
                type="button"
                onClick={handleToggleSound}
                className={`text-xs font-bold px-2.5 py-1 rounded-md border transition flex items-center space-x-1.5 cursor-pointer ${
                  soundActive
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
                title={soundActive ? 'Efectos de sonido activados (clic para silenciar)' : 'Efectos de sonido silenciados (clic para activar)'}
              >
                {soundActive ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Sonido ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden sm:inline">Sonido OFF</span>
                  </>
                )}
              </button>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 flex items-center space-x-3">
              <span>🃏 {cards} {cards === 1 ? 'Carta' : 'Cartas'}</span>
              {cards >= 4 && (() => {
                const isOros = round.trump === 'oros' && rules.doubleOros;
                const pochaPts = (5 * cards + 10) * (isOros ? 4 : 2);
                return (
                  <span className="text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center space-x-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pocha Posible: ±{pochaPts} pts {isOros ? '(Doble Oros)' : ''}</span>
                  </span>
                );
              })()}
            </h3>

            {/* Dealer & Deck Quick Summary Indicator */}
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-400">
              <span className="flex items-center space-x-1">
                <span>Repartidor:</span>
                <span className="font-bold text-amber-300 bg-slate-800 px-2 py-0.5 rounded text-xs border border-slate-700/60">
                  👑 {dealer?.name || 'Repartidor'}
                </span>
              </span>

              <span className="text-slate-600">•</span>

              <button
                type="button"
                onClick={() => setShowDeckDetails((prev) => !prev)}
                className="font-medium text-slate-300 hover:text-amber-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 px-2 py-0.5 rounded flex items-center space-x-1.5 transition cursor-pointer"
                title="Ver herramienta informativa de reparto y mazo"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  <strong>{cardsPerPlayer}</strong> {cardsPerPlayer === 1 ? 'carta/jug' : 'cartas/jug'} ({totalCardsDealt}/{totalDeckCards})
                </span>
                <span className="text-amber-400 font-bold">
                  • {leftoverCards === 0 ? 'Mazo 100% repartido' : `Sobran ${leftoverCards}`}
                </span>
                {showDeckDetails ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {isBiddingPhase && isBidsOverCards && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs font-bold text-purple-300 bg-purple-950/80 border border-purple-500/60 px-2 py-0.5 rounded flex items-center space-x-1 animate-pulse shadow-sm shadow-purple-500/20">
                    <AlertTriangle className="w-3.5 h-3.5 text-purple-400" />
                    <span>Exceso Subasta: {totalBids}/{cards} (+{totalBids - cards})</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: High Visibility Trump Suit Selector & Card Drawer */}
          <div className="bg-slate-900 border-2 border-slate-700/80 rounded-2xl p-4 flex flex-col space-y-3 shadow-xl w-full lg:w-auto">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  Triunfa en la Ronda:
                </span>
                <span className="text-sm font-black text-white bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
                  {suitInfo.symbol} {suitInfo.name.toUpperCase()} {suitInfo.isDouble ? '★ x2' : ''}
                </span>
              </div>

              <button
                onClick={() => setShowCardDrawModal(true)}
                className="text-xs font-black bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition cursor-pointer shrink-0"
                title="Sacar carta aleatoria de la baraja para definir triunfo"
              >
                <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Sacar Carta</span>
              </button>
            </div>

            {/* Big, Highly Visible Trump Tags */}
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(SUITS) as Suit[]).map((sKey) => {
                const s = SUITS[sKey];
                const isSelected = round.trump === sKey;
                return (
                  <button
                    key={sKey}
                    type="button"
                    onClick={() => onChangeTrump(sKey)}
                    className={`py-2.5 sm:py-3 px-2 rounded-xl border text-center font-black transition cursor-pointer flex flex-col items-center justify-center space-y-0.5 ${
                      isSelected
                        ? `${s.bgColor} ${s.color} ${s.borderColor} ring-3 ring-amber-400 shadow-xl scale-[1.04] z-10`
                        : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-700/90 hover:text-white'
                    }`}
                    title={`Cambiar a triunfo de ${s.name}`}
                  >
                    <span className="text-xl sm:text-2xl leading-none">{s.symbol}</span>
                    <span className="text-xs sm:text-sm font-black tracking-tight">{s.name}</span>
                    {s.isDouble && (
                      <span className="text-[9px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-black mt-0.5 shadow">
                        x2 DOBLE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {suitInfo.isDouble && (
              <div className="bg-amber-500/20 border border-amber-500/40 rounded-lg py-1 px-2.5 text-center text-xs font-black text-amber-300 flex items-center justify-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>¡RONDA EN OROS! Todas las puntuaciones se MULTIPLICAN x2</span>
              </div>
            )}
          </div>
        </div>

        {/* Banner for Subastado mode */}
        {round.isSubastado && (
          <div className="mt-4 bg-purple-950/60 border border-purple-500/40 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <Crown className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-purple-300">
                  Ronda de Subastado: El jugador que pida más bazas elige el triunfo
                </p>
                {highestBidderInfo ? (
                  <p className="text-xs text-purple-200 mt-0.5">
                    Mayor apuesta actual:{' '}
                    <strong className="text-amber-300 underline">{highestBidderInfo.player.name}</strong> con{' '}
                    <strong>{highestBidderInfo.bid} bazas</strong>. ¡Él/Ella debe poner el triunfo arriba!
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Realizad las apuestas para determinar quién fija el triunfo.
                  </p>
                )}
              </div>
            </div>

            {highestBidderInfo && (
              <span className="text-xs font-black bg-purple-500 text-slate-950 px-3 py-1 rounded-lg uppercase tracking-wider">
                Elige {highestBidderInfo.player.name}
              </span>
            )}
          </div>
        )}

        {/* Banner for Random Trump Max phase */}
        {round.isRandomTrumpMax && (
          <div className="mt-4 bg-cyan-950/60 border border-cyan-500/40 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <Shuffle className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-cyan-200">
                  Ronda de Cartas Máximas con Triunfo Aleatorio
                </p>
                <p className="text-xs text-cyan-300/80 mt-0.5">
                  Reparte <strong className="text-amber-300">{dealer.name}</strong>. Triunfo actual asignado al azar:{' '}
                  <strong className={`${suitInfo.color} font-black`}>
                    {suitInfo.name} {suitInfo.symbol}
                  </strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCardDrawModal(true)}
              className="text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <Shuffle className="w-3.5 h-3.5 text-slate-950" />
              <span>Sacar Otra Carta</span>
            </button>
          </div>
        )}

        {/* Informative Deck & Card Distribution Tool Card */}
        <div className="mt-4 bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden transition-all shadow-md">
          {/* Collapsible Header */}
          <div
            onClick={() => setShowDeckDetails((prev) => !prev)}
            className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-800/60 transition select-none"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                    Reparto y Mazo
                  </span>
                  {isMaxRound && (
                    <span className="text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.2 rounded">
                      Ronda Máxima
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  {cardsPerPlayer} {cardsPerPlayer === 1 ? 'carta' : 'cartas'} por jugador • {totalCardsDealt} en mesa • {leftoverCards === 0 ? 'Mazo completo repartido (0 sobran)' : `${leftoverCards} cartas sobran en mazo`}
                </p>
              </div>
            </div>

            {/* Quick Badges & Toggle Button */}
            <div className="flex items-center space-x-2 self-end sm:self-auto">
              <div className="hidden md:flex items-center space-x-1.5 text-xs">
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-bold">
                  🃏 {cardsPerPlayer} c/u
                </span>
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-bold">
                  👥 {totalCardsDealt} en juego
                </span>
                <span className={`px-2 py-0.5 rounded border font-bold ${
                  leftoverCards === 0
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>
                  📦 {leftoverCards} en mazo
                </span>
              </div>

              <button
                type="button"
                className="text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center space-x-1 transition"
                title={showDeckDetails ? 'Ocultar desglose detallado' : 'Mostrar desglose detallado del mazo'}
              >
                <span>{showDeckDetails ? 'Ocultar' : 'Detalles'}</span>
                {showDeckDetails ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {/* Expanded Detail Panel */}
          {showDeckDetails && (
            <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 space-y-4 animate-in fade-in duration-200">
              {/* Dual Visual Distribution Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-400 flex items-center space-x-1">
                    <span>🃏 Repartidas:</span>
                    <strong className="text-white">{totalCardsDealt} cartas</strong>
                    <span className="text-slate-400">({dealtPercentage}%)</span>
                  </span>
                  <span className="text-amber-400 flex items-center space-x-1">
                    <span>📦 Sobrantes en mazo:</span>
                    <strong className="text-white">{leftoverCards} cartas</strong>
                    <span className="text-slate-400">({leftoverPercentage}%)</span>
                  </span>
                </div>

                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700 flex">
                  {/* Dealt cards bar */}
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-l-full transition-all duration-300"
                    style={{ width: `${dealtPercentage}%` }}
                    title={`${totalCardsDealt} cartas repartidas (${dealtPercentage}%)`}
                  />
                  {/* Leftover deck bar */}
                  {leftoverCards > 0 && (
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-r-full transition-all duration-300"
                      style={{ width: `${leftoverPercentage}%` }}
                      title={`${leftoverCards} cartas sobrantes en mazo (${leftoverPercentage}%)`}
                    />
                  )}
                </div>
              </div>

              {/* 4 Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Por Jugador
                  </span>
                  <div className="mt-1">
                    <span className="text-2xl font-black text-emerald-400">
                      {cardsPerPlayer}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">
                      {cardsPerPlayer === 1 ? 'carta' : 'cartas'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">
                    {cardsPerPlayer} {cardsPerPlayer === 1 ? 'baza en juego' : 'bazas en juego'}
                  </span>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Total en Mesa
                  </span>
                  <div className="mt-1">
                    <span className="text-2xl font-black text-white">
                      {totalCardsDealt}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">cartas</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">
                    {numPlayers} jugadores × {cardsPerPlayer} cartas
                  </span>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Sobran en Mazo
                  </span>
                  <div className="mt-1">
                    <span className={`text-2xl font-black ${leftoverCards === 0 ? 'text-purple-400' : 'text-amber-400'}`}>
                      {leftoverCards}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">cartas</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">
                    {leftoverCards === 0
                      ? 'Sin talón (100% repartido)'
                      : leftoverCards === 1
                      ? '1 pinta de triunfo (0 talón)'
                      : `1 pinta + ${leftoverCards - 1} en talón`}
                  </span>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Baraja Activa
                  </span>
                  <div className="mt-1">
                    <span className="text-2xl font-black text-cyan-400">
                      {totalDeckCards}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">cartas</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Máx: {maxCardsForTable} cartas/jug ({maxCardsForTable * numPlayers} repartidas)
                  </span>
                </div>
              </div>

              {/* Contextual Deck Dynamics Note */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-slate-300">
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-slate-200">
                    {leftoverCards > 0 ? (
                      <>
                        De las <strong className="text-amber-300">{leftoverCards} cartas</strong> sobrantes en el mazo,{' '}
                        se extrae o voltea <strong className="text-white">1 carta</strong> para marcar el palo de triunfo ({suitInfo.name} {suitInfo.symbol}) y quedan{' '}
                        <strong className="text-amber-300">{leftoverCards - 1} cartas</strong> en el talón (bocabajo sin jugar).
                      </>
                    ) : (
                      <>
                        El mazo de <strong className="text-cyan-300">{totalDeckCards} cartas</strong> ha sido <strong className="text-white">repartido al 100%</strong> entre los {numPlayers} jugadores. Al no sobrar cartas en el mazo, el triunfo se establece según las reglas especiales de la ronda (Subastado, palo fijado o carta extraída al azar).
                      </>
                    )}
                  </p>
                  {isMaxRound && (
                    <p className="text-[11px] text-purple-300 font-medium">
                      🔝 Esta ronda alcanza la capacidad máxima posible ({cardsPerPlayer} cartas/jugador) para {numPlayers} jugadores con una baraja de {totalDeckCards} cartas.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Gameplay Controls */}
      <div className="p-5 sm:p-7 space-y-6">
        {/* Phase Indicator Tab Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isBiddingPhase ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
              }`}
            />
            <h4 className="text-lg font-extrabold text-white">
              {isBiddingPhase ? '1. Subasta (Pedir Bazas)' : '2. Resultado (Bazas Hechas)'}
            </h4>
          </div>

          <div className="flex items-center space-x-2">
            {/* Dictation options */}
            <button
              onClick={() => onOpenVoiceModal(isBiddingPhase ? 'bids' : 'actuals')}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 px-3 py-1.5 rounded-lg text-xs font-bold transition border border-amber-500/30 cursor-pointer"
            >
              <Mic className="w-4 h-4 text-amber-400" />
              <span>Dictar por Voz / Texto</span>
            </button>
          </div>
        </div>

        {/* Bidding Live Trick Calculator Panel */}
        {isBiddingPhase && (
          <div
            className={`rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl transition-all duration-300 ${
              isBidsOverCards
                ? 'bg-slate-950/95 border-2 border-purple-500/90 ring-4 ring-purple-500/30 shadow-[0_0_35px_rgba(168,85,247,0.35)] animate-pulse'
                : biddingAnalysis.hasIndividualInvalidBids || isDealerForbiddenViolated
                ? 'bg-slate-950/95 border-2 border-rose-500/80 ring-2 ring-rose-500/20 shadow-xl'
                : 'bg-slate-950/90 border border-slate-800 shadow-xl'
            }`}
          >
            {/* Top Row: Metric Badges & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    isBidsOverCards
                      ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300'
                      : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                  }`}
                >
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                      Cálculo Automático de Bazas
                    </span>
                    {isBidsOverCards && (
                      <span className="text-[10px] font-black uppercase bg-purple-500/30 text-purple-200 border border-purple-400/50 px-1.5 py-0.5 rounded animate-pulse">
                        Bazas &gt; Cartas
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    {cards} {cards === 1 ? 'carta repartida' : 'cartas repartidas'} por jugador ({cards} {cards === 1 ? 'baza' : 'bazas'} en juego)
                  </span>
                </div>
              </div>

              {/* Dynamic Trick Balance Badge */}
              <div className="flex items-center gap-2">
                {biddingAnalysis.hasIndividualInvalidBids ? (
                  <span className="text-xs font-black px-3 py-1.5 rounded-xl border bg-rose-500/20 text-rose-300 border-rose-500/40 flex items-center space-x-1.5 shadow-sm">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>Apuesta Imposible (&gt; {cards} cartas)</span>
                  </span>
                ) : biddingAnalysis.isDealerForbiddenViolated ? (
                  <span className="text-xs font-black px-3 py-1.5 rounded-xl border bg-rose-500/20 text-rose-300 border-rose-500/40 flex items-center space-x-1.5 animate-pulse shadow-sm">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Repartidor: Prohibido pedir {biddingAnalysis.forbiddenDealerBid}</span>
                  </span>
                ) : isBidsOverCards ? (
                  <span className="text-xs font-black px-3.5 py-1.5 rounded-xl border bg-purple-500/25 text-purple-200 border-purple-400/80 ring-2 ring-purple-400/30 flex items-center space-x-2 shadow-lg shadow-purple-500/25 animate-pulse">
                    <TrendingUp className="w-4 h-4 text-purple-300 shrink-0" />
                    <span>
                      ⚠️ Bazas Excedidas: +{biddingAnalysis.differenceAbs} de más ({totalBids}/{cards})
                    </span>
                  </span>
                ) : biddingAnalysis.bidsStatus === 'under' ? (
                  <span className="text-xs font-black px-3 py-1.5 rounded-xl border bg-amber-500/15 text-amber-300 border-amber-500/30 flex items-center space-x-1.5 shadow-sm">
                    <TrendingDown className="w-4 h-4 text-amber-400" />
                    <span>
                      Faltan {biddingAnalysis.differenceAbs} {biddingAnalysis.differenceAbs === 1 ? 'baza' : 'bazas'} por pedir ({totalBids}/{cards})
                    </span>
                  </span>
                ) : (
                  <span
                    className={`text-xs font-black px-3 py-1.5 rounded-xl border flex items-center space-x-1.5 shadow-sm ${
                      rules.forbiddenDealerBid
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    <Scale className="w-4 h-4" />
                    <span>
                      Suma Exacta ({totalBids}/{cards}) {rules.forbiddenDealerBid ? '⚠️ Ilegal para repartidor' : '✓ Cuadrada'}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Visual Trick Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <span>Bazas Pedidas en Mesa:</span>
                  <strong className="text-white text-sm">{totalBids}</strong>
                  <span className="text-slate-500">/ {cards} {cards === 1 ? 'carta' : 'cartas'}</span>
                </span>
                <span
                  className={
                    isBidsOverCards
                      ? 'text-purple-300 font-black flex items-center space-x-1 animate-pulse'
                      : biddingAnalysis.bidsStatus === 'under'
                      ? 'text-amber-300 font-extrabold'
                      : 'text-emerald-300 font-extrabold'
                  }
                >
                  {biddingAnalysis.bidsStatus === 'under' && `Faltan ${biddingAnalysis.differenceAbs} ${biddingAnalysis.differenceAbs === 1 ? 'baza' : 'bazas'}`}
                  {isBidsOverCards && `⚠️ Exceso de +${biddingAnalysis.differenceAbs} ${biddingAnalysis.differenceAbs === 1 ? 'baza' : 'bazas'}`}
                  {biddingAnalysis.bidsStatus === 'exact' && '100% Cartas cubiertas'}
                </span>
              </div>

              <div className={`h-3 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border flex ${
                isBidsOverCards ? 'border-purple-500/60 ring-1 ring-purple-500/40' : 'border-slate-800'
              }`}>
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    biddingAnalysis.hasIndividualInvalidBids || (biddingAnalysis.bidsStatus === 'exact' && rules.forbiddenDealerBid)
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                      : isBidsOverCards
                      ? 'bg-gradient-to-r from-amber-500 via-purple-500 to-rose-500 animate-pulse'
                      : 'bg-gradient-to-r from-amber-500 to-emerald-400'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(8, cards > 0 ? (totalBids / cards) * 100 : 0))}%`,
                  }}
                />
              </div>
            </div>

            {/* Tactical pocha alert */}
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start space-x-2.5 transition-all ${
                biddingAnalysis.severity === 'error'
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  : isBidsOverCards
                  ? 'bg-purple-950/50 border-purple-500/60 text-purple-200 shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/30'
                  : biddingAnalysis.severity === 'warning'
                  ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              {biddingAnalysis.severity === 'error' ? (
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : isBidsOverCards ? (
                <AlertTriangle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5 animate-bounce" />
              ) : biddingAnalysis.bidsStatus === 'over' ? (
                <Flame className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 leading-relaxed">
                <p className="font-bold text-white flex items-center gap-2">
                  <span>{biddingAnalysis.statusMessage}</span>
                  {isBidsOverCards && (
                    <span className="text-[10px] uppercase font-black tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/50 px-1.5 py-0.5 rounded">
                      Exceso de Subasta
                    </span>
                  )}
                </p>
                <p className="text-[11px] opacity-90">{biddingAnalysis.tacticalTip}</p>
              </div>
            </div>
          </div>
        )}

        {/* Bidding or Actuals Input List (Ordered by Bidding Order starting from Mano) */}
        <div className="space-y-3">
          {biddingOrder.map((player, orderIdx) => {
            const isDealer = Boolean(dealer && player.id === dealer.id);
            const currentBid = bids[player.id];
            const currentActual = actuals[player.id];
            const roundScore = round.scores[player.id];

            // Is bid forbidden for dealer?
            const isForbiddenForThisDealer =
              isBiddingPhase &&
              isDealer &&
              rules.forbiddenDealerBid &&
              forbiddenDealerBid !== null;

            // Is Pocha hit?
            const isPochaHit =
              !isBiddingPhase &&
              cards >= 4 &&
              currentBid === cards &&
              currentActual === cards;

            return (
              <div
                key={player.id}
                className={`p-3.5 sm:p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isPochaHit
                    ? 'bg-amber-500/15 border-amber-500/60 ring-2 ring-amber-400/50'
                    : isDealer
                    ? 'bg-amber-500/5 border-amber-500/30'
                    : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                {/* Player info & Order badge */}
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-slate-500 w-5 text-center">
                    #{orderIdx + 1}
                  </span>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold border border-slate-700 shadow-sm"
                    style={{ backgroundColor: `${player.color}20`, borderColor: player.color }}
                  >
                    {player.avatar}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-base">{player.name}</span>
                      {isDealer && (
                        <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Repartidor
                        </span>
                      )}
                      {round.isSubastado && highestBidderInfo?.player.id === player.id && (
                        <span className="bg-purple-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center space-x-1">
                          <Crown className="w-3 h-3" />
                          <span>Pone Triunfo</span>
                        </span>
                      )}
                    </div>
                    {/* Secondary info showing previous round score or accumulated */}
                    <span className="text-xs text-slate-400">
                      Puntos acumulados:{' '}
                      <span className="text-amber-300 font-bold">
                        {roundScore?.accumulatedPoints ?? 0}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Counter Control depending on Phase */}
                <div className="flex flex-col sm:items-end space-y-2">
                  {isBiddingPhase ? (
                    /* Phase 1: Bids Control */
                    <div className="flex flex-col sm:items-end space-y-2">
                      <div className="flex items-center space-x-3">
                        {isDealer && isForbiddenForThisDealer && (
                          <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-1 rounded-lg flex items-center space-x-1">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            <span>Prohibido pedir {forbiddenDealerBid}</span>
                          </span>
                        )}

                        <div className="flex items-center bg-slate-900 rounded-xl border border-slate-700 p-1 shadow-inner">
                          <button
                            type="button"
                            onClick={() => handleBidChange(player.id, -1)}
                            disabled={currentBid === undefined || currentBid <= 0}
                            className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white font-black text-xl flex items-center justify-center transition cursor-pointer active:scale-95"
                            title="Restar 1 baza"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={cards}
                            value={currentBid !== undefined ? currentBid : 0}
                            onChange={(e) => {
                              let val = parseInt(e.target.value, 10);
                              if (isNaN(val)) val = 0;
                              val = Math.max(0, Math.min(cards, val));
                              setBids((prev) => ({ ...prev, [player.id]: val }));
                            }}
                            className={`w-14 bg-transparent text-center text-xl font-black rounded py-1 border-b border-dashed focus:outline-none focus:bg-slate-800 ${
                              isDealer && isForbiddenForThisDealer && currentBid === forbiddenDealerBid
                                ? 'text-rose-400 border-rose-500 bg-rose-950/30'
                                : 'text-amber-300 border-amber-500/40'
                            }`}
                            title="Puedes tocar para escribir el número directamente"
                          />
                          <button
                            type="button"
                            onClick={() => handleBidChange(player.id, 1)}
                            disabled={currentBid >= cards}
                            className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white font-black text-xl flex items-center justify-center transition cursor-pointer active:scale-95"
                            title="Sumar 1 baza"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Quick Bid Number Selection Pills */}
                      {cards <= 10 && (
                        <div className="flex flex-wrap items-center gap-1 max-w-full justify-start sm:justify-end">
                          {Array.from({ length: cards + 1 }, (_, i) => i).map((num) => {
                            const isSelected = currentBid === num;
                            const isForbiddenPill =
                              isDealer &&
                              rules.forbiddenDealerBid &&
                              forbiddenDealerBid !== null &&
                              num === forbiddenDealerBid;

                            return (
                              <button
                                key={num}
                                type="button"
                                disabled={isForbiddenPill}
                                onClick={() => handleSelectExactBid(player.id, num)}
                                title={
                                  isForbiddenPill
                                    ? `Prohibido pedir ${num} bazas para el repartidor`
                                    : `Pedir ${num} ${num === 1 ? 'baza' : 'bazas'}`
                                }
                                className={`h-7 px-2 text-xs font-bold rounded-md transition cursor-pointer border ${
                                  isSelected
                                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm'
                                    : isForbiddenPill
                                    ? 'bg-rose-950/40 text-rose-500/40 border-rose-900/50 line-through cursor-not-allowed'
                                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/80'
                                }`}
                              >
                                {num}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Phase 2: Actuals Control */
                    <div className="flex flex-col sm:items-end space-y-2">
                      <div className="flex items-center space-x-4">
                        {/* Show bid for comparison */}
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Pidió
                          </span>
                          <span className="text-sm font-bold text-amber-300">
                            {currentBid} {currentBid === 1 ? 'baza' : 'bazas'}
                          </span>
                        </div>

                        <div className="flex items-center bg-slate-900 rounded-xl border border-slate-700 p-1 shadow-inner">
                          <button
                            type="button"
                            onClick={() => handleActualChange(player.id, -1)}
                            disabled={currentActual === undefined || currentActual <= 0}
                            className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white font-black text-xl flex items-center justify-center transition cursor-pointer active:scale-95"
                            title="Restar 1 baza hecha"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={cards}
                            value={currentActual !== undefined ? currentActual : 0}
                            onChange={(e) => {
                              let val = parseInt(e.target.value, 10);
                              if (isNaN(val)) val = 0;
                              val = Math.max(0, Math.min(cards, val));
                              setActuals((prev) => ({ ...prev, [player.id]: val }));
                            }}
                            className="w-14 bg-transparent text-center text-xl font-black text-emerald-400 focus:outline-none focus:bg-slate-800 rounded py-1 border-b border-dashed border-emerald-500/40"
                            title="Puedes tocar para escribir el número directamente"
                          />
                          <button
                            type="button"
                            onClick={() => handleActualChange(player.id, 1)}
                            disabled={currentActual >= cards}
                            className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white font-black text-xl flex items-center justify-center transition cursor-pointer active:scale-95"
                            title="Sumar 1 baza hecha"
                          >
                            +
                          </button>
                        </div>

                        {/* Live Hit/Miss indicator & Pocha Badge */}
                        {currentActual !== undefined && currentBid !== undefined && (() => {
                          const scoreResult = calculateScore(currentBid, currentActual, round.trump, cards, rules);
                          const isPochaAttempt = cards >= 4 && currentBid === cards && rules?.pochaDoubleDouble !== false;

                          if (isPochaAttempt && scoreResult.hit) {
                            return (
                              <div className="w-28 text-center hidden sm:block">
                                <span className="text-xs font-black text-amber-950 bg-amber-400 px-2 py-1 rounded shadow flex items-center justify-center space-x-1 animate-bounce">
                                  <Flame className="w-3.5 h-3.5 fill-amber-950" />
                                  <span>POCHA! (+{scoreResult.points} pts)</span>
                                </span>
                              </div>
                            );
                          } else if (isPochaAttempt && !scoreResult.hit) {
                            return (
                              <div className="w-28 text-center hidden sm:block">
                                <span className="text-xs font-extrabold text-rose-200 bg-rose-950/80 border border-rose-500/50 px-2 py-1 rounded shadow flex items-center justify-center space-x-1">
                                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                                  <span>POCHA! ({scoreResult.points} pts)</span>
                                </span>
                              </div>
                            );
                          } else if (scoreResult.hit) {
                            return (
                              <div className="w-24 text-center hidden sm:block">
                                <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                                  ✓ Acierta (+{scoreResult.points} pts)
                                </span>
                              </div>
                            );
                          } else {
                            return (
                              <div className="w-24 text-center hidden sm:block">
                                <span className="text-xs font-extrabold text-rose-400 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                                  ✗ Falla ({scoreResult.points} pts)
                                </span>
                              </div>
                            );
                          }
                        })()}
                      </div>

                      {/* Quick Actuals Selection Pills */}
                      {cards <= 10 && (
                        <div className="flex flex-wrap items-center gap-1 max-w-full justify-start sm:justify-end">
                          {Array.from({ length: cards + 1 }, (_, i) => i).map((num) => {
                            const isSelected = currentActual === num;
                            return (
                              <button
                                key={num}
                                type="button"
                                onClick={() => handleSelectExactActual(player.id, num)}
                                className={`h-7 px-2 text-xs font-bold rounded-md transition cursor-pointer border ${
                                  isSelected
                                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-sm'
                                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/80'
                                }`}
                              >
                                {num}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Footer & Validation Bar */}
        <div className={`p-4 rounded-xl border transition-all duration-300 space-y-3 ${
          isBidsOverCards
            ? 'bg-slate-950/95 border-purple-500/70 ring-2 ring-purple-500/30 shadow-lg shadow-purple-950/30'
            : 'bg-slate-950 border-slate-800'
        }`}>
          {isBiddingPhase ? (
            /* Bidding Validation */
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400">Total Bazas Pedidas:</span>
                  <span
                    className={`font-black px-2.5 py-1 rounded-lg text-xs transition-all ${
                      biddingAnalysis.hasIndividualInvalidBids || isDealerForbiddenViolated
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : isBidsOverCards
                        ? 'bg-purple-500/30 text-purple-200 border border-purple-400/80 ring-2 ring-purple-500/30 animate-pulse font-black shadow-sm'
                        : biddingAnalysis.bidsStatus === 'under'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {totalBids} de {cards} cartas ({biddingAnalysis.bidsStatus === 'under' ? `faltan ${biddingAnalysis.differenceAbs}` : isBidsOverCards ? `⚠️ +${biddingAnalysis.differenceAbs} de más (Exceso)` : 'igualadas'})
                  </span>
                </div>

                {isBidsOverCards && (
                  <p className="text-xs text-purple-300 font-semibold flex items-center space-x-1 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>
                      Total subastado (<strong>{totalBids}</strong>) &gt; Cartas de la mano (<strong>{cards}</strong>). Caerán {biddingAnalysis.differenceAbs} {biddingAnalysis.differenceAbs === 1 ? 'baza' : 'bazas'} de más.
                    </span>
                  </p>
                )}

                {rules.forbiddenDealerBid && forbiddenDealerBid !== null && (
                  <p className="text-xs text-rose-400 font-medium flex items-center space-x-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>
                      Repartidor ({dealer?.name || 'Repartidor'}): no puede pedir{' '}
                      <strong className="underline font-bold">{forbiddenDealerBid}</strong> para no empatar las {cards} cartas.
                    </span>
                  </p>
                )}

                {biddingAnalysis.hasIndividualInvalidBids && (
                  <p className="text-xs text-rose-400 font-bold flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Hay apuestas fuera del rango permitido (0 a {cards}).</span>
                  </p>
                )}
              </div>

              <button
                onClick={handleConfirmBids}
                disabled={!allBidsEntered || isDealerForbiddenViolated || biddingAnalysis.hasIndividualInvalidBids}
                title={
                  biddingAnalysis.hasIndividualInvalidBids
                    ? `Hay apuestas mayores a ${cards} cartas`
                    : isDealerForbiddenViolated
                    ? `El repartidor no puede pedir ${forbiddenDealerBid} bazas`
                    : !allBidsEntered
                    ? 'Introduce las bazas de todos los jugadores'
                    : 'Confirmar apuestas y pasar a juego'
                }
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 font-black px-6 py-3 rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-amber-500/20"
              >
                <span>Confirmar Bazas Pedidas</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Actuals Validation */
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div>
                  <span className="text-xs text-slate-400">
                    Total Bazas Hechas:{' '}
                    <span
                      className={`font-black text-sm ${
                        totalActuals === cards ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {totalActuals} / {cards}
                    </span>
                  </span>
                  {totalActuals !== cards && (
                    <p className="text-xs text-rose-400 font-bold mt-0.5 flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Las bazas hechas deben sumar exactamente {cards} cartas.</span>
                    </p>
                  )}
                </div>

                {totalActuals !== cards && (
                  <button
                    onClick={handleAutoBalance}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center space-x-1 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Autocuadrar</span>
                  </button>
                )}
              </div>

              <button
                onClick={handleConfirmActuals}
                disabled={!allActualsEntered || totalActuals !== cards}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-slate-950 font-black px-6 py-3 rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle className="w-5 h-5 text-slate-950" />
                <span>Guardar Ronda y Puntuar</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card Draw Modal */}
      <CardDrawModal
        isOpen={showCardDrawModal}
        onClose={() => setShowCardDrawModal(false)}
        onSelectTrump={(s) => onChangeTrump(s)}
        title="Elección Aleatoria de Triunfo"
        subtitle="Corta la baraja para seleccionar el palo de triunfo de esta ronda"
      />
    </div>
  );
};
