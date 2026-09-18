import { Game, PlayerStats } from '../types';
import { getSafeStorage, STORAGE_KEYS, sanitizeGame } from './safeBoot';
import { calculatePlayerStats } from './pocha';

export interface RecentWinner {
  id: string;
  date: string;
  playerName: string;
  playerAvatar: string;
  playerColor: string;
  points: number;
  totalPlayers: number;
  hitPercentage: number;
  gameName?: string;
}

export interface SavedGameRanking {
  rank: number;
  name: string;
  avatar: string;
  color: string;
  points: number;
  hits: number;
  misses: number;
  hitPercentage: number;
}

export interface SavedGameRecord {
  id: string;
  date: string;
  name: string;
  numPlayers: number;
  totalRounds: number;
  winner: RecentWinner;
  rankings: SavedGameRanking[];
  gameData?: Game;
}

export type SavedGame = SavedGameRecord;
export const loadRecentWinners = getRecentWinners;
export const loadSavedGames = getSavedGames;

/**
 * Retrieves the last 5 game winners from safe storage
 */
export function getRecentWinners(): RecentWinner[] {
  try {
    const storage = getSafeStorage();
    const data = storage.getItem(STORAGE_KEYS.RECENT_WINNERS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((w: any) => w && typeof w.playerName === 'string')
        .slice(0, 5);
    }
  } catch (e) {
    console.error('Error loading recent winners:', e);
  }
  return [];
}

/**
 * Retrieves all saved games from safe storage
 */
export function getSavedGames(): SavedGameRecord[] {
  try {
    const storage = getSafeStorage();
    const data = storage.getItem(STORAGE_KEYS.SAVED_GAMES);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed.filter((g: any) => g && g.id && Array.isArray(g.rankings));
    }
  } catch (e) {
    console.error('Error loading saved games:', e);
  }
  return [];
}

/**
 * Saves a completed game into history and records the winner into the recent 5 winners list
 */
export function saveCompletedGame(game: Game, stats: PlayerStats[]): void {
  if (!stats || stats.length === 0) return;

  try {
    const storage = getSafeStorage();
    const winnerStat = stats[0];
    const winner: RecentWinner = {
      id: `winner_${Date.now()}`,
      date: new Date().toISOString(),
      playerName: winnerStat.player.name,
      playerAvatar: winnerStat.player.avatar,
      playerColor: winnerStat.player.color,
      points: winnerStat.totalPoints,
      totalPlayers: game.players.length,
      hitPercentage: winnerStat.hitPercentage,
      gameName: game.name || `Partida de ${game.players.length} jugadores`,
    };

    // 1. Update Recent 5 Winners
    const currentWinners = getRecentWinners();
    // Avoid exact duplicate at the top
    const filteredWinners = currentWinners.filter(
      (w) => !(w.playerName === winner.playerName && Math.abs(new Date(w.date).getTime() - Date.now()) < 5000)
    );
    const updatedWinners = [winner, ...filteredWinners].slice(0, 5);
    storage.setItem(STORAGE_KEYS.RECENT_WINNERS, JSON.stringify(updatedWinners));

    // 2. Update Saved Games History
    const rankings: SavedGameRanking[] = stats.map((st) => ({
      rank: st.rank,
      name: st.player.name,
      avatar: st.player.avatar,
      color: st.player.color,
      points: st.totalPoints,
      hits: st.totalHits,
      misses: st.totalMisses,
      hitPercentage: st.hitPercentage,
    }));

    const newRecord: SavedGameRecord = {
      id: game.id || `game_${Date.now()}`,
      date: new Date().toISOString(),
      name: game.name || `Partida de ${game.players.length} jugadores`,
      numPlayers: game.players.length,
      totalRounds: game.rounds.length,
      winner,
      rankings,
      gameData: game,
    };

    const currentSaved = getSavedGames();
    const existingIndex = currentSaved.findIndex((g) => g.id === newRecord.id);
    let updatedSaved: SavedGameRecord[];
    if (existingIndex >= 0) {
      updatedSaved = [...currentSaved];
      updatedSaved[existingIndex] = newRecord;
    } else {
      updatedSaved = [newRecord, ...currentSaved];
    }

    storage.setItem(STORAGE_KEYS.SAVED_GAMES, JSON.stringify(updatedSaved.slice(0, 50)));
  } catch (e) {
    console.error('Error saving completed game:', e);
  }
}

