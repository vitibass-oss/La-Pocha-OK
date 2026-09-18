import React, { useState } from 'react';
import { Player, PlayerStats, Round } from '../types';
import { SUITS } from '../utils/pocha';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  BarChart3,
  Trophy,
  Flame,
  AlertTriangle,
  Coins,
  Target,
  X,
  Sparkles,
  TrendingUp,
  Layers,
  User,
  Users,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  History,
  ListOrdered,
  Filter,
  Check,
  Crown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';

interface StatisticsModalProps {
  isOpen: boolean;
  players: Player[];
  rounds: Round[];
  stats: PlayerStats[];
  onClose: () => void;
}

export const StatisticsModal: React.FC<StatisticsModalProps> = ({
  isOpen,
  players,
  rounds,
  stats,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<
    'bids_history' | 'hits_misses' | 'overview' | 'timeline' | 'oros'
  >('bids_history');
  const [chartSubView, setChartSubView] = useState<'bids_actuals' | 'rounds_hit_miss' | 'player_detail'>('bids_actuals');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(players[0]?.id || '');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'hits' | 'misses' | 'oros'>('all');
  const [historyViewMode, setHistoryViewMode] = useState<'individual' | 'all_players'>('individual');
  const [visibleTimelinePlayers, setVisibleTimelinePlayers] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    players.forEach((p) => {
      init[p.id] = true;
    });
    return init;
  });
  const [includeOriginZero, setIncludeOriginZero] = useState<boolean>(true);
  const [timelineCurveType, setTimelineCurveType] = useState<'monotone' | 'linear'>('monotone');

  if (!isOpen) return null;

  const completedRounds = rounds.filter((r) => r.phase === 'completed');

  // Prepare line chart data: Score evolution round by round with rich metadata
  const originEntry: Record<string, any> = {
    roundName: '0 (Inicio)',
    roundNumber: 0,
    cards: 0,
    isOrigin: true,
  };
  players.forEach((p) => {
    originEntry[p.name] = 0;
    originEntry[`${p.name}_delta`] = 0;
    originEntry[`${p.name}_hit`] = true;
  });

  const roundsTimelineData = completedRounds.map((round) => {
    const suitInfo = SUITS[round.trump] || SUITS['oros'];
    const entry: Record<string, any> = {
      roundName: `R${round.roundNumber} (${round.cards}c)`,
      roundNumber: round.roundNumber,
      cards: round.cards,
      phaseName: round.phaseName || `${round.cards} cartas`,
      trump: round.trump,
      trumpSymbol: suitInfo.symbol,
      trumpName: suitInfo.name,
      isOros: suitInfo.isDouble,
    };
    players.forEach((p) => {
      const score = round.scores[p.id];
      entry[p.name] = score?.accumulatedPoints ?? 0;
      entry[`${p.name}_delta`] = score?.points ?? 0;
      entry[`${p.name}_hit`] = score?.hit ?? false;
      entry[`${p.name}_bid`] = score?.bid ?? 0;
      entry[`${p.name}_actual`] = score?.actual ?? 0;
    });
    return entry;
  });

  const timelineData = includeOriginZero && completedRounds.length > 0
    ? [originEntry, ...roundsTimelineData]
    : roundsTimelineData;

  // Prepare bar chart data: Bazas Pedidas vs Bazas Realizadas + Aciertos / Fallos
  const comparisonData = stats.map((st) => {
    const netDiff = st.totalActuals - st.totalBids;
    return {
      name: st.player.name,
      avatar: st.player.avatar,
      color: st.player.color,
      id: st.player.id,
      // Bazas
      'Bazas Pedidas': st.totalBids,
      'Bazas Realizadas': st.totalActuals,
      diferenciaNeta: netDiff,
      // Rondas
      'Rondas Acertadas': st.totalHits,
      'Rondas Falladas': st.totalMisses,
      porcentajeAcierto: st.hitPercentage,
      margenError: st.avgErrorMargin,
    };
  });

  // Selected player and their stats
  const activeSelectedPlayerId = selectedPlayerId && players.some((p) => p.id === selectedPlayerId)
    ? selectedPlayerId
    : players[0]?.id || '';
  const selectedPlayer = players.find((p) => p.id === activeSelectedPlayerId) || players[0];
  const selectedPlayerStat = stats.find((s) => s.player.id === activeSelectedPlayerId) || stats[0];

  // Prepare individual round-by-round breakdown for selected player
  const playerRoundData = completedRounds
    .map((round) => {
      const score = round.scores[selectedPlayer?.id || ''];
      const isPlayerInRound = score && score.bid !== null && score.actual !== null;
      if (!isPlayerInRound) return null;

      const bid = score.bid ?? 0;
      const actual = score.actual ?? 0;
      const hit = score.hit ?? false;
      const diff = actual - bid;
      const suitName = SUITS[round.trump]?.name || round.trump;
      const dealer = players[round.dealerIndex % players.length] || players[0];

      return {
        round,
        roundLabel: `R${round.roundNumber} (${round.cards}c)`,
        roundNum: round.roundNumber,
        cards: round.cards,
        trump: round.trump,
        suitName,
        dealer,
        'Bazas Pedidas': bid,
        'Bazas Realizadas': actual,
        bid,
        actual,
        diff,
        puntos: score.points ?? 0,
        accumulatedPoints: score.accumulatedPoints ?? 0,
        hit,
        isPocha: score.isPocha,
      };
    })
    .filter(Boolean) as Array<{
      round: Round;
      roundLabel: string;
      roundNum: number;
      cards: number;
      trump: any;
      suitName: string;
      dealer: Player;
      'Bazas Pedidas': number;
      'Bazas Realizadas': number;
      bid: number;
      actual: number;
      diff: number;
      puntos: number;
      accumulatedPoints: number;
      hit: boolean;
      isPocha?: boolean;
    }>;

  // Filtered rounds for history table
  const filteredPlayerRounds = playerRoundData.filter((item) => {
    if (historyFilter === 'hits') return item.hit;
    if (historyFilter === 'misses') return !item.hit;
    if (historyFilter === 'oros') return item.trump === 'oros';
    return true;
  });

  // Calculate quick metrics for current player's history view
  const playerHitsCount = playerRoundData.filter((r) => r.hit).length;
  const playerMissesCount = playerRoundData.filter((r) => !r.hit).length;
  const playerOrosCount = playerRoundData.filter((r) => r.trump === 'oros').length;
  const playerTotalBids = playerRoundData.reduce((acc, r) => acc + r.bid, 0);
  const playerTotalActuals = playerRoundData.reduce((acc, r) => acc + r.actual, 0);
  const playerNetDiff = playerTotalActuals - playerTotalBids;
  const playerAccuracy = playerRoundData.length > 0
    ? Math.round((playerHitsCount / playerRoundData.length) * 100)
    : 0;

  // Prepare Oros vs Normal data
  const orosData = stats.map((st) => ({
    name: st.player.name,
    Oros: st.orosPoints,
    OtrosPalos: st.normalPoints,
  }));

  // Totals across the entire table
  const totalBidsMatch = stats.reduce((acc, s) => acc + s.totalBids, 0);
  const totalActualsMatch = stats.reduce((acc, s) => acc + s.totalActuals, 0);
  const totalHitsMatch = stats.reduce((acc, s) => acc + s.totalHits, 0);
  const totalMissesMatch = stats.reduce((acc, s) => acc + s.totalMisses, 0);
  const totalRoundsCount = totalHitsMatch + totalMissesMatch;
  const globalAccuracy = totalRoundsCount > 0 ? Math.round((totalHitsMatch / totalRoundsCount) * 100) : 0;

  // Key Highlights
  const bestHitPlayer = [...stats].sort((a, b) => b.hitPercentage - a.hitPercentage)[0];
  const mostBalancedPlayer = [...stats].sort((a, b) => Math.abs(a.totalActuals - a.totalBids) - Math.abs(b.totalActuals - b.totalBids))[0];
  const bestOrosPlayer = [...stats].sort((a, b) => b.orosPoints - a.orosPoints)[0];
  const maxStreakPlayer = [...stats].sort((a, b) => b.maxStreak - a.maxStreak)[0];

  // Worst single round blunder across all players
  let biggestBlunder: { player: Player; points: number; roundNumber: number } | null = null;
  // Best single round jump
  let biggestSingleRoundJump: { player: Player; points: number; roundNumber: number; trumpSymbol: string; isOros: boolean } | null = null;

  completedRounds.forEach((round) => {
    const suitInfo = SUITS[round.trump] || SUITS['oros'];
    players.forEach((p) => {
      const s = round.scores[p.id];
      if (s) {
        if (s.points < 0 && (!biggestBlunder || s.points < biggestBlunder.points)) {
          biggestBlunder = { player: p, points: s.points, roundNumber: round.roundNumber };
        }
        if (s.points > 0 && (!biggestSingleRoundJump || s.points > biggestSingleRoundJump.points)) {
          biggestSingleRoundJump = {
            player: p,
            points: s.points,
            roundNumber: round.roundNumber,
            trumpSymbol: suitInfo.symbol,
            isOros: suitInfo.isDouble,
          };
        }
      }
    });
  });

  // Current ranking for timeline overview
  const currentLeader = [...stats].sort((a, b) => b.totalPoints - a.totalPoints)[0];
  const secondLeader = [...stats].sort((a, b) => b.totalPoints - a.totalPoints)[1];
  const leaderLead = currentLeader && secondLeader ? currentLeader.totalPoints - secondLeader.totalPoints : 0;

  // Custom Tooltip for Score Timeline Line Chart
  const CustomTimelineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      if (!data) return null;

      // Extract player entries and sort by current accumulated points descending
      const playerEntries = players
        .map((p) => {
          const acc = data[p.name] ?? 0;
          const delta = data[`${p.name}_delta`] ?? 0;
          const hit = data[`${p.name}_hit`];
          const bid = data[`${p.name}_bid`];
          const actual = data[`${p.name}_actual`];
          const isVisible = visibleTimelinePlayers[p.id] !== false;
          return {
            player: p,
            acc,
            delta,
            hit,
            bid,
            actual,
            isVisible,
          };
        })
        .sort((a, b) => b.acc - a.acc);

      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs space-y-2.5 min-w-[260px] max-w-sm backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <span className="font-extrabold text-amber-300 text-sm block">
                {data.isOrigin ? '🏁 Punto de Partida' : `Ronda ${data.roundNumber}`}
              </span>
              {!data.isOrigin ? (
                <span className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                  <span>{data.cards} {data.cards === 1 ? 'carta' : 'cartas'}</span>
                  <span>•</span>
                  <span>Triunfo {data.trumpSymbol} {data.trumpName}</span>
                  {data.isOros && <span className="text-amber-400 font-bold ml-1">(x2 Oros)</span>}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">Puntuación inicial (0 pts)</span>
              )}
            </div>
            {data.isOrigin ? (
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold">
                0 pts
              </span>
            ) : (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
                {data.phaseName}
              </span>
            )}
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
            {playerEntries.map((item, idx) => (
              <div
                key={item.player.id}
                className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition ${
                  item.isVisible ? 'bg-slate-800/70 border border-slate-700/60' : 'opacity-35 bg-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2 truncate mr-2">
                  <span className="text-[10px] font-black text-amber-400 w-3.5 text-center">
                    {idx + 1}º
                  </span>
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: item.player.color }}
                  />
                  <span className="truncate text-white font-bold text-xs">{item.player.name}</span>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {!data.isOrigin && (
                    <div className="flex items-center space-x-1">
                      <span
                        className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
                          item.delta >= 0
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {item.delta >= 0 ? `+${item.delta}` : item.delta}
                      </span>
                    </div>
                  )}
                  <span className="font-black text-amber-300 text-xs min-w-[42px] text-right">
                    {item.acc} <span className="text-[10px] text-slate-400 font-normal">pts</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Bids vs Actuals Bar Chart
  const CustomBidsActualsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const netDiff = data.diferenciaNeta;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3.5 rounded-xl shadow-xl text-xs space-y-1.5 min-w-[200px]">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
            <span className="text-base">{data.avatar}</span>
            <span className="font-bold text-white text-sm">{label}</span>
          </div>
          <div className="flex justify-between items-center text-amber-400">
            <span>Bazas Pedidas:</span>
            <span className="font-extrabold text-sm">{data['Bazas Pedidas']}</span>
          </div>
          <div className="flex justify-between items-center text-emerald-400">
            <span>Bazas Realizadas:</span>
            <span className="font-extrabold text-sm">{data['Bazas Realizadas']}</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-800/80 text-slate-300">
            <span>Desviación Neta:</span>
            <span className={`font-bold ${netDiff > 0 ? 'text-cyan-400' : netDiff < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {netDiff > 0 ? `+${netDiff} de más` : netDiff < 0 ? `${netDiff} de menos` : 'Exacto (0)'}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-400 text-[11px] pt-1">
            <span>Precisión:</span>
            <span className="font-bold text-emerald-400">{data.porcentajeAcierto}% ({data['Rondas Acertadas']}/{data['Rondas Acertadas'] + data['Rondas Falladas']})</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Round by Round Detail
  const CustomPlayerRoundTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const hit = data.hit;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3.5 rounded-xl shadow-xl text-xs space-y-1.5 min-w-[190px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-amber-300 text-sm">{label}</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              Palo: {data.suitName}
            </span>
          </div>
          <div className="flex justify-between items-center text-amber-400">
            <span>Bazas Pedidas:</span>
            <span className="font-extrabold text-sm">{data['Bazas Pedidas']}</span>
          </div>
          <div className="flex justify-between items-center text-emerald-400">
            <span>Bazas Hechas:</span>
            <span className="font-extrabold text-sm">{data['Bazas Realizadas']}</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
            <span>Resultado:</span>
            <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${hit ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'}`}>
              {hit ? '✓ Acertó' : '✗ Falló'} ({data.puntos > 0 ? `+${data.puntos}` : data.puntos} pts)
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-950 p-5 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl font-bold border border-amber-500/30">
              <BarChart3 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl leading-tight">
                Estadísticas y Análisis de la Partida
              </h3>
              <p className="text-xs text-slate-400">
                Gráficos de aciertos vs. errores, bazas pedidas vs. realizadas y rendimiento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-950/60 border-b border-slate-800 px-5 flex space-x-2 overflow-x-auto shrink-0">
          {[
            { id: 'bids_history', label: 'Historial Pedidas vs. Realizadas', icon: History },
            { id: 'hits_misses', label: 'Aciertos vs. Errores (Global)', icon: Target },
            { id: 'overview', label: 'Resumen & Destacados', icon: Sparkles },
            { id: 'timeline', label: 'Evolución de Puntos', icon: TrendingUp },
            { id: 'oros', label: 'Impacto de Oros', icon: Coins },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 border-b-2 text-xs font-bold flex items-center space-x-2 transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-white flex-1">
          {/* TAB: Historial de Bazas Pedidas vs Realizadas (Individualizado) */}
          {activeTab === 'bids_history' && (
            <div className="space-y-6">
              {/* Header + View Mode Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div>
                  <h4 className="font-extrabold text-base sm:text-lg text-amber-300 flex items-center space-x-2">
                    <History className="w-5 h-5 text-amber-400" />
                    <span>Historial de Bazas Pedidas vs. Realizadas</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Detalle individualizado por jugador en cada mano anterior disputada.
                  </p>
                </div>

                {/* View Switcher: Individual Player vs All Players Matrix */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 self-start sm:self-auto">
                  <button
                    onClick={() => setHistoryViewMode('individual')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                      historyViewMode === 'individual'
                        ? 'bg-amber-500 text-slate-950 shadow font-black'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Detalle por Jugador</span>
                  </button>
                  <button
                    onClick={() => setHistoryViewMode('all_players')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                      historyViewMode === 'all_players'
                        ? 'bg-amber-500 text-slate-950 shadow font-black'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Matriz Toda la Mesa</span>
                  </button>
                </div>
              </div>

              {completedRounds.length === 0 ? (
                <div className="h-72 bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-slate-500 text-sm text-center">
                  <History className="w-10 h-10 text-slate-600 mb-2" />
                  <p className="font-bold text-slate-400">Sin manos completadas todavía</p>
                  <p className="text-xs text-slate-600 mt-1 max-w-sm">
                    Anota las apuestas y bazas ganadas de al menos 1 mano para consultar el historial detallado.
                  </p>
                </div>
              ) : historyViewMode === 'individual' ? (
                /* Individual Player View */
                <div className="space-y-6">
                  {/* Player Selector Pills */}
                  <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                    {players.map((p) => {
                      const isSelected = (selectedPlayer?.id || '') === p.id;
                      const pStat = stats.find((s) => s.player.id === p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => setSelectedPlayerId(p.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 cursor-pointer border ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg scale-[1.02]'
                              : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                          }`}
                        >
                          <span className="text-base">{p.avatar}</span>
                          <span className="truncate max-w-[90px]">{p.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                              isSelected
                                ? 'bg-slate-950 text-amber-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {pStat?.hitPercentage ?? 0}%
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Player Summary Highlight Card */}
                  <div className="bg-slate-950 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border font-bold shrink-0 shadow-inner"
                          style={{
                            backgroundColor: `${selectedPlayer?.color}20`,
                            borderColor: selectedPlayer?.color,
                          }}
                        >
                          {selectedPlayer?.avatar}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h5 className="text-lg font-black text-white">
                              {selectedPlayer?.name}
                            </h5>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {selectedPlayerStat?.rank ?? 1}º en Clasificación
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            {playerRoundData.length} {playerRoundData.length === 1 ? 'mano jugada' : 'manos jugadas'} en la partida
                          </p>
                        </div>
                      </div>

                      {/* Cumulative Total Pill */}
                      <div className="flex items-center space-x-3 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 self-start sm:self-auto">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Puntos Totales
                          </span>
                          <span className="text-base font-black text-amber-300">
                            {selectedPlayerStat?.totalPoints ?? 0} pts
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* KPI Metric Tiles */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* 1. Bazas Pedidas vs Hechas */}
                      <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Bazas Pedidas / Hechas
                        </span>
                        <div className="flex items-baseline space-x-1.5">
                          <span className="text-base font-extrabold text-amber-400">
                            {playerTotalBids}
                          </span>
                          <span className="text-xs text-slate-500">/</span>
                          <span className="text-base font-extrabold text-emerald-400">
                            {playerTotalActuals}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-block ${
                            playerNetDiff === 0
                              ? 'bg-slate-800 text-slate-300'
                              : playerNetDiff > 0
                              ? 'bg-cyan-500/10 text-cyan-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {playerNetDiff === 0
                            ? '🎯 Balance exacto (0)'
                            : playerNetDiff > 0
                            ? `📈 +${playerNetDiff} de más`
                            : `📉 ${playerNetDiff} de menos`}
                        </span>
                      </div>

                      {/* 2. Precisión & Aciertos */}
                      <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Precisión de Pronóstico
                        </span>
                        <div className="flex items-baseline space-x-1">
                          <span className="text-base font-black text-white">
                            {playerAccuracy}%
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-bold block">
                          {playerHitsCount} aciertos / {playerMissesCount} fallos
                        </span>
                      </div>

                      {/* 3. Rachas */}
                      <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Racha de Aciertos
                        </span>
                        <div className="flex items-baseline space-x-1">
                          <span className="text-base font-black text-orange-400">
                            {selectedPlayerStat?.currentStreak ?? 0}
                          </span>
                          <span className="text-xs text-slate-400">seguidos</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          Máx: {selectedPlayerStat?.maxStreak ?? 0} seguidos
                        </span>
                      </div>

                      {/* 4. Margen Medio de Error */}
                      <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Desviación Media
                        </span>
                        <div className="flex items-baseline space-x-1">
                          <span className="text-base font-black text-slate-200">
                            {selectedPlayerStat?.avgErrorMargin ?? 0}
                          </span>
                          <span className="text-xs text-slate-400">bazas/mano</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          Margen de error promedio
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Chart: Bazas Pedidas vs Realizadas por Mano */}
                  <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h5 className="font-extrabold text-sm text-white">
                          Gráfico Mano a Mano: Bazas Pedidas vs. Bazas Realizadas
                        </h5>
                        <p className="text-[11px] text-slate-400">
                          Compara visualmente la apuesta solicitada frente a las bazas ganadas en cada ronda.
                        </p>
                      </div>
                    </div>

                    <div className="h-72 w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={playerRoundData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis
                            dataKey="roundLabel"
                            stroke="#94a3b8"
                            tick={{ fontSize: 10, fill: '#cbd5e1' }}
                          />
                          <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                          <Tooltip content={<CustomPlayerRoundTooltip />} />
                          <Legend
                            wrapperStyle={{ paddingTop: '10px' }}
                            formatter={(value) => (
                              <span className="text-xs font-bold text-slate-300 mr-2">{value}</span>
                            )}
                          />
                          <Bar
                            dataKey="Bazas Pedidas"
                            fill="#F59E0B"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={28}
                          />
                          <Bar
                            dataKey="Bazas Realizadas"
                            fill="#10B981"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={28}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Filterable Table: Hand-by-Hand Breakdown */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-0">
                    <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50">
                      <div>
                        <h5 className="font-extrabold text-sm text-amber-300 flex items-center space-x-2">
                          <ListOrdered className="w-4 h-4 text-amber-400" />
                          <span>Desglose Detallado Mano a Mano ({selectedPlayer?.name})</span>
                        </h5>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Registro completo con triunfo, dador, bazas, desviación, acierto y puntos obtenidos.
                        </p>
                      </div>

                      {/* Filter Chips */}
                      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
                        {[
                          { id: 'all', label: `Todas (${playerRoundData.length})` },
                          { id: 'hits', label: `Aciertos ✓ (${playerHitsCount})` },
                          { id: 'misses', label: `Fallos ✗ (${playerMissesCount})` },
                          { id: 'oros', label: `Oros 🪙 (${playerOrosCount})` },
                        ].map((f) => (
                          <button
                            key={f.id}
                            onClick={() => setHistoryFilter(f.id as any)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                              historyFilter === f.id
                                ? 'bg-amber-500 text-slate-950 font-black shadow'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold">
                            <th className="p-3">Mano / Ronda</th>
                            <th className="p-3 text-center">Cartas</th>
                            <th className="p-3 text-center">Triunfo</th>
                            <th className="p-3">Repartidor</th>
                            <th className="p-3 text-center">Baza Pedida</th>
                            <th className="p-3 text-center">Baza Hecha</th>
                            <th className="p-3 text-center">Desviación</th>
                            <th className="p-3 text-center">Resultado</th>
                            <th className="p-3 text-center">Puntos Mano</th>
                            <th className="p-3 text-center">Acumulado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredPlayerRounds.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="p-6 text-center text-slate-500">
                                No hay manos con el filtro seleccionado.
                              </td>
                            </tr>
                          ) : (
                            filteredPlayerRounds.map((item) => {
                              const suitInfo = SUITS[item.trump] || SUITS['oros'];
                              const isDealer = item.dealer.id === selectedPlayer?.id;
                              return (
                                <tr
                                  key={item.round.id}
                                  className="hover:bg-slate-800/40 transition"
                                >
                                  {/* Round & Phase */}
                                  <td className="p-3 font-bold text-white">
                                    <div className="flex flex-col">
                                      <span>Ronda {item.roundNum}</span>
                                      <span className="text-[10px] text-slate-400 font-normal truncate max-w-[130px]">
                                        {item.round.phaseName || `${item.cards} cartas`}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Cards Count */}
                                  <td className="p-3 text-center font-extrabold text-amber-300">
                                    {item.cards}
                                  </td>

                                  {/* Trump */}
                                  <td className="p-3 text-center">
                                    <span
                                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded border text-xs font-bold ${suitInfo.bgColor} ${suitInfo.color} ${suitInfo.borderColor}`}
                                    >
                                      <span>{suitInfo.symbol}</span>
                                      <span className="hidden sm:inline capitalize">{suitInfo.name}</span>
                                      {suitInfo.isDouble && (
                                        <span className="text-[9px] bg-amber-500 text-slate-950 px-1 rounded font-black">
                                          x2
                                        </span>
                                      )}
                                    </span>
                                  </td>

                                  {/* Dealer */}
                                  <td className="p-3">
                                    <span
                                      className={`text-xs flex items-center space-x-1 ${
                                        isDealer ? 'text-amber-400 font-black' : 'text-slate-300 font-medium'
                                      }`}
                                    >
                                      <span>👑</span>
                                      <span className="truncate max-w-[90px]">{item.dealer.name}</span>
                                    </span>
                                  </td>

                                  {/* Baza Pedida */}
                                  <td className="p-3 text-center">
                                    <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-black text-xs">
                                      {item.bid}
                                    </span>
                                  </td>

                                  {/* Baza Hecha */}
                                  <td className="p-3 text-center">
                                    <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-black text-xs">
                                      {item.actual}
                                    </span>
                                  </td>

                                  {/* Desviación */}
                                  <td className="p-3 text-center">
                                    <span
                                      className={`font-bold px-2 py-0.5 rounded text-[11px] inline-flex items-center space-x-1 ${
                                        item.diff === 0
                                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                          : item.diff > 0
                                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                      }`}
                                    >
                                      {item.diff === 0 ? (
                                        <span>🎯 Exacta (0)</span>
                                      ) : item.diff > 0 ? (
                                        <span>📈 +{item.diff} de más</span>
                                      ) : (
                                        <span>📉 {item.diff} de menos</span>
                                      )}
                                    </span>
                                  </td>

                                  {/* Resultado Acierto/Fallo */}
                                  <td className="p-3 text-center">
                                    <span
                                      className={`font-black px-2 py-0.5 rounded text-xs inline-flex items-center space-x-1 ${
                                        item.hit
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                      }`}
                                    >
                                      {item.hit ? (
                                        <>
                                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                          <span>Acertó</span>
                                        </>
                                      ) : (
                                        <>
                                          <XCircle className="w-3 h-3 text-rose-400" />
                                          <span>Falló</span>
                                        </>
                                      )}
                                    </span>
                                  </td>

                                  {/* Puntos Mano */}
                                  <td className="p-3 text-center">
                                    <div className="flex flex-col items-center">
                                      {item.isPocha && (
                                        <span className="text-[9px] font-black bg-amber-400 text-slate-950 px-1 rounded uppercase tracking-wider mb-0.5">
                                          🔥 POCHA
                                        </span>
                                      )}
                                      <span
                                        className={`font-black text-xs px-2 py-0.5 rounded ${
                                          item.puntos >= 0
                                            ? 'bg-emerald-500/15 text-emerald-300 font-extrabold'
                                            : 'bg-rose-500/15 text-rose-400 font-extrabold'
                                        }`}
                                      >
                                        {item.puntos >= 0 ? `+${item.puntos}` : item.puntos}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Total Acumulado */}
                                  <td className="p-3 text-center font-black text-slate-200 text-xs">
                                    {item.accumulatedPoints} pts
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                /* All Players Matrix View */
                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-0">
                  <div className="p-4 border-b border-slate-800 font-extrabold text-sm text-amber-300 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-amber-400" />
                      <span>Matriz Comparativa de Bazas (Pedidas vs Hechas) de Toda la Mesa</span>
                    </div>
                    <span className="text-xs font-normal text-slate-400">
                      {completedRounds.length} {completedRounds.length === 1 ? 'mano disputada' : 'manos disputadas'}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold">
                          <th className="p-3 text-center">Ronda</th>
                          <th className="p-3 text-center">Cartas</th>
                          <th className="p-3 text-center">Triunfo</th>
                          <th className="p-3">Dador</th>
                          {players.map((p) => (
                            <th
                              key={p.id}
                              className="p-3 text-center border-l border-slate-800/80 min-w-[100px]"
                            >
                              <div className="flex flex-col items-center justify-center space-y-0.5">
                                <span>{p.avatar}</span>
                                <span className="font-bold text-white text-xs truncate max-w-[80px]">
                                  {p.name}
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {completedRounds.map((round) => {
                          const suitInfo = SUITS[round.trump] || SUITS['oros'];
                          const dealer = players[round.dealerIndex % players.length] || players[0];
                          return (
                            <tr key={round.id} className="hover:bg-slate-800/40 transition">
                              <td className="p-3 text-center font-bold text-white">
                                R{round.roundNumber}
                              </td>
                              <td className="p-3 text-center font-extrabold text-amber-300">
                                {round.cards}
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded border text-[11px] font-bold ${suitInfo.bgColor} ${suitInfo.color} ${suitInfo.borderColor}`}
                                >
                                  <span>{suitInfo.symbol}</span>
                                  {suitInfo.isDouble && (
                                    <span className="text-[8px] bg-amber-500 text-slate-950 px-1 rounded font-black">
                                      x2
                                    </span>
                                  )}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="text-xs text-slate-300 truncate block max-w-[90px]">
                                  👑 {dealer.name}
                                </span>
                              </td>
                              {players.map((p) => {
                                const score = round.scores[p.id];
                                if (!score || score.bid === null || score.actual === null) {
                                  return (
                                    <td
                                      key={p.id}
                                      className="p-2.5 text-center border-l border-slate-800/60 text-slate-600"
                                    >
                                      -
                                    </td>
                                  );
                                }
                                return (
                                  <td
                                    key={p.id}
                                    className="p-2.5 text-center border-l border-slate-800/60"
                                  >
                                    <div className="flex flex-col items-center justify-center space-y-1">
                                      <div className="flex items-center space-x-1 text-xs">
                                        <span className="text-amber-400 font-bold">
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
                                      <span
                                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                          score.hit
                                            ? 'bg-emerald-500/15 text-emerald-400'
                                            : 'bg-rose-500/15 text-rose-400'
                                        }`}
                                      >
                                        {score.hit ? '✓' : '✗'}{' '}
                                        {score.points >= 0 ? `+${score.points}` : score.points}
                                      </span>
                                    </div>
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
              )}
            </div>
          )}

          {/* TAB: Aciertos vs Errores / Bazas Pedidas vs Realizadas */}
          {activeTab === 'hits_misses' && (
            <div className="space-y-6">
              {/* Header + Subview Selectors */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-base sm:text-lg text-amber-300 flex items-center space-x-2">
                    <Target className="w-5 h-5 text-amber-400" />
                    <span>Comparativa de Aciertos vs. Errores</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Análisis comparativo de las bazas cantadas frente a las bazas ganadas y tasa de éxito.
                  </p>
                </div>

                {/* Subview Pills */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 self-start sm:self-auto">
                  <button
                    onClick={() => setChartSubView('bids_actuals')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                      chartSubView === 'bids_actuals'
                        ? 'bg-amber-500 text-slate-950 shadow font-black'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Bazas (Pedidas vs Hechas)</span>
                  </button>
                  <button
                    onClick={() => setChartSubView('rounds_hit_miss')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                      chartSubView === 'rounds_hit_miss'
                        ? 'bg-amber-500 text-slate-950 shadow font-black'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Rondas (Aciertos vs Fallos)</span>
                  </button>
                  <button
                    onClick={() => setChartSubView('player_detail')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                      chartSubView === 'player_detail'
                        ? 'bg-amber-500 text-slate-950 shadow font-black'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Detalle por Jugador</span>
                  </button>
                </div>
              </div>

              {/* KPI Mini-cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Total Bazas Pedidas
                  </span>
                  <span className="text-lg font-black text-amber-400 mt-0.5 block">
                    {totalBidsMatch} bazas
                  </span>
                  <span className="text-[11px] text-slate-500">en toda la partida</span>
                </div>
                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Total Bazas Hechas
                  </span>
                  <span className="text-lg font-black text-emerald-400 mt-0.5 block">
                    {totalActualsMatch} bazas
                  </span>
                  <span className="text-[11px] text-slate-500">ganadas en mesa</span>
                </div>
                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Precisión Global
                  </span>
                  <span className="text-lg font-black text-white mt-0.5 block">
                    {globalAccuracy}%
                  </span>
                  <span className="text-[11px] text-emerald-400">{totalHitsMatch} de {totalRoundsCount} rondas</span>
                </div>
                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Mayor Equilibrio
                  </span>
                  <span className="text-lg font-black text-amber-300 mt-0.5 truncate block">
                    {mostBalancedPlayer?.player.name || '-'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    dif. {Math.abs((mostBalancedPlayer?.totalActuals || 0) - (mostBalancedPlayer?.totalBids || 0))} bazas
                  </span>
                </div>
              </div>

              {/* Chart Render Area */}
              {completedRounds.length === 0 ? (
                <div className="h-72 bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-slate-500 text-sm text-center">
                  <Target className="w-10 h-10 text-slate-600 mb-2" />
                  <p className="font-bold text-slate-400">Sin datos de rondas completadas</p>
                  <p className="text-xs text-slate-600 mt-1 max-w-sm">
                    Anota y completa al menos 1 mano para generar la comparativa de bazas y aciertos vs errores.
                  </p>
                </div>
              ) : chartSubView === 'bids_actuals' ? (
                /* Subview 1: Bazas Pedidas vs Bazas Realizadas */
                <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-extrabold text-sm text-white">
                        Bazas Pedidas vs. Bazas Realizadas por Jugador
                      </h5>
                      <p className="text-[11px] text-slate-400">
                        Compara el volumen de bazas que cada jugador solicitó contra las que finalmente consiguió.
                      </p>
                    </div>
                  </div>

                  <div className="h-80 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke="#94a3b8"
                          tick={{ fontSize: 12, fill: '#cbd5e1', fontWeight: 600 }}
                        />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <Tooltip content={<CustomBidsActualsTooltip />} />
                        <Legend
                          wrapperStyle={{ paddingTop: '10px' }}
                          formatter={(value) => (
                            <span className="text-xs font-bold text-slate-300 mr-2">{value}</span>
                          )}
                        />
                        <Bar
                          dataKey="Bazas Pedidas"
                          fill="#F59E0B"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={45}
                        />
                        <Bar
                          dataKey="Bazas Realizadas"
                          fill="#10B981"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={45}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : chartSubView === 'rounds_hit_miss' ? (
                /* Subview 2: Rondas Acertadas vs Rondas Falladas */
                <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
                  <div>
                    <h5 className="font-extrabold text-sm text-white">
                      Rondas Acertadas vs. Rondas Falladas (Aciertos vs. Errores)
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Muestra el número de manos en las que se cumplió el pronóstico exacto vs cuántas manos resultaron en fallo.
                    </p>
                  </div>

                  <div className="h-80 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke="#94a3b8"
                          tick={{ fontSize: 12, fill: '#cbd5e1', fontWeight: 600 }}
                        />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '0.75rem',
                            color: '#fff',
                            fontSize: '12px',
                          }}
                        />
                        <Legend
                          wrapperStyle={{ paddingTop: '10px' }}
                          formatter={(value) => (
                            <span className="text-xs font-bold text-slate-300 mr-2">{value}</span>
                          )}
                        />
                        <Bar
                          dataKey="Rondas Acertadas"
                          fill="#10B981"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={45}
                        />
                        <Bar
                          dataKey="Rondas Falladas"
                          fill="#EF4444"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={45}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                /* Subview 3: Detailed Round by Round for a Single Player */
                <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h5 className="font-extrabold text-sm text-white">
                        Evolución Mano a Mano: {selectedPlayer?.name}
                      </h5>
                      <p className="text-[11px] text-slate-400">
                        Bazas pedidas vs realizadas en cada mano disputada de la partida.
                      </p>
                    </div>

                    {/* Player selector buttons */}
                    <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full">
                      {players.map((p) => {
                        const isSelected = (selectedPlayer?.id || '') === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => setSelectedPlayerId(p.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 shrink-0 cursor-pointer border ${
                              isSelected
                                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow'
                                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                          >
                            <span>{p.avatar}</span>
                            <span>{p.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="h-80 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={playerRoundData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis
                          dataKey="roundLabel"
                          stroke="#94a3b8"
                          tick={{ fontSize: 10, fill: '#cbd5e1' }}
                        />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <Tooltip content={<CustomPlayerRoundTooltip />} />
                        <Legend
                          wrapperStyle={{ paddingTop: '10px' }}
                          formatter={(value) => (
                            <span className="text-xs font-bold text-slate-300 mr-2">{value}</span>
                          )}
                        />
                        <Bar
                          dataKey="Bazas Pedidas"
                          fill="#F59E0B"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={30}
                        />
                        <Bar
                          dataKey="Bazas Realizadas"
                          fill="#3B82F6"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={30}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Table of Comparative Bids vs Actuals Metrics */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-800 font-extrabold text-sm text-amber-300 flex items-center justify-between">
                  <span>Tabla Comparativa de Bazas y Precisión</span>
                  <span className="text-xs font-normal text-slate-400">
                    {completedRounds.length} {completedRounds.length === 1 ? 'ronda jugada' : 'rondas jugadas'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold">
                        <th className="p-3">Jugador</th>
                        <th className="p-3 text-center">Bazas Pedidas</th>
                        <th className="p-3 text-center">Bazas Hechas</th>
                        <th className="p-3 text-center">Desviación Neta</th>
                        <th className="p-3 text-center">Aciertos (✓)</th>
                        <th className="p-3 text-center">Fallos (✗)</th>
                        <th className="p-3 text-center">% Precisión</th>
                        <th className="p-3 text-center">Puntos Totales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {stats.map((st) => {
                        const netDiff = st.totalActuals - st.totalBids;
                        return (
                          <tr key={st.player.id} className="hover:bg-slate-800/40 transition">
                            <td className="p-3 flex items-center space-x-2">
                              <span>{st.player.avatar}</span>
                              <span className="font-bold text-white">{st.player.name}</span>
                            </td>
                            <td className="p-3 text-center font-bold text-amber-400">
                              {st.totalBids}
                            </td>
                            <td className="p-3 text-center font-bold text-emerald-400">
                              {st.totalActuals}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                                  netDiff === 0
                                    ? 'bg-slate-800 text-slate-300 border border-slate-700'
                                    : netDiff > 0
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {netDiff === 0
                                  ? '0 (Exacto)'
                                  : netDiff > 0
                                  ? `+${netDiff} de más`
                                  : `${netDiff} de menos`}
                              </span>
                            </td>
                            <td className="p-3 text-center font-bold text-emerald-400">
                              {st.totalHits}
                            </td>
                            <td className="p-3 text-center font-bold text-rose-400">
                              {st.totalMisses}
                            </td>
                            <td className="p-3 text-center font-bold">
                              <span className="text-white">{st.hitPercentage}%</span>
                            </td>
                            <td className="p-3 text-center font-black text-amber-300 text-sm">
                              {st.totalPoints}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Overview Highlights */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Highlight Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Mano de Hierro (% Aciertos) */}
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl border border-emerald-500/30 shrink-0">
                    🎯
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">
                      Mayor Precisión
                    </span>
                    <span className="font-black text-white text-base truncate block">
                      {bestHitPlayer?.player.name || '-'}
                    </span>
                    <span className="text-xs font-bold text-emerald-400">
                      {bestHitPlayer?.hitPercentage || 0}% de aciertos
                    </span>
                  </div>
                </div>

                {/* 2. Rey de Oros */}
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl border border-amber-500/30 shrink-0">
                    🪙
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">
                      Rey del Oros
                    </span>
                    <span className="font-black text-white text-base truncate block">
                      {bestOrosPlayer?.player.name || '-'}
                    </span>
                    <span className="text-xs font-bold text-amber-400">
                      +{bestOrosPlayer?.orosPoints || 0} pts en Oros
                    </span>
                  </div>
                </div>

                {/* 3. Mayor Racha */}
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center text-2xl border border-orange-500/30 shrink-0">
                    🔥
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">
                      Mejor Racha
                    </span>
                    <span className="font-black text-white text-base truncate block">
                      {maxStreakPlayer?.player.name || '-'}
                    </span>
                    <span className="text-xs font-bold text-orange-400">
                      {maxStreakPlayer?.maxStreak || 0} aciertos seguidos
                    </span>
                  </div>
                </div>

                {/* 4. Mayor Descalabro */}
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-2xl border border-rose-500/30 shrink-0">
                    ⚠️
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">
                      Mayor Descalabro
                    </span>
                    <span className="font-black text-white text-base truncate block">
                      {biggestBlunder?.player.name || '-'}
                    </span>
                    <span className="text-xs font-bold text-rose-400">
                      {biggestBlunder?.points || 0} pts (Ronda {biggestBlunder?.roundNumber || 0})
                    </span>
                  </div>
                </div>
              </div>

              {/* Table of Detailed Player Stats */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 font-extrabold text-sm text-amber-300">
                  Desglose General de Jugadores
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold">
                        <th className="p-3">Pos</th>
                        <th className="p-3">Jugador</th>
                        <th className="p-3 text-center">Puntos Totales</th>
                        <th className="p-3 text-center">Aciertos</th>
                        <th className="p-3 text-center">Fallos</th>
                        <th className="p-3 text-center">% Precisión</th>
                        <th className="p-3 text-center">Puntos en Oros</th>
                        <th className="p-3 text-center">Margen Error Medio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {stats.map((st) => (
                        <tr key={st.player.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3 font-bold text-amber-400">{st.rank}º</td>
                          <td className="p-3 flex items-center space-x-2">
                            <span>{st.player.avatar}</span>
                            <span className="font-bold text-white">{st.player.name}</span>
                          </td>
                          <td className="p-3 text-center font-black text-amber-300 text-sm">
                            {st.totalPoints}
                          </td>
                          <td className="p-3 text-center font-bold text-emerald-400">
                            {st.totalHits}
                          </td>
                          <td className="p-3 text-center font-bold text-rose-400">
                            {st.totalMisses}
                          </td>
                          <td className="p-3 text-center font-bold">{st.hitPercentage}%</td>
                          <td className="p-3 text-center font-bold text-amber-400">
                            {st.orosPoints}
                          </td>
                          <td className="p-3 text-center text-slate-400">{st.avgErrorMargin} bazas</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Timeline Line Chart */}
          {activeTab === 'timeline' && (
            <div className="space-y-5">
              {/* Header & Description */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-base text-amber-300 flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-amber-400" />
                    <span>Evolución de Puntuación Acumulada por Ronda</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Compara la trayectoria y remontadas de todos los jugadores mano a mano a lo largo de la partida.
                  </p>
                </div>

                {/* Display Controls */}
                <div className="flex items-center space-x-2 shrink-0 text-xs">
                  <button
                    onClick={() => setIncludeOriginZero(!includeOriginZero)}
                    className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer flex items-center space-x-1 ${
                      includeOriginZero
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <span>{includeOriginZero ? '✓' : '○'}</span>
                    <span>Desde 0 pts</span>
                  </button>

                  <button
                    onClick={() =>
                      setTimelineCurveType(timelineCurveType === 'monotone' ? 'linear' : 'monotone')
                    }
                    className="px-2.5 py-1 rounded-lg font-bold bg-slate-900 text-slate-300 border border-slate-800 hover:text-white transition cursor-pointer"
                  >
                    {timelineCurveType === 'monotone' ? 'Curva Suave' : 'Líneas Rectas'}
                  </button>
                </div>
              </div>

              {/* Timeline Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Líder Actual */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-500/30 flex items-center space-x-3 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl border border-amber-500/30 shrink-0">
                    👑
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">
                      Líder Actual (1º)
                    </span>
                    <span className="font-black text-amber-300 text-sm truncate block">
                      {currentLeader?.player.name || '-'}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-bold">
                      {currentLeader?.totalPoints || 0} pts {leaderLead > 0 ? `(+${leaderLead} sobre 2º)` : ''}
                    </span>
                  </div>
                </div>

                {/* 2. Mayor Salto en una Mano */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center space-x-3 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl border border-emerald-500/30 shrink-0">
                    🚀
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">
                      Mayor Salto en 1 Mano
                    </span>
                    <span className="font-black text-white text-sm truncate block">
                      {biggestSingleRoundJump?.player.name || '-'}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-bold">
                      +{biggestSingleRoundJump?.points || 0} pts (R{biggestSingleRoundJump?.roundNumber || 0} {biggestSingleRoundJump?.trumpSymbol})
                    </span>
                  </div>
                </div>

                {/* 3. Mayor Caída */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center space-x-3 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center text-xl border border-rose-500/30 shrink-0">
                    📉
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">
                      Mayor Caída en 1 Mano
                    </span>
                    <span className="font-black text-white text-sm truncate block">
                      {biggestBlunder?.player.name || '-'}
                    </span>
                    <span className="text-[11px] text-rose-400 font-bold">
                      {biggestBlunder?.points || 0} pts (R{biggestBlunder?.roundNumber || 0})
                    </span>
                  </div>
                </div>

                {/* 4. Rondas Jugadas */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center space-x-3 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl border border-blue-500/30 shrink-0">
                    🃏
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">
                      Progreso de Partida
                    </span>
                    <span className="font-black text-white text-sm truncate block">
                      {completedRounds.length} / {rounds.length} Rondas
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {Math.round((completedRounds.length / (rounds.length || 1)) * 100)}% completado
                    </span>
                  </div>
                </div>
              </div>

              {/* Player Visibility Filter Pills */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
                  <span className="text-xs font-bold text-slate-400 mr-1 flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>Líneas visibles:</span>
                  </span>

                  {players.map((p) => {
                    const isVisible = visibleTimelinePlayers[p.id] !== false;
                    const pStat = stats.find((s) => s.player.id === p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() =>
                          setVisibleTimelinePlayers({
                            ...visibleTimelinePlayers,
                            [p.id]: !isVisible,
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer border ${
                          isVisible
                            ? 'bg-slate-900 text-white border-slate-700 shadow-sm'
                            : 'bg-slate-950/60 text-slate-500 border-slate-900 opacity-50 hover:opacity-80'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span>{p.avatar}</span>
                        <span>{p.name}</span>
                        <span className="text-[10px] font-mono text-amber-300/90 font-bold ml-1">
                          ({pStat?.totalPoints ?? 0})
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      const allOn: Record<string, boolean> = {};
                      players.forEach((p) => {
                        allOn[p.id] = true;
                      });
                      setVisibleTimelinePlayers(allOn);
                    }}
                    className="text-[11px] px-2 py-0.5 rounded bg-slate-900 text-amber-300 font-bold hover:bg-slate-800 transition cursor-pointer"
                  >
                    Mostrar todos
                  </button>
                </div>
              </div>

              {/* Main LineChart Container */}
              <div className="h-96 w-full bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-2">
                {completedRounds.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={timelineData}
                      margin={{ top: 15, right: 20, left: -5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="roundName"
                        stroke="#94a3b8"
                        tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        tickFormatter={(val) => `${val} pts`}
                      />
                      <ReferenceLine
                        y={0}
                        stroke="#475569"
                        strokeDasharray="4 4"
                        label={{
                          value: '0 pts',
                          fill: '#64748b',
                          fontSize: 10,
                          position: 'insideBottomRight',
                        }}
                      />
                      <Tooltip content={<CustomTimelineTooltip />} />
                      <Legend
                        wrapperStyle={{ paddingTop: '12px' }}
                        formatter={(value) => (
                          <span className="text-xs font-bold text-slate-300 mr-2">{value}</span>
                        )}
                      />
                      {players.map((p) => {
                        const isVisible = visibleTimelinePlayers[p.id] !== false;
                        if (!isVisible) return null;
                        return (
                          <Line
                            key={p.id}
                            type={timelineCurveType}
                            dataKey={p.name}
                            stroke={p.color}
                            strokeWidth={3}
                            dot={{ r: 3.5, strokeWidth: 1, fill: p.color }}
                            activeDot={{ r: 7, strokeWidth: 2, stroke: '#ffffff', fill: p.color }}
                            connectNulls
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
                    <TrendingUp className="w-10 h-10 text-slate-600 mb-2" />
                    <p className="font-bold text-slate-400">Sin rondas completadas aún</p>
                    <p className="text-xs text-slate-600 mt-1 max-w-sm text-center">
                      Completa al menos una mano para visualizar la gráfica interactiva de evolución de puntos.
                    </p>
                  </div>
                )}
              </div>

              {/* Round by Round Accumulated Points Table */}
              {completedRounds.length > 0 && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-slate-800 font-extrabold text-sm text-amber-300 flex items-center justify-between">
                    <span>Progresión Ronda a Ronda de Puntos Acumulados</span>
                    <span className="text-xs font-normal text-slate-400">
                      {completedRounds.length} {completedRounds.length === 1 ? 'mano disputada' : 'manos disputadas'}
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 font-bold z-10">
                        <tr>
                          <th className="p-3">Ronda</th>
                          <th className="p-3 text-center">Cartas</th>
                          <th className="p-3 text-center">Triunfo</th>
                          {players.map((p) => (
                            <th key={p.id} className="p-3 text-center">
                              <span className="flex items-center justify-center space-x-1">
                                <span>{p.avatar}</span>
                                <span>{p.name}</span>
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {completedRounds.map((r) => {
                          const suit = SUITS[r.trump] || SUITS['oros'];
                          return (
                            <tr key={r.id} className="hover:bg-slate-800/40 transition">
                              <td className="p-3 font-bold text-white">Ronda {r.roundNumber}</td>
                              <td className="p-3 text-center font-bold text-amber-400">
                                {r.cards} {r.cards === 1 ? 'carta' : 'cartas'}
                              </td>
                              <td className="p-3 text-center">
                                <span className="inline-flex items-center space-x-1 font-bold text-slate-200">
                                  <span>{suit.symbol}</span>
                                  <span className="text-[11px]">{suit.name}</span>
                                  {suit.isDouble && (
                                    <span className="text-[10px] text-amber-400 font-black">
                                      (x2)
                                    </span>
                                  )}
                                </span>
                              </td>
                              {players.map((p) => {
                                const sc = r.scores[p.id];
                                const pts = sc?.accumulatedPoints ?? 0;
                                const delta = sc?.points ?? 0;
                                return (
                                  <td key={p.id} className="p-3 text-center">
                                    <div className="flex flex-col items-center">
                                      <span className="font-black text-amber-300 text-xs">
                                        {pts} pts
                                      </span>
                                      <span
                                        className={`text-[10px] font-bold ${
                                          delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                        }`}
                                      >
                                        ({delta >= 0 ? `+${delta}` : delta})
                                      </span>
                                    </div>
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
              )}
            </div>
          )}

          {/* TAB: Oros Impact Bar Chart */}
          {activeTab === 'oros' && (
            <div className="space-y-4">
              <h4 className="font-extrabold text-base text-amber-300">
                Impacto de Rondas con Triunfo de Oros (🪙 Puntuación Doble)
              </h4>
              <p className="text-xs text-slate-400">
                Compara los puntos ganados o perdidos en rondas de Oros frente a otros palos.
              </p>

              <div className="h-80 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={orosData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#fff',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Oros" fill="#F59E0B" name="Puntos en Oros (x2)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="OtrosPalos" fill="#3B82F6" name="Puntos en Copas/Espadas/Bastos" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
