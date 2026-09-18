/**
 * Safe Boot & Storage Integrity Utility for La Pocha
 * Validates, repairs, and sanitizes all localStorage data prior to React rendering.
 * Prevents offline freeze, white screens, and corrupted JSON crashes.
 * Includes a redundant snapshot backup layer saved every time a round is completed.
 */

import { Game, Player, Round, RoundScore, GameRules } from '../types';
import { getDefaultDeckForPlayers } from './pocha';

export const STORAGE_KEYS = {
  GAME: 'pocha_game_v2',
  GAME_SNAPSHOT: 'pocha_game_snapshot_v1',
  ROUND_SNAPSHOTS_HISTORY: 'pocha_round_snapshots_v1',
  RECENT_WINNERS: 'pocha_recent_winners_v1',
  SAVED_GAMES: 'pocha_saved_games_v1',
} as const;

export interface GameSnapshot {
  id: string;
  timestamp: string;
  gameId: string;
  gameName: string;
  completedRoundIndex: number;
  completedRoundNumber: number;
  totalCompletedRounds: number;
  totalRounds: number;
  playersCount: number;
  gameState: Game;
}

export interface BootValidationReport {
  isStorageAvailable: boolean;
  gameDataRepaired: boolean;
  snapshotRecovered: boolean;
  historyRepaired: boolean;
  savedGamesRepaired: boolean;
  errors: string[];
}

/**
 * In-memory fallback if localStorage is disabled or throws SecurityError
 */
class MemoryStorageShim implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

/**
 * Checks if browser storage is accessible and working
 */
export function isStorageAccessible(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const testKey = '__pocha_test_storage__';
    window.localStorage.setItem(testKey, '1');
    const val = window.localStorage.getItem(testKey);
    window.localStorage.removeItem(testKey);
    return val === '1';
  } catch {
    return false;
  }
}

/**
 * Returns safe storage instance (window.localStorage or MemoryStorageShim)
 */
export function getSafeStorage(): Storage {
  if (typeof window !== 'undefined' && isStorageAccessible()) {
    return window.localStorage;
  }
  return new MemoryStorageShim();
}

/**
 * Default game rules fallback
 */
export function getDefaultRules(playerCount?: number): GameRules {
  return {
    forbiddenDealerBid: true,
    doubleOros: true,
    allowSinTriunfo: true,
    pochaDoubleDouble: true,
    enableSubastado: true,
    singleMaxCardsRound: false,
    randomTrumpAfterSubastado: true,
    visibleTrumpAfterSubastado: false,
    roundProgressionMode: 'standard',
    deckCards: playerCount ? getDefaultDeckForPlayers(playerCount) : 48,
  };
}

/**
 * Validates and repairs a single player object
 */
export function sanitizePlayer(raw: any, index: number): Player {
  const fallbackColors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
  const fallbackAvatars = ['👑', '⭐', '🔥', '💎', '🚀', '🎯', '🍀', '🏆'];

  return {
    id: typeof raw?.id === 'string' && raw.id.trim() ? raw.id.trim() : `player_${index + 1}`,
    name: typeof raw?.name === 'string' && raw.name.trim() ? raw.name.trim() : `Jugador ${index + 1}`,
    avatar: typeof raw?.avatar === 'string' && raw.avatar.trim() ? raw.avatar.trim() : fallbackAvatars[index % fallbackAvatars.length],
    color: typeof raw?.color === 'string' && raw.color.trim() ? raw.color.trim() : fallbackColors[index % fallbackColors.length],
    startingPoints: typeof raw?.startingPoints === 'number' && !isNaN(raw.startingPoints) ? raw.startingPoints : 0,
    joinedAtRoundIndex: typeof raw?.joinedAtRoundIndex === 'number' && !isNaN(raw.joinedAtRoundIndex) ? raw.joinedAtRoundIndex : undefined,
  };
}

/**
 * Validates and repairs a single round object
 */
