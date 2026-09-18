import React, { useState, useEffect } from 'react';
import { Game, GameRules, Player, Round, Suit } from './types';
import {
  generateDefaultRounds,
  getDefaultDeckForPlayers,
  recalculateGameScores,
  calculatePlayerStats,
  adaptRoundsForNewPlayerCount,
  reorderGamePlayers,
} from './utils/pocha';
import {
  saveCompletedGame,
  loadRecentWinners,
  RecentWinner,
  SavedGame,
  exportActiveGameAsJSON,
} from './utils/history';
import { Navbar } from './components/Navbar';
import { SetupGame } from './components/SetupGame';
import { ActiveRound } from './components/ActiveRound';
import { Leaderboard } from './components/Leaderboard';
import { ScoreTable } from './components/ScoreTable';
import { VoiceDictationModal } from './components/VoiceDictationModal';
import { StatisticsModal } from './components/StatisticsModal';
import { RulesModal } from './components/RulesModal';
import { GameSummaryModal } from './components/GameSummaryModal';
import { DownloadAppModal } from './components/DownloadAppModal';
import { AddPlayerModal } from './components/AddPlayerModal';
import { EditRoundModal } from './components/EditRoundModal';
import { ReorderPlayersModal } from './components/ReorderPlayersModal';
import { SavedGamesModal } from './components/SavedGamesModal';
import { Trophy, Play, BarChart3, RotateCcw, AlertTriangle, FolderArchive } from 'lucide-react';
import {
  getSafeStorage,
  STORAGE_KEYS,
  sanitizeGame,
  saveGameRoundSnapshot,
  getLatestGameSnapshot,
  clearGameSnapshots,
  resetAppToZero,
} from './utils/safeBoot';