/**
 * Deletes a single game from saved games history
 */
export function deleteSavedGame(gameId: string): SavedGameRecord[] {
  try {
    const storage = getSafeStorage();
    const current = getSavedGames();
    const updated = current.filter((g) => g.id !== gameId);
    storage.setItem(STORAGE_KEYS.SAVED_GAMES, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error deleting game:', e);
    return [];
  }
}

/**
 * Clears the entire saved games history
 */
export function clearAllSavedGames(): void {
  try {
    const storage = getSafeStorage();
    storage.removeItem(STORAGE_KEYS.SAVED_GAMES);
  } catch (e) {
    console.error('Error clearing saved games:', e);
  }
}

/**
 * Clears the recent winners list
 */
export function clearRecentWinners(): void {
  try {
    const storage = getSafeStorage();
    storage.removeItem(STORAGE_KEYS.RECENT_WINNERS);
  } catch (e) {
    console.error('Error clearing winners:', e);
  }
}

/**
 * Triggers a browser download of a JSON object as a formatted .json file
 */
export function downloadJsonFile(filename: string, data: any): void {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.json') ? filename : `${filename}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    console.error('Error downloading JSON file:', e);
  }
}

/**
 * Exports a single saved game record with its full game data as a JSON file
 */
export function exportSavedGameAsJSON(gameRecord: SavedGameRecord): void {
  const safeName = (gameRecord.name || 'pocha')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/gi, '_')
    .replace(/_+/g, '_');
  const datePart = (gameRecord.date ? new Date(gameRecord.date).toISOString().split('T')[0] : '') || new Date().toISOString().split('T')[0];
  const filename = `pocha_partida_${safeName}_${datePart}.json`;

  const payload = {
    type: 'pocha_single_game',
    app: 'La Podrida',
    version: 1,
    exportedAt: new Date().toISOString(),
    record: gameRecord,
  };

  downloadJsonFile(filename, payload);
}

/**
 * Exports the entire saved games history into a consolidated JSON backup file
 */
export function exportAllSavedGamesAsJSON(games?: SavedGameRecord[]): void {
  const list = games || getSavedGames();
  const datePart = new Date().toISOString().split('T')[0];
  const filename = `pocha_historial_completo_${datePart}.json`;

  const payload = {
    type: 'pocha_history_export',
    app: 'La Podrida',
    version: 1,
    exportedAt: new Date().toISOString(),
    totalGames: list.length,
    records: list,
  };

  downloadJsonFile(filename, payload);
}

/**
 * Exports an in-progress or finished active Game object as a JSON file
 */
export function exportActiveGameAsJSON(game: Game): void {
  const safeName = (game.name || `partida_${game.players.length}_jugadores`)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/gi, '_')
    .replace(/_+/g, '_');
  const datePart = new Date().toISOString().split('T')[0];
  const filename = `pocha_partida_${safeName}_${datePart}.json`;

  const stats = calculatePlayerStats(game.players, game.rounds);
  const winnerStat = stats[0];
  const winner: RecentWinner | undefined = winnerStat
    ? {
        id: `winner_${Date.now()}`,
        date: new Date().toISOString(),
        playerName: winnerStat.player.name,
        playerAvatar: winnerStat.player.avatar,
        playerColor: winnerStat.player.color,
        points: winnerStat.totalPoints,
        totalPlayers: game.players.length,
        hitPercentage: winnerStat.hitPercentage,
        gameName: game.name,
      }
    : undefined;

  const rankings: SavedGameRanking[] = stats.map((st) => ({
    rank: st.rank,
    name: st.player.name,
    avatar: st.player.avatar,
    color: st.player.color,
    points: st.totalPoints,
    hits: st.totalHits,
    misses: st.totalMisses,
    hitPercentage: st.hitPercentage,
  }));

  const record: SavedGameRecord = {
    id: game.id,
    date: game.createdAt || new Date().toISOString(),
    name: game.name || `Partida de ${game.players.length} jugadores`,
    numPlayers: game.players.length,
    totalRounds: game.rounds.length,
    winner: winner!,
    rankings,
    gameData: game,
  };

  const payload = {
    type: 'pocha_single_game',
    app: 'La Podrida',
    version: 1,
    exportedAt: new Date().toISOString(),
    record,
  };

  downloadJsonFile(filename, payload);
}