export function sanitizeRound(raw: any, index: number): Round {
  const rawScores = raw?.scores && typeof raw.scores === 'object' ? raw.scores : {};
  const sanitizedScores: Record<string, RoundScore> = {};

  for (const [playerId, scoreObj] of Object.entries(rawScores)) {
    if (typeof playerId === 'string' && scoreObj && typeof scoreObj === 'object') {
      const s = scoreObj as any;
      const bid = typeof s.bid === 'number' && !isNaN(s.bid) ? s.bid : null;
      const actual = typeof s.actual === 'number' && !isNaN(s.actual) ? s.actual : null;
      const hit = bid !== null && actual !== null ? bid === actual : null;
      const difference = bid !== null && actual !== null ? Math.abs(bid - actual) : 0;

      sanitizedScores[playerId] = {
        playerId,
        bid,
        actual,
        points: typeof s.points === 'number' && !isNaN(s.points) ? s.points : 0,
        accumulatedPoints: typeof s.accumulatedPoints === 'number' && !isNaN(s.accumulatedPoints) ? s.accumulatedPoints : 0,
        hit,
        difference,
        isPocha: Boolean(s.isPocha),
      };
    }
  }

  const validPhases: Round['phase'][] = ['bidding', 'playing', 'completed'];
  const phase: Round['phase'] = validPhases.includes(raw?.phase) ? raw.phase : 'bidding';

  return {
    id: typeof raw?.id === 'string' && raw.id.trim() ? raw.id.trim() : `round_${index + 1}`,
    roundNumber: typeof raw?.roundNumber === 'number' && !isNaN(raw.roundNumber) && raw.roundNumber > 0 ? raw.roundNumber : index + 1,
    cards: typeof raw?.cards === 'number' && !isNaN(raw.cards) && raw.cards > 0 ? raw.cards : 1,
    dealerIndex: typeof raw?.dealerIndex === 'number' && !isNaN(raw.dealerIndex) ? Math.max(0, raw.dealerIndex) : 0,
    trump: typeof raw?.trump === 'string' ? raw.trump : 'oros',
    phase,
    scores: sanitizedScores,
    phaseName: typeof raw?.phaseName === 'string' && raw.phaseName.trim() ? raw.phaseName.trim() : `Ronda ${index + 1}`,
    isSubastado: Boolean(raw?.isSubastado),
    isRandomTrumpMax: Boolean(raw?.isRandomTrumpMax),
    isVisibleTrumpMax: Boolean(raw?.isVisibleTrumpMax),
    subastadoWinnerId: typeof raw?.subastadoWinnerId === 'string' ? raw.subastadoWinnerId : undefined,
  };
}

/**
 * Validates and repairs the Active Game object
 */
export function sanitizeGame(raw: any): Game | null {
  if (!raw || typeof raw !== 'object') return null;

  // Must have players array
  if (!Array.isArray(raw.players) || raw.players.length === 0) return null;
  // Must have rounds array
  if (!Array.isArray(raw.rounds) || raw.rounds.length === 0) return null;

  const players: Player[] = raw.players.map((p: any, idx: number) => sanitizePlayer(p, idx));
  const rounds: Round[] = raw.rounds.map((r: any, idx: number) => sanitizeRound(r, idx));

  if (players.length === 0 || rounds.length === 0) return null;

  const maxRoundIdx = rounds.length - 1;
  const currentRoundIndex = typeof raw.currentRoundIndex === 'number' && !isNaN(raw.currentRoundIndex)
    ? Math.max(0, Math.min(maxRoundIdx, Math.floor(raw.currentRoundIndex)))
    : 0;

  const rawRules = raw.rules && typeof raw.rules === 'object' ? raw.rules : {};
  const rules: GameRules = {
    ...getDefaultRules(players.length),
    ...rawRules,
    deckCards: rawRules.deckCards || getDefaultDeckForPlayers(players.length),
  };

  const isFinished = typeof raw.isFinished === 'boolean'
    ? raw.isFinished
    : rounds.every((r) => r.phase === 'completed');

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `game_${Date.now()}`,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : `Partida de ${players.length} jugadores`,
    createdAt: typeof raw.createdAt === 'string' && raw.createdAt.trim() ? raw.createdAt.trim() : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' && raw.updatedAt.trim() ? raw.updatedAt.trim() : new Date().toISOString(),
    players,
    rounds,
    currentRoundIndex,
    rules,
    isFinished,
  };
}

/**
 * Saves a redundant snapshot backup of the complete game state whenever a round finishes.
 */