export default function App() {
  const [game, setGame] = useState<Game | null>(() => {
    try {
      const storage = getSafeStorage();
      const saved = storage.getItem(STORAGE_KEYS.GAME);
      if (saved) {
        const parsed = JSON.parse(saved);
        const sanitized = sanitizeGame(parsed);
        if (sanitized) return sanitized;
      }
    } catch (e) {
      console.error('Failed to load saved game in App component:', e);
    }
    return null;
  });

  // Recent winners state
  const [recentWinners, setRecentWinners] = useState<RecentWinner[]>(() => loadRecentWinners());

  // Modal Visibility States
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceMode, setVoiceMode] = useState<'bids' | 'actuals'>('bids');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [showReorderPlayersModal, setShowReorderPlayersModal] = useState(false);
  const [showEditRoundModal, setShowEditRoundModal] = useState(false);
  const [showSavedGamesModal, setShowSavedGamesModal] = useState(false);
  const [editRoundIndex, setEditRoundIndex] = useState(0);
  const [showNewGameConfirmModal, setShowNewGameConfirmModal] = useState(false);
  const [showResetRoundConfirmModal, setShowResetRoundConfirmModal] = useState(false);
  const [showResetAppModal, setShowResetAppModal] = useState(false);

  // Auto save game state to safe storage
  useEffect(() => {
    try {
      const storage = getSafeStorage();
      if (game) {
        storage.setItem(STORAGE_KEYS.GAME, JSON.stringify(game));
      } else {
        storage.removeItem(STORAGE_KEYS.GAME);
      }
    } catch (e) {
      console.error('Error with safe storage persistence:', e);
    }
  }, [game]);

  // Start a new game
  const handleStartGame = (players: Player[], rules: GameRules) => {
    const deck = rules.deckCards || getDefaultDeckForPlayers(players.length);
    const rawRounds = generateDefaultRounds(players.length, deck, rules);
    const initialRounds = recalculateGameScores(players, rawRounds, rules);

    const newGame: Game = {
      id: `game_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      players,
      rounds: initialRounds,
      currentRoundIndex: 0,
      rules: { ...rules, deckCards: deck },
      isFinished: false,
      name: `Partida de ${players.length} jugadores`,
    };

    clearGameSnapshots();
    setGame(newGame);
    setShowSummaryModal(false);
    saveGameRoundSnapshot(newGame, 0);
  };

  // Update Bids for current round
  const handleUpdateBids = (bids: Record<string, number>) => {
    if (!game) return;

    const currentIdx = game.currentRoundIndex;
    const updatedRounds = [...game.rounds];
    const currentRound = { ...updatedRounds[currentIdx] };

    const newScores = { ...currentRound.scores };
    game.players.forEach((p) => {
      newScores[p.id] = {
        ...(newScores[p.id] || {
          playerId: p.id,
          bid: null,
          actual: null,
          points: 0,
          accumulatedPoints: 0,
          hit: null,
          difference: 0,
        }),
        bid: bids[p.id] !== undefined ? bids[p.id] : null,
      };
    });

    currentRound.scores = newScores;
    currentRound.phase = 'playing'; // Move from bidding to playing phase
    updatedRounds[currentIdx] = currentRound;

    const recalculated = recalculateGameScores(game.players, updatedRounds, game.rules);

    setGame({
      ...game,
      rounds: recalculated,
      updatedAt: new Date().toISOString(),
    });
  };

  // Update Actuals (bazas hechas) & complete round
  const handleUpdateActuals = (actuals: Record<string, number>) => {
    if (!game) return;

    const currentIdx = game.currentRoundIndex;
    const updatedRounds = [...game.rounds];
    const currentRound = { ...updatedRounds[currentIdx] };

    const newScores = { ...currentRound.scores };
    game.players.forEach((p) => {
      newScores[p.id] = {
        ...(newScores[p.id] || {
          playerId: p.id,
          bid: null,
          actual: null,
          points: 0,
          accumulatedPoints: 0,
          hit: null,
          difference: 0,
        }),
        actual: actuals[p.id] !== undefined ? actuals[p.id] : null,
      };
    });

    currentRound.scores = newScores;
    currentRound.phase = 'completed';
    updatedRounds[currentIdx] = currentRound;

    // Recalculate scores across entire game
    const recalculated = recalculateGameScores(game.players, updatedRounds, game.rules);

    const nextIndex = currentIdx + 1;
    const isFinished = nextIndex >= recalculated.length;

    const updatedGame: Game = {
      ...game,
      rounds: recalculated,
      currentRoundIndex: isFinished ? currentIdx : nextIndex,
      isFinished,
      updatedAt: new Date().toISOString(),
    };

    setGame(updatedGame);
    // Persist snapshot checkpoint upon round completion
    saveGameRoundSnapshot(updatedGame, currentIdx);

    if (isFinished) {
      const finalStats = calculatePlayerStats(game.players, recalculated);
      saveCompletedGame(updatedGame, finalStats);
      setRecentWinners(loadRecentWinners());
      setShowSummaryModal(true);
    }
  };

  // Change Trump Suit for current round
  const handleChangeTrump = (trump: Suit) => {
    if (!game) return;
    const currentIdx = game.currentRoundIndex;
    const updatedRounds = [...game.rounds];
    updatedRounds[currentIdx] = {
      ...updatedRounds[currentIdx],
      trump,
    };

    const recalculated = recalculateGameScores(game.players, updatedRounds, game.rules);
    setGame({ ...game, rounds: recalculated });
  };

  // Edit score in a previous round
  const handleEditRoundScore = (
    roundIndex: number,
    playerId: string,
    bid: number,
    actual: number
  ) => {
    if (!game) return;

    const updatedRounds = [...game.rounds];
    const targetRound = { ...updatedRounds[roundIndex] };

    targetRound.scores = {
      ...targetRound.scores,
      [playerId]: {
        ...(targetRound.scores[playerId] || {
          playerId,
          bid: null,
          actual: null,
          points: 0,
          accumulatedPoints: 0,
          hit: null,
          difference: 0,
        }),
        bid,
        actual,
      },
    };

    updatedRounds[roundIndex] = targetRound;
    const recalculated = recalculateGameScores(game.players, updatedRounds, game.rules);
    setGame({ ...game, rounds: recalculated });
  };

  // Add new player mid-game with insertion after dealer and round table adaptation
  const handleAddPlayer = (
    newPlayer: Player,
    insertPosition?: number,
    recalculateRoundTable: boolean = true,
    customOrderedPlayers?: Player[]
  ) => {
    if (!game) return;

    const currentRound = game.rounds[game.currentRoundIndex];
    const dealerIdx = currentRound
      ? currentRound.dealerIndex % game.players.length
      : 0;

    // Default position is immediately after the dealer
    const pos =
      insertPosition !== undefined
        ? Math.max(0, Math.min(game.players.length, insertPosition))
        : dealerIdx + 1;

    // Use custom ordered players if supplied by seating table, else standard insertion
    const updatedPlayers =
      customOrderedPlayers && customOrderedPlayers.length === game.players.length + 1
        ? customOrderedPlayers
        : [
            ...game.players.slice(0, pos),
            newPlayer,
            ...game.players.slice(pos),
          ];

    let updatedRounds: Round[];
    if (recalculateRoundTable) {
      updatedRounds = adaptRoundsForNewPlayerCount(
        game.rounds,
        game.currentRoundIndex,
        game.players,
        updatedPlayers,
        game.rules,
        game.rules.deckCards || 40
      );
    } else {
      updatedRounds = recalculateGameScores(
        updatedPlayers,
        game.rounds,
        game.rules
      );
    }

    const updatedGame: Game = {
      ...game,
      players: updatedPlayers,
      rounds: updatedRounds,
      updatedAt: new Date().toISOString(),
    };

    setGame(updatedGame);
    saveGameRoundSnapshot(updatedGame, game.currentRoundIndex);
  };

  // Reorder players physically around the table
  const handleReorderPlayers = (
    newPlayersOrder: Player[],
    rotateFutureDealers: boolean = true
  ) => {
    if (!game) return;

    const result = reorderGamePlayers(
      game.rounds,
      game.currentRoundIndex,
      game.players,
      newPlayersOrder,
      game.rules,
      rotateFutureDealers
    );

    const updatedGame: Game = {
      ...game,
      players: result.players,
      rounds: result.rounds,
      updatedAt: new Date().toISOString(),
    };

    setGame(updatedGame);
    saveGameRoundSnapshot(updatedGame, game.currentRoundIndex);
  };

  // Bulk save round scores and trump from EditRoundModal
  const handleSaveBulkRoundScore = (
    roundIndex: number,
    updatedScoresMap: Record<string, { bid: number; actual: number }>,
    updatedTrump?: Suit
  ) => {
    if (!game) return;
    const updatedRounds = [...game.rounds];
    const targetRound = { ...updatedRounds[roundIndex] };

    if (updatedTrump) {
      targetRound.trump = updatedTrump;
    }

    const newScores = { ...targetRound.scores };
    game.players.forEach((p) => {
      const entry = updatedScoresMap[p.id];
      if (entry) {
        newScores[p.id] = {
          ...(newScores[p.id] || {
            playerId: p.id,
            bid: null,
            actual: null,
            points: 0,
            accumulatedPoints: 0,
            hit: null,
            difference: 0,
          }),
          bid: entry.bid,
          actual: entry.actual,
        };
      }
    });

    targetRound.scores = newScores;
    targetRound.phase = 'completed';
    updatedRounds[roundIndex] = targetRound;

    const recalculated = recalculateGameScores(game.players, updatedRounds, game.rules);
    const updatedGame = {
      ...game,
      rounds: recalculated,
      updatedAt: new Date().toISOString(),
    };
    setGame(updatedGame);
    saveGameRoundSnapshot(updatedGame, roundIndex);
  };

  // Delete a round dynamically from the active game
  const handleDeleteRound = (roundIndex: number) => {
    if (!game || game.rounds.length <= 1) return;
    const updatedRounds = game.rounds.filter((_, idx) => idx !== roundIndex);
    // Re-index round numbers
    const reindexedRounds = updatedRounds.map((r, idx) => ({
      ...r,
      roundNumber: idx + 1,
      id: `round_${idx + 1}`,
    }));

    let nextCurrentIdx = game.currentRoundIndex;
    if (roundIndex < nextCurrentIdx) {
      nextCurrentIdx = Math.max(0, nextCurrentIdx - 1);
    } else if (nextCurrentIdx >= reindexedRounds.length) {
      nextCurrentIdx = reindexedRounds.length - 1;
    }

    const recalculated = recalculateGameScores(game.players, reindexedRounds, game.rules);
    const updatedGame = {
      ...game,
      rounds: recalculated,
      currentRoundIndex: nextCurrentIdx,
      updatedAt: new Date().toISOString(),
    };
    setGame(updatedGame);
    saveGameRoundSnapshot(updatedGame, nextCurrentIdx);
  };

  // Confirm Reset Current Round
  const executeResetCurrentRound = () => {
    if (!game) return;
    const currentIdx = game.currentRoundIndex;
    const updatedRounds = [...game.rounds];
    updatedRounds[currentIdx] = {
      ...updatedRounds[currentIdx],
      phase: 'bidding',
      scores: {},
    };

    const recalculated = recalculateGameScores(game.players, updatedRounds, game.rules);
    setGame({ ...game, rounds: recalculated });
    setShowResetRoundConfirmModal(false);
  };

  // Reset current round back to bidding phase
  const handleResetCurrentRound = () => {
    if (!game) return;
    setShowResetRoundConfirmModal(true);
  };

  // Open Voice Dictation
  const handleOpenVoiceModal = (mode: 'bids' | 'actuals') => {
    setVoiceMode(mode);
    setShowVoiceModal(true);
  };

  // Current stats calculation
  const stats = game ? calculatePlayerStats(game.players, game.rounds) : [];
  const validRoundIdx = game && game.rounds.length > 0
    ? Math.min(Math.max(0, game.currentRoundIndex), game.rounds.length - 1)
    : 0;
  const currentRound = game && game.rounds.length > 0 ? game.rounds[validRoundIdx] : null;
  const completedRoundsCount = game
    ? game.rounds.filter((r) => r.phase === 'completed').length
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        appName="Anotador de La Pocha"
        onNewGame={() => {
          if (!game) {
            setGame(null);
          } else {
            setShowNewGameConfirmModal(true);
          }
        }}
        onShowStats={() => setShowStatsModal(true)}
        onShowRules={() => setShowRulesModal(true)}
        onShowHistory={() => setShowSavedGamesModal(true)}
        onShowDownload={() => setShowDownloadModal(true)}
        onExportGameJson={game ? () => exportActiveGameAsJSON(game) : undefined}
        onResetRound={handleResetCurrentRound}
        onResetAppToZero={() => setShowResetAppModal(true)}
        isGameActive={!!game}
        currentRoundNum={currentRound ? currentRound.roundNumber : undefined}
        totalRoundsNum={game ? game.rounds.length : undefined}
        completedRoundsNum={completedRoundsCount}
        currentRoundCards={currentRound ? currentRound.cards : undefined}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {!game ? (
          /* Game Setup View */
          <SetupGame
            onStartGame={handleStartGame}
            recentWinners={recentWinners}
            onOpenSavedGamesModal={() => setShowSavedGamesModal(true)}
            onResetAppToZero={() => setShowResetAppModal(true)}
          />
        ) : (
          /* Active Game View */
          <div className="space-y-8">
            {/* Top Grid: Main Gameplay Controls + Live Standings */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left Column (2 cols): Active Round Interactive Control Card */}
              <div className="lg:col-span-2 space-y-6">
                {currentRound && (
                  <ActiveRound
                    round={currentRound}
                    players={game.players}
                    rules={game.rules}
                    totalRounds={game.rounds.length}
                    onUpdateBids={handleUpdateBids}
                    onUpdateActuals={handleUpdateActuals}
                    onChangeTrump={handleChangeTrump}
                    onOpenVoiceModal={handleOpenVoiceModal}
                    onOpenAddPlayerModal={() => setShowAddPlayerModal(true)}
                    onOpenReorderPlayersModal={() => setShowReorderPlayersModal(true)}
                    onOpenEditRoundModal={() => {
                      setEditRoundIndex(game.currentRoundIndex);
                      setShowEditRoundModal(true);
                    }}
                  />
                )}
              </div>

              {/* Right Column (1 col): Live Standings Leaderboard */}
              <div className="space-y-6">
                <Leaderboard
                  stats={stats}
                  currentRound={currentRound || undefined}
                  onOpenAddPlayerModal={() => setShowAddPlayerModal(true)}
                  onOpenReorderPlayersModal={() => setShowReorderPlayersModal(true)}
                />

                {/* Quick Finish Match Button */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-white block">Resumen y Fin</span>
                    <span className="text-xs text-slate-400">Ver trofeos y clasificaciones</span>
                  </div>
                  <button
                    onClick={() => setShowSummaryModal(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Ver Podio</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Full-Width Section: Round-by-Round Score Matrix Table */}
            <div className="pt-2">
              <ScoreTable
                players={game.players}
                rounds={game.rounds}
                currentRoundIndex={game.currentRoundIndex}
                onEditRoundScore={handleEditRoundScore}
                onSelectRoundIndex={(rIdx) => {
                  setGame({ ...game, currentRoundIndex: rIdx });
                }}
                onOpenEditRoundModal={() => {
                  setEditRoundIndex(game.currentRoundIndex);
                  setShowEditRoundModal(true);
                }}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>Anotador y Analizador de La Pocha • Diseñado para partidas de 4 a 8 jugadores</p>
      </footer>

      {/* Modals */}
      {game && currentRound && (
        <VoiceDictationModal
          isOpen={showVoiceModal}
          mode={voiceMode}
          players={game.players}
          cards={currentRound.cards}
          onClose={() => setShowVoiceModal(false)}
          onApplyScores={(scores) => {
            if (voiceMode === 'bids') {
              handleUpdateBids(scores);
            } else {
              handleUpdateActuals(scores);
            }
          }}
        />
      )}

      {game && (
        <StatisticsModal
          isOpen={showStatsModal}
          players={game.players}
          rounds={game.rounds}
          stats={stats}
          onClose={() => setShowStatsModal(false)}
        />
      )}

      <RulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        rules={game?.rules}
      />

      <DownloadAppModal isOpen={showDownloadModal} onClose={() => setShowDownloadModal(false)} />

      {game && (
        <AddPlayerModal
          isOpen={showAddPlayerModal}
          onClose={() => setShowAddPlayerModal(false)}
          existingPlayers={game.players}
          stats={stats}
          currentRoundIndex={game.currentRoundIndex}
          currentRound={game.rounds[game.currentRoundIndex]}
          deckCards={game.rules?.deckCards || 40}
          onAddPlayer={handleAddPlayer}
        />
      )}

      {game && (
        <ReorderPlayersModal
          isOpen={showReorderPlayersModal}
          onClose={() => setShowReorderPlayersModal(false)}
          players={game.players}
          currentRound={game.rounds[game.currentRoundIndex]}
          onSaveOrder={handleReorderPlayers}
        />
      )}

      {game && (
        <EditRoundModal
          isOpen={showEditRoundModal}
          onClose={() => setShowEditRoundModal(false)}
          rounds={game.rounds}
          players={game.players}
          rules={game.rules}
          initialRoundIndex={editRoundIndex}
          onSaveRoundScore={handleSaveBulkRoundScore}
          onDeleteRound={handleDeleteRound}
        />
      )}

      {game && (
        <GameSummaryModal
          isOpen={showSummaryModal}
          stats={stats}
          game={game}
          rounds={game.rounds}
          players={game.players}
          onClose={() => setShowSummaryModal(false)}
          onOpenStats={() => {
            setShowSummaryModal(false);
            setShowStatsModal(true);
          }}
          onNewGame={() => {
            setGame(null);
            setShowSummaryModal(false);
          }}
        />
      )}

      {/* Saved Games and Historical Winners Modal */}
      <SavedGamesModal
        isOpen={showSavedGamesModal}
        onClose={() => {
          setShowSavedGamesModal(false);
          setRecentWinners(loadRecentWinners());
        }}
        onGameDeleted={() => {
          setRecentWinners(loadRecentWinners());
        }}
        onLoadGame={(loadedGame) => {
          setGame(loadedGame);
          setShowSavedGamesModal(false);
          setRecentWinners(loadRecentWinners());
        }}
      />

      {/* Confirmation Modal for New Game */}
      {showNewGameConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center space-x-3 text-amber-400">
              <RotateCcw className="w-7 h-7 shrink-0 text-amber-500" />
              <h3 className="text-xl font-black text-white">¿Iniciar Nueva Partida?</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              ¿Deseas salir de la partida en curso? La pantalla volverá al configurador donde podrás ajustar el número de jugadores, nombres y reglas.
            </p>
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setShowNewGameConfirmModal(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  clearGameSnapshots();
                  setGame(null);
                  setShowNewGameConfirmModal(false);
                }}
                className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black rounded-xl transition text-sm shadow-lg shadow-yellow-500/20 cursor-pointer"
              >
                Sí, Nueva Partida
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reset Round */}
      {showResetRoundConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-7 h-7 shrink-0 text-rose-500" />
              <h3 className="text-xl font-black text-white">Reiniciar Ronda Actual</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              ¿Deseas reiniciar esta mano? Se borrarán las bazas pedidas y hechas únicamente de la mano actual.
            </p>
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setShowResetRoundConfirmModal(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={executeResetCurrentRound}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl transition text-sm shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Sí, Reiniciar Mano
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Full Reset from Zero */}
      {showResetAppModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-7 h-7 shrink-0 text-rose-500" />
              <h3 className="text-xl font-black text-white">¿Reiniciar de Cero?</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Esta acción borrará cualquier partida bloqueada o en curso, copias de seguridad de rondas y cachés temporales. La aplicación volverá a su estado limpio inicial como el primer día.
            </p>
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setShowResetAppModal(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  resetAppToZero();
                  setGame(null);
                  setRecentWinners([]);
                  setShowResetAppModal(false);
                  window.location.reload();
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl transition text-sm shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Sí, Reiniciar Todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