/**
 * Parses, validates, sanitizes, and imports games from a JSON file string.
 * Supports:
 * - Full history exports ({ type: 'pocha_history_export', records: [...] })
 * - Single game exports ({ type: 'pocha_single_game', record: {...} })
 * - Direct SavedGameRecord array
 * - Single SavedGameRecord object
 * - Active Game object ({ id, players, rounds, rules, ... })
 */
export function parseAndImportGamesJSON(jsonContent: string): {
  success: boolean;
  importedCount: number;
  importedGames: SavedGameRecord[];
  message: string;
} {
  try {
    if (!jsonContent || !jsonContent.trim()) {
      return { success: false, importedCount: 0, importedGames: [], message: 'El archivo JSON está vacío.' };
    }

    const parsed = JSON.parse(jsonContent.trim());
    let rawRecords: any[] = [];

    if (parsed && typeof parsed === 'object') {
      if (parsed.type === 'pocha_history_export' && Array.isArray(parsed.records)) {
        rawRecords = parsed.records;
      } else if (parsed.type === 'pocha_single_game' && parsed.record) {
        rawRecords = [parsed.record];
      } else if (Array.isArray(parsed)) {
        rawRecords = parsed;
      } else if (parsed.rankings || parsed.gameData || (parsed.players && parsed.rounds)) {
        rawRecords = [parsed];
      } else {
        return {
          success: false,
          importedCount: 0,
          importedGames: [],
          message: 'Formato no reconocido. Asegúrate de importar un archivo JSON válido de La Podrida / La Pocha.',
        };
      }
    } else {
      return { success: false, importedCount: 0, importedGames: [], message: 'El contenido no es un objeto o lista JSON válido.' };
    }

    const processedGames: SavedGameRecord[] = [];

    for (let i = 0; i < rawRecords.length; i++) {
      const raw = rawRecords[i];
      if (!raw || typeof raw !== 'object') continue;

      let gameData: Game | undefined = undefined;
      if (raw.gameData && typeof raw.gameData === 'object') {
        gameData = sanitizeGame(raw.gameData);
      } else if (Array.isArray(raw.players) && Array.isArray(raw.rounds)) {
        gameData = sanitizeGame(raw);
      }

      const numPlayers = typeof raw.numPlayers === 'number'
        ? raw.numPlayers
        : gameData
        ? gameData.players.length
        : 4;

      const totalRounds = typeof raw.totalRounds === 'number'
        ? raw.totalRounds
        : gameData
        ? gameData.rounds.length
        : 0;

      let rankings: SavedGameRanking[] = [];
      if (Array.isArray(raw.rankings) && raw.rankings.length > 0) {
        rankings = raw.rankings.map((r: any, idx: number) => ({
          rank: typeof r?.rank === 'number' ? r.rank : idx + 1,
          name: typeof r?.name === 'string' ? r.name : `Jugador ${idx + 1}`,
          avatar: typeof r?.avatar === 'string' ? r.avatar : '👑',
          color: typeof r?.color === 'string' ? r.color : '#3B82F6',
          points: typeof r?.points === 'number' ? r.points : 0,
          hits: typeof r?.hits === 'number' ? r.hits : 0,
          misses: typeof r?.misses === 'number' ? r.misses : 0,
          hitPercentage: typeof r?.hitPercentage === 'number' ? r.hitPercentage : 0,
        }));
      } else if (gameData) {
        const stats = calculatePlayerStats(gameData.players, gameData.rounds);
        rankings = stats.map((st) => ({
          rank: st.rank,
          name: st.player.name,
          avatar: st.player.avatar,
          color: st.player.color,
          points: st.totalPoints,
          hits: st.totalHits,
          misses: st.totalMisses,
          hitPercentage: st.hitPercentage,
        }));
      }

      let winner: RecentWinner | undefined = undefined;
      if (raw.winner && typeof raw.winner === 'object' && raw.winner.playerName) {
        winner = {
          id: raw.winner.id || `winner_${Date.now()}_${i}`,
          date: raw.winner.date || raw.date || new Date().toISOString(),
          playerName: raw.winner.playerName,
          playerAvatar: raw.winner.playerAvatar || '👑',
          playerColor: raw.winner.playerColor || '#F59E0B',
          points: typeof raw.winner.points === 'number' ? raw.winner.points : 0,
          totalPlayers: numPlayers,
          hitPercentage: typeof raw.winner.hitPercentage === 'number' ? raw.winner.hitPercentage : 0,
          gameName: raw.name || raw.winner.gameName,
        };
      } else if (rankings.length > 0) {
        const top = rankings[0];
        winner = {
          id: `winner_${Date.now()}_${i}`,
          date: raw.date || new Date().toISOString(),
          playerName: top.name,
          playerAvatar: top.avatar,
          playerColor: top.color,
          points: top.points,
          totalPlayers: numPlayers,
          hitPercentage: top.hitPercentage,
          gameName: raw.name,
        };
      }

      if (rankings.length === 0 && !gameData) {
        continue;
      }

      const record: SavedGameRecord = {
        id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `game_imported_${Date.now()}_${i}`,
        date: typeof raw.date === 'string' && raw.date.trim() ? raw.date.trim() : new Date().toISOString(),
        name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : (gameData?.name || `Partida importada de ${numPlayers} jugadores`),
        numPlayers,
        totalRounds,
        winner: winner!,
        rankings,
        gameData,
      };

      processedGames.push(record);
    }

    if (processedGames.length === 0) {
      return {
        success: false,
        importedCount: 0,
        importedGames: [],
        message: 'No se encontraron registros de partidas válidas en el archivo seleccionado.',
      };
    }

    // Persist into safe storage, merging with existing records
    const storage = getSafeStorage();
    const existing = getSavedGames();
    const existingMap = new Map<string, SavedGameRecord>();
    existing.forEach((g) => existingMap.set(g.id, g));

    processedGames.forEach((g) => {
      existingMap.set(g.id, g);
    });

    const updatedSaved = Array.from(existingMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 100);

    storage.setItem(STORAGE_KEYS.SAVED_GAMES, JSON.stringify(updatedSaved));

    // Update winners list
    const currentWinners = getRecentWinners();
    const newWinnersToAdd = processedGames
      .map((g) => g.winner)
      .filter((w): w is RecentWinner => Boolean(w && w.playerName));
    
    const combinedWinners = [...newWinnersToAdd, ...currentWinners];
    const uniqueWinners: RecentWinner[] = [];
    const seen = new Set<string>();
    for (const w of combinedWinners) {
      const key = `${w.playerName}_${w.points}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueWinners.push(w);
      }
    }
    storage.setItem(STORAGE_KEYS.RECENT_WINNERS, JSON.stringify(uniqueWinners.slice(0, 5)));

    return {
      success: true,
      importedCount: processedGames.length,
      importedGames: processedGames,
      message: `Se ha${processedGames.length === 1 ? ' importado 1 partida' : `n importado ${processedGames.length} partidas`} correctamente al historial.`,
    };
  } catch (err: any) {
    console.error('Error importing games JSON:', err);
    return {
      success: false,
      importedCount: 0,
      importedGames: [],
      message: `Error al procesar el archivo JSON: ${err?.message || 'sintaxis JSON no válida'}.`,
    };
  }
}