export function saveGameRoundSnapshot(game: Game, roundIndex?: number): GameSnapshot | null {
  try {
    const sanitized = sanitizeGame(game);
    if (!sanitized) return null;

    const completedRounds = sanitized.rounds.filter((r) => r.phase === 'completed');
    const targetRoundIdx = typeof roundIndex === 'number'
      ? roundIndex
      : Math.max(0, completedRounds.length - 1);
    const targetRound = sanitized.rounds[targetRoundIdx] || sanitized.rounds[0];

    const snapshot: GameSnapshot = {
      id: `snapshot_${sanitized.id}_round_${targetRound.roundNumber}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      gameId: sanitized.id,
      gameName: sanitized.name,
      completedRoundIndex: targetRoundIdx,
      completedRoundNumber: targetRound.roundNumber,
      totalCompletedRounds: completedRounds.length,
      totalRounds: sanitized.rounds.length,
      playersCount: sanitized.players.length,
      gameState: sanitized,
    };

    const storage = getSafeStorage();

    // 1. Save latest primary snapshot
    storage.setItem(STORAGE_KEYS.GAME_SNAPSHOT, JSON.stringify(snapshot));

    // 2. Append to rolling round snapshots history (capped at 20 snapshots)
    try {
      const rawHistory = storage.getItem(STORAGE_KEYS.ROUND_SNAPSHOTS_HISTORY);
      let history: GameSnapshot[] = [];
      if (rawHistory) {
        const parsed = JSON.parse(rawHistory);
        if (Array.isArray(parsed)) {
          history = parsed.filter((s: any) => s && s.gameId === sanitized.id && s.gameState);
        }
      }
      // Replace existing snapshot for same round or append
      const existingIdx = history.findIndex((s) => s.completedRoundNumber === targetRound.roundNumber);
      if (existingIdx >= 0) {
        history[existingIdx] = snapshot;
      } else {
        history.push(snapshot);
      }

      // Sort by completed round number ascending and keep latest 20
      history.sort((a, b) => a.completedRoundNumber - b.completedRoundNumber);
      const cappedHistory = history.slice(-20);
      storage.setItem(STORAGE_KEYS.ROUND_SNAPSHOTS_HISTORY, JSON.stringify(cappedHistory));
    } catch (histErr) {
      console.warn('Error updating round snapshots history:', histErr);
    }

    return snapshot;
  } catch (err) {
    console.error('Error saving game round snapshot:', err);
    return null;
  }
}

/**
 * Retrieves the latest snapshot backup from storage
 */
export function getLatestGameSnapshot(): GameSnapshot | null {
  try {
    const storage = getSafeStorage();
    const raw = storage.getItem(STORAGE_KEYS.GAME_SNAPSHOT);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.gameState) {
      const sanitizedGame = sanitizeGame(parsed.gameState);
      if (sanitizedGame) {
        return {
          ...parsed,
          gameState: sanitizedGame,
        };
      }
    }
  } catch (err) {
    console.warn('Error reading latest snapshot:', err);
  }
  return null;
}

/**
 * Retrieves all round snapshot checkpoints for the current or specified game
 */
export function getRoundSnapshots(gameId?: string): GameSnapshot[] {
  try {
    const storage = getSafeStorage();
    const raw = storage.getItem(STORAGE_KEYS.ROUND_SNAPSHOTS_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((s: any) => {
          if (!s || !s.gameState) return null;
          const sanitized = sanitizeGame(s.gameState);
          return sanitized ? { ...s, gameState: sanitized } : null;
        })
        .filter((s): s is GameSnapshot => s !== null && (!gameId || s.gameId === gameId));
    }
  } catch (err) {
    console.warn('Error reading round snapshots history:', err);
  }
  return [];
}

/**
 * Clears snapshot backups when starting a fresh game or clearing data
 */
export function clearGameSnapshots(): void {
  try {
    const storage = getSafeStorage();
    storage.removeItem(STORAGE_KEYS.GAME_SNAPSHOT);
    storage.removeItem(STORAGE_KEYS.ROUND_SNAPSHOTS_HISTORY);
  } catch (err) {
    console.warn('Error clearing snapshots:', err);
  }
}

/**
 * Resets the entire application from zero:
 * Purges active game, snapshots, cached service workers, and local storage.
 */
export function resetAppToZero(): void {
  try {
    const storage = getSafeStorage();
    storage.removeItem(STORAGE_KEYS.GAME);
    storage.removeItem(STORAGE_KEYS.GAME_SNAPSHOT);
    storage.removeItem(STORAGE_KEYS.ROUND_SNAPSHOTS_HISTORY);
    // Clear all pocha storage items
    Object.values(STORAGE_KEYS).forEach((key) => {
      try { storage.removeItem(key); } catch (_) {}
    });
    try {
      localStorage.clear();
    } catch (_) {}

    // Clear caches if supported
    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((k) => caches.delete(k));
      });
    }

    // Unregister service workers if any
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
    }
  } catch (err) {
    console.error('Error in resetAppToZero:', err);
  }
}

/**
 * Performs full storage integrity audit and repairs corrupted keys.
 * This runs synchronously before the main React tree mounts.
 */
export function performSafeBoot(): BootValidationReport {
  const report: BootValidationReport = {
    isStorageAvailable: isStorageAccessible(),
    gameDataRepaired: false,
    snapshotRecovered: false,
    historyRepaired: false,
    savedGamesRepaired: false,
    errors: [],
  };

  if (!report.isStorageAvailable) {
    report.errors.push('LocalStorage is not directly accessible (using fallback memory storage).');
    return report;
  }

  const storage = window.localStorage;

  // 1. Validate Active Game State & Cross-Check with Snapshot Backup
  try {
    const rawGameStr = storage.getItem(STORAGE_KEYS.GAME);
    let activeGame: Game | null = null;

    if (rawGameStr) {
      try {
        const parsed = JSON.parse(rawGameStr);
        activeGame = sanitizeGame(parsed);
        if (!activeGame) {
          report.gameDataRepaired = true;
          report.errors.push('Corrupted active game data detected.');
          storage.removeItem(STORAGE_KEYS.GAME);
        } else if (JSON.stringify(activeGame) !== rawGameStr) {
          storage.setItem(STORAGE_KEYS.GAME, JSON.stringify(activeGame));
          report.gameDataRepaired = true;
        }
      } catch (parseErr) {
        report.gameDataRepaired = true;
        report.errors.push('Malformed JSON in active game storage.');
        storage.removeItem(STORAGE_KEYS.GAME);
      }
    }

    // Check if we have an active game and a snapshot backup to cross-check
    const latestSnapshot = getLatestGameSnapshot();

    if (activeGame && latestSnapshot?.gameState && activeGame.id === latestSnapshot.gameState.id) {
      // If active game lost completed rounds compared to snapshot (e.g. browser crashed mid-write)
      const activeCompleted = activeGame.rounds.filter((r) => r.phase === 'completed').length;
      const snapshotCompleted = latestSnapshot.gameState.rounds.filter((r) => r.phase === 'completed').length;

      if (snapshotCompleted > activeCompleted) {
        storage.setItem(STORAGE_KEYS.GAME, JSON.stringify(latestSnapshot.gameState));
        report.snapshotRecovered = true;
        report.errors.push('Se restauró una versión más reciente y completa desde el respaldo snapshot.');
      }
    }
  } catch (err: any) {
    report.errors.push(`Error accessing game storage: ${err?.message || err}`);
  }

  // 2. Validate Recent Winners History
  try {
    const rawWinnersStr = storage.getItem(STORAGE_KEYS.RECENT_WINNERS);
    if (rawWinnersStr) {
      try {
        const parsed = JSON.parse(rawWinnersStr);
        if (!Array.isArray(parsed)) {
          storage.removeItem(STORAGE_KEYS.RECENT_WINNERS);
          report.historyRepaired = true;
        } else {
          const sanitizedWinners = parsed
            .filter((item: any) => item && typeof item === 'object' && typeof item.playerName === 'string')
            .slice(0, 10);
          if (sanitizedWinners.length !== parsed.length) {
            storage.setItem(STORAGE_KEYS.RECENT_WINNERS, JSON.stringify(sanitizedWinners));
            report.historyRepaired = true;
          }
        }
      } catch {
        storage.removeItem(STORAGE_KEYS.RECENT_WINNERS);
        report.historyRepaired = true;
      }
    }
  } catch (err: any) {
    report.errors.push(`Error auditing winners history: ${err?.message || err}`);
  }

  // 3. Validate Saved Games Archive
  try {
    const rawSavedStr = storage.getItem(STORAGE_KEYS.SAVED_GAMES);
    if (rawSavedStr) {
      try {
        const parsed = JSON.parse(rawSavedStr);
        if (!Array.isArray(parsed)) {
          storage.removeItem(STORAGE_KEYS.SAVED_GAMES);
          report.savedGamesRepaired = true;
        } else {
          const sanitizedSaved = parsed.filter(
            (item: any) => item && typeof item === 'object' && item.id && Array.isArray(item.rankings)
          );
          if (sanitizedSaved.length !== parsed.length) {
            storage.setItem(STORAGE_KEYS.SAVED_GAMES, JSON.stringify(sanitizedSaved));
            report.savedGamesRepaired = true;
          }
        }
      } catch {
        storage.removeItem(STORAGE_KEYS.SAVED_GAMES);
        report.savedGamesRepaired = true;
      }
    }
  } catch (err: any) {
    report.errors.push(`Error auditing saved games: ${err?.message || err}`);
  }

  return report;
}
