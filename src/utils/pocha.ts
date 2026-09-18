import { GameRules, Player, PlayerStats, Round, RoundScore, Suit, SuitInfo, BiddingAnalysis, RoundProgressionMode } from '../types';

export const SUITS: Record<Suit, SuitInfo> = {
  oros: {
    id: 'oros',
    name: 'Oros',
    symbol: '🪙',
    icon: 'coins',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/40',
    isDouble: true,
  },
  copas: {
    id: 'copas',
    name: 'Copas',
    symbol: '🍷',
    icon: 'goblet',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/40',
    isDouble: false,
  },
  espadas: {
    id: 'espadas',
    name: 'Espadas',
    symbol: '⚔️',
    icon: 'sword',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/40',
    isDouble: false,
  },
  bastos: {
    id: 'bastos',
    name: 'Bastos',
    symbol: '🪵',
    icon: 'club',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/40',
    isDouble: false,
  },
  sin_triunfo: {
    id: 'sin_triunfo',
    name: 'Sin Triunfo',
    symbol: '🚫',
    icon: 'ban',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/40',
    isDouble: false,
  },
};

export const PLAYER_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

export const PLAYER_AVATARS = [
  '👑', '🦁', '🐉', '🦅', '🐺', '🦊', '🐯', '🦄',
];

/**
 * Exact target rounds distribution specified by the official rules:
 * 3 jugadores -> 32 rondas (36 cartas baraja, 12 cartas máx)
 * 4 jugadores -> 36 rondas (48 cartas baraja, 12 cartas máx)
 * 5 jugadores -> 32 rondas
 * 6 jugadores -> 36 rondas
 * 7 jugadores -> 38 rondas
 * 8 jugadores -> 40 rondas
 */
export const TARGET_ROUNDS_FOR_PLAYERS: Record<number, number> = {
  3: 32,
  4: 36,
  5: 32,
  6: 36,
  7: 38,
  8: 40,
};

/**
 * Calculates default deck cards based on exact player count rules:
 * 3 players -> 36 cards (12 max cards, baraja española sin doses)
 * 4 players -> 48 cards (12 max cards)
 * 5 players -> 40 cards (8 max cards)
 * 6 players -> 48 cards (8 max cards)
 * 7 players -> 49 cards (7 max cards)
 * 8 players -> 48 cards (6 max cards)
 */
export function getDefaultDeckForPlayers(numPlayers: number): number {
  switch (numPlayers) {
    case 3: return 36;
    case 4: return 48;
    case 5: return 40;
    case 6: return 48;
    case 7: return 49;
    case 8: return 48;
    default: return 48;
  }
}

/**
 * Calculates max cards per player given total cards in deck
 */
export function getMaxCards(numPlayers: number, deckCards: number = 40): number {
  if (numPlayers <= 0) return 10;
  return Math.floor(deckCards / numPlayers);
}

/**
 * Calculates the exact card sequence array for a given progression mode and parameters
 */
export function getCardSequenceForProgression(
  mode: RoundProgressionMode,
  numPlayers: number,
  maxCards: number,
  options?: {
    constantCardsCount?: number;
    constantRoundsCount?: number;
    roundsPerLevel?: number;
    customCardSequence?: number[];
  }
): number[] {
  const safePlayers = Math.max(3, Math.min(8, isNaN(numPlayers) ? 5 : numPlayers));
  const safeMaxCards = Math.max(1, isNaN(maxCards) ? 8 : maxCards);
  const roundsPerLevel = Math.max(1, options?.roundsPerLevel || 1);

  let result: number[] = [];

  switch (mode) {
    case 'ascending': {
      // 1 a safeMaxCards
      const seq: number[] = [];
      for (let c = 1; c <= safeMaxCards; c++) {
        for (let r = 0; r < roundsPerLevel; r++) {
          seq.push(c);
        }
      }
      result = seq;
      break;
    }

    case 'descending': {
      // safeMaxCards a 1
      const seq: number[] = [];
      for (let c = safeMaxCards; c >= 1; c--) {
        for (let r = 0; r < roundsPerLevel; r++) {
          seq.push(c);
        }
      }
      result = seq;
      break;
    }

    case 'pyramid': {
      // 1 -> safeMaxCards -> 1
      const seq: number[] = [];
      for (let c = 1; c <= safeMaxCards; c++) {
        for (let r = 0; r < roundsPerLevel; r++) {
          seq.push(c);
        }
      }
      for (let c = safeMaxCards - 1; c >= 1; c--) {
        for (let r = 0; r < roundsPerLevel; r++) {
          seq.push(c);
        }
      }
      result = seq;
      break;
    }

    case 'constant': {
      const fixedCards = Math.max(1, Math.min(safeMaxCards, options?.constantCardsCount || Math.min(5, safeMaxCards)));
      const count = Math.max(1, Math.min(60, options?.constantRoundsCount || (safePlayers * 2)));
      result = Array(count).fill(fixedCards);
      break;
    }

    case 'custom': {
      if (options?.customCardSequence && options.customCardSequence.length > 0) {
        result = options.customCardSequence.map((c) => Math.max(1, Math.min(safeMaxCards, c)));
      } else {
        // Secuencia personalizada sugerida inicial si aún no se ha definido
        const peak = Math.min(5, safeMaxCards);
        const seq: number[] = [];
        for (let c = 1; c <= peak; c++) seq.push(c);
        for (let c = peak - 1; c >= 1; c--) seq.push(c);
        result = seq;
      }
      break;
    }

    case 'standard':
    default: {
      const seq: number[] = [];
      // Phase 1: safePlayers de 1 carta
      for (let i = 0; i < safePlayers; i++) seq.push(1);
      // Phase 2: 2 .. safeMaxCards - 1
      for (let c = 2; c < safeMaxCards; c++) seq.push(c);
      // Phase 3: Máximas
      const nonMaxCount = 2 * safePlayers + 2 * Math.max(0, safeMaxCards - 2);
      const targetTotal = TARGET_ROUNDS_FOR_PLAYERS[safePlayers] || (nonMaxCount + safePlayers * 2);
      const maxCount = Math.max(1, targetTotal - nonMaxCount);
      for (let i = 0; i < maxCount; i++) seq.push(safeMaxCards);
      // Phase 4: safeMaxCards - 1 .. 2
      for (let c = safeMaxCards - 1; c >= 2; c--) seq.push(c);
      // Phase 5: safePlayers de 1 carta
      for (let i = 0; i < safePlayers; i++) seq.push(1);
      result = seq;
      break;
    }
  }

  // Ensure non-empty fallback
  if (!result || result.length === 0) {
    return [1, 2, 3, 2, 1];
  }

  return result;
}

/**
 * Generates the full list of rounds according to Spanish Pocha rules
 * Produces exactly the target round counts:
 * 4 jugadores -> 32 rondas
 * 5 jugadores -> 32 rondas
 * 6 jugadores -> 36 rondas
 * 7 jugadores -> 38 rondas
 * 8 jugadores -> 40 rondas
 */
export function generateDefaultRounds(
  numPlayers: number,
  deckCards: number = 40,
  rules?: GameRules
): Round[] {
  const maxCards = getMaxCards(numPlayers, deckCards);
  const suitsList: Suit[] = ['oros', 'copas', 'espadas', 'bastos'];
  let suitIndex = 0;
  let dealerIndex = 0;
  let roundNumber = 1;

  const rounds: Round[] = [];

  const getNextSuit = (): Suit => {
    const s = suitsList[suitIndex % suitsList.length];
    suitIndex++;
    return s;
  };

  const getNextDealer = (): number => {
    const d = dealerIndex % numPlayers;
    dealerIndex++;
    return d;
  };

  // Manejo de Modos de Progresión Personalizados o No Estándar
  if (rules?.roundProgressionMode && rules.roundProgressionMode !== 'standard') {
    const sequence = getCardSequenceForProgression(
      rules.roundProgressionMode,
      numPlayers,
      maxCards,
      {
        constantCardsCount: rules.constantCardsCount,
        constantRoundsCount: rules.constantRoundsCount,
        roundsPerLevel: rules.roundsPerLevel,
        customCardSequence: rules.customCardSequence,
      }
    );

    const enableSubastado = rules.enableSubastado !== false;
    let maxCardsEncountered = 0;
    const peakIdx = sequence.indexOf(maxCards);

    sequence.forEach((c, idx) => {
      const isMaxCards = c === maxCards;
      let isSubastado = false;
      let trump: Suit = 'oros';
      let phaseName = `Ronda ${roundNumber} (${c} ${c === 1 ? 'carta' : 'cartas'})`;

      if (rules.roundProgressionMode === 'ascending') {
        phaseName = c === maxCards ? `Máximas (${c} cartas)` : `Ascenso (${c} ${c === 1 ? 'carta' : 'cartas'})`;
      } else if (rules.roundProgressionMode === 'descending') {
        phaseName = c === 1 ? `Última Mano (1 carta)` : `Descenso (${c} cartas)`;
      } else if (rules.roundProgressionMode === 'pyramid') {
        if (peakIdx !== -1 && idx < peakIdx) {
          phaseName = `Subida (${c} ${c === 1 ? 'carta' : 'cartas'})`;
        } else if (c === maxCards) {
          phaseName = `Cima (${c} cartas)`;
        } else {
          phaseName = `Bajada (${c} ${c === 1 ? 'carta' : 'cartas'})`;
        }
      } else if (rules.roundProgressionMode === 'constant') {
        phaseName = `Mano ${roundNumber} (${c} cartas fijas)`;
      } else if (rules.roundProgressionMode === 'custom') {
        phaseName = `Ronda ${roundNumber} (${c} ${c === 1 ? 'carta' : 'cartas'})`;
      }

      if (isMaxCards) {
        maxCardsEncountered++;
        if (enableSubastado && maxCardsEncountered <= numPlayers) {
          isSubastado = true;
          trump = 'oros';
          phaseName += ' - Subastado';
        } else {
          trump = getNextSuit();
        }
      } else {
        trump = getNextSuit();
      }

      rounds.push({
        id: `round_${roundNumber}`,
        roundNumber,
        cards: c,
        dealerIndex: getNextDealer(),
        trump,
        phase: 'bidding',
        scores: {},
        phaseName,
        isSubastado,
      });
      roundNumber++;
    });

    return rounds;
  }

  // Phase 1: Primera vuelta de 1 carta (1 mano por cada jugador = numPlayers rondas)
  for (let i = 0; i < numPlayers; i++) {
    rounds.push({
      id: `round_${roundNumber}`,
      roundNumber,
      cards: 1,
      dealerIndex: getNextDealer(),
      trump: getNextSuit(),
      phase: 'bidding',
      scores: {},
      phaseName: 'Primera Vuelta (1 carta)',
    });
    roundNumber++;
  }

  // Phase 2: Subida (2, 3, 4 ... hasta maxCards - 1 = maxCards - 2 rondas)
  for (let c = 2; c < maxCards; c++) {
    rounds.push({
      id: `round_${roundNumber}`,
      roundNumber,
      cards: c,
      dealerIndex: getNextDealer(),
      trump: getNextSuit(),
      phase: 'bidding',
      scores: {},
      phaseName: `Subida (${c} cartas)`,
    });
    roundNumber++;
  }

  // Phase 3: Rondas de Máximas (Todas las cartas)
  // Exact count of max cards hands to reach the target rounds:
  // Non-max phases = Phase 1 (numPlayers) + Phase 2 (maxCards - 2) + Phase 4 (maxCards - 2) + Phase 5 (numPlayers)
  const nonMaxRoundsCount = 2 * numPlayers + 2 * Math.max(0, maxCards - 2);
  const targetTotal = TARGET_ROUNDS_FOR_PLAYERS[numPlayers] || (nonMaxRoundsCount + numPlayers * 2);
  const maxRoundsCount = Math.max(1, targetTotal - nonMaxRoundsCount);

  const enableSubastado = rules?.enableSubastado !== false;
  const enableRandomTrumpMax = rules?.randomTrumpAfterSubastado !== false;

  for (let i = 0; i < maxRoundsCount; i++) {
    let trump: Suit = 'oros';
    let isSubastado = false;
    let isRandomTrump = false;
    let phaseName = `Todas las Cartas (${maxCards} cartas)`;

    // First cycle in max cards is Subastado if enabled
    if (enableSubastado && i < numPlayers) {
      isSubastado = true;
      trump = 'oros';
      phaseName = `Vuelta Máximas: Subastado (${maxCards} cartas)`;
    } else if (enableRandomTrumpMax) {
      isRandomTrump = true;
      const drawnCard = drawRandomCardForTrump();
      trump = drawnCard.suit;
      phaseName = `Vuelta Máximas: Triunfo Aleatorio (${maxCards} cartas)`;
    } else {
      trump = getNextSuit();
      phaseName = `Vuelta Máximas (${maxCards} cartas)`;
    }

    rounds.push({
      id: `round_${roundNumber}`,
      roundNumber,
      cards: maxCards,
      dealerIndex: getNextDealer(),
      trump,
      phase: 'bidding',
      scores: {},
      phaseName,
      isSubastado,
      isRandomTrumpMax: isRandomTrump,
    });
    roundNumber++;
  }

  // Phase 4: Bajada (Descenso directo: maxCards - 1, ..., 2 = maxCards - 2 rondas)
  for (let c = maxCards - 1; c >= 2; c--) {
    rounds.push({
      id: `round_${roundNumber}`,
      roundNumber,
      cards: c,
      dealerIndex: getNextDealer(),
      trump: getNextSuit(),
      phase: 'bidding',
      scores: {},
      phaseName: `Bajada (${c} cartas)`,
    });
    roundNumber++;
  }

  // Phase 5: Vuelta final de 1 carta (1 mano por cada jugador = numPlayers rondas)
  for (let i = 0; i < numPlayers; i++) {
    rounds.push({
      id: `round_${roundNumber}`,
      roundNumber,
      cards: 1,
      dealerIndex: getNextDealer(),
      trump: getNextSuit(),
      phase: 'bidding',
      scores: {},
      phaseName: 'Vuelta Final (1 carta)',
    });
    roundNumber++;
  }

  return rounds;
}

/**
 * Adapts and recalculates the game's round table when a new player is added mid-game
 * (specifically inserted after the dealer or at a chosen seat position).
 * Re-aligns max cards, dealer rotation for the new player count, and executes the proper
 * round sequence for the new player count (6 players -> 36 rounds, 7 players -> 38 rounds, etc.).
 */
export function adaptRoundsForNewPlayerCount(
  existingRounds: Round[],
  currentRoundIndex: number,
  originalPlayers: Player[],
  updatedPlayers: Player[],
  rules: GameRules,
  deckCards: number = 40
): Round[] {
  const newNumPlayers = updatedPlayers.length;
  const newMaxCards = getMaxCards(newNumPlayers, deckCards);
  const suitsList: Suit[] = ['oros', 'copas', 'espadas', 'bastos'];

  // Map each player ID to their new index in updatedPlayers
  const playerIdToNewIndex: Record<string, number> = {};
  updatedPlayers.forEach((p, idx) => {
    playerIdToNewIndex[p.id] = idx;
  });

  const adaptedRounds: Round[] = [];

  // 1. Process past completed rounds (0 .. currentRoundIndex - 1)
  for (let i = 0; i < currentRoundIndex; i++) {
    const oldRound = existingRounds[i];
    if (!oldRound) continue;
    const oldDealer = originalPlayers[oldRound.dealerIndex];
    const newDealerIdx =
      oldDealer && playerIdToNewIndex[oldDealer.id] !== undefined
        ? playerIdToNewIndex[oldDealer.id]
        : oldRound.dealerIndex % newNumPlayers;

    adaptedRounds.push({
      ...oldRound,
      dealerIndex: newDealerIdx,
    });
  }

  // 2. Process current round
  const currentOldRound =
    existingRounds[currentRoundIndex] || existingRounds[existingRounds.length - 1];

  let currentDealerIdx = 0;
  let currentTrump: Suit = 'oros';
  let currentCards = 1;

  // Determine current phase from currentOldRound
  const oldPhaseLower = (currentOldRound?.phaseName || '').toLowerCase();
  const isDescending = oldPhaseLower.includes('bajada') || oldPhaseLower.includes('descen');
  const isFinalVuelta = oldPhaseLower.includes('final');
  const isPrimeraVuelta =
    !isFinalVuelta &&
    !isDescending &&
    (oldPhaseLower.includes('primera') || (currentOldRound?.cards === 1 && currentRoundIndex < newNumPlayers));
  const isMaxPhase =
    !isDescending &&
    !isFinalVuelta &&
    !isPrimeraVuelta &&
    (currentOldRound?.cards >= newMaxCards ||
      oldPhaseLower.includes('máxima') ||
      oldPhaseLower.includes('maxima') ||
      oldPhaseLower.includes('todas') ||
      oldPhaseLower.includes('subastado'));

  if (currentOldRound) {
    const currentOldDealer = originalPlayers[currentOldRound.dealerIndex];
    currentDealerIdx =
      currentOldDealer && playerIdToNewIndex[currentOldDealer.id] !== undefined
        ? playerIdToNewIndex[currentOldDealer.id]
        : (currentOldRound.dealerIndex || 0) % newNumPlayers;

    currentTrump = currentOldRound.trump || 'oros';

    if (isMaxPhase) {
      currentCards = newMaxCards;
    } else if (isPrimeraVuelta || isFinalVuelta) {
      currentCards = 1;
    } else {
      currentCards = Math.max(1, Math.min(currentOldRound.cards, newMaxCards));
    }

    let phaseName = currentOldRound.phaseName;
    let isSubastado = currentOldRound.isSubastado;
    let isRandomTrumpMax = currentOldRound.isRandomTrumpMax;

    if (isMaxPhase) {
      if (rules?.enableSubastado !== false) {
        isSubastado = true;
        phaseName = `Vuelta Máximas: Subastado (${newMaxCards} cartas)`;
      } else if (rules?.randomTrumpAfterSubastado !== false) {
        isRandomTrumpMax = true;
        phaseName = `Vuelta Máximas: Triunfo Dador (${newMaxCards} cartas)`;
      } else {
        phaseName = `Vuelta Máximas (${newMaxCards} cartas)`;
      }
    } else if (isPrimeraVuelta) {
      phaseName = 'Primera Vuelta (1 carta)';
    } else if (isFinalVuelta) {
      phaseName = 'Vuelta Final (1 carta)';
    } else if (isDescending) {
      phaseName = `Bajada (${currentCards} cartas)`;
    } else {
      phaseName = `Subida (${currentCards} cartas)`;
    }

    adaptedRounds.push({
      ...currentOldRound,
      cards: currentCards,
      dealerIndex: currentDealerIdx,
      phaseName,
      isSubastado,
      isRandomTrumpMax,
    });
  }

  // 3. Setup sequential rotation for future dealers and trumps
  let nextDealerTracker = (currentDealerIdx + 1) % newNumPlayers;
  let suitIndex = (suitsList.indexOf(currentTrump) + 1) % suitsList.length;
  if (suitIndex < 0) suitIndex = 0;

  const getNextSuit = (): Suit => {
    const s = suitsList[suitIndex % suitsList.length];
    suitIndex++;
    return s;
  };

  const getNextDealer = (): number => {
    const d = nextDealerTracker % newNumPlayers;
    nextDealerTracker = (nextDealerTracker + 1) % newNumPlayers;
    return d;
  };

  const enableSubastado = rules?.enableSubastado !== false;
  const enableRandomTrumpMax = rules?.randomTrumpAfterSubastado !== false;

  // Calculate target rounds for newNumPlayers
  const nonMaxRoundsCount = 2 * newNumPlayers + 2 * Math.max(0, newMaxCards - 2);
  const targetTotal =
    TARGET_ROUNDS_FOR_PLAYERS[newNumPlayers] || nonMaxRoundsCount + newNumPlayers * 2;
  const maxRoundsCount = Math.max(newNumPlayers, targetTotal - nonMaxRoundsCount);

  const remainingRoundsConfig: Array<{
    cards: number;
    phaseName: string;
    isSubastado?: boolean;
    isRandomTrumpMax?: boolean;
  }> = [];

  if (isPrimeraVuelta) {
    // 1. Finish Primera Vuelta so all newNumPlayers have 1 hand of 1 card dealt
    const roundsOf1SoFar = adaptedRounds.filter(
      (r) => r.cards === 1 && !r.phaseName?.toLowerCase().includes('final')
    ).length;
    const remainingVuelta1 = Math.max(0, newNumPlayers - roundsOf1SoFar);

    for (let i = 0; i < remainingVuelta1; i++) {
      remainingRoundsConfig.push({
        cards: 1,
        phaseName: 'Primera Vuelta (1 carta)',
      });
    }

    // 2. Ascend to newMaxCards
    for (let c = 2; c < newMaxCards; c++) {
      remainingRoundsConfig.push({
        cards: c,
        phaseName: `Subida (${c} cartas)`,
      });
    }

    // 3. Máximas rounds (all players deal once in Subastado if enabled, then Triunfo Dador)
    for (let i = 0; i < maxRoundsCount; i++) {
      let isSub = false;
      let isRand = false;
      let pName = `Todas las Cartas (${newMaxCards} cartas)`;

      if (enableSubastado && i < newNumPlayers) {
        isSub = true;
        pName = `Vuelta Máximas: Subastado (${newMaxCards} cartas)`;
      } else if (enableRandomTrumpMax) {
        isRand = true;
        pName = `Vuelta Máximas: Triunfo Dador (${newMaxCards} cartas)`;
      } else {
        pName = `Vuelta Máximas (${newMaxCards} cartas)`;
      }

      remainingRoundsConfig.push({
        cards: newMaxCards,
        phaseName: pName,
        isSubastado: isSub,
        isRandomTrumpMax: isRand,
      });
    }

    // 4. Bajada
    for (let c = newMaxCards - 1; c >= 2; c--) {
      remainingRoundsConfig.push({
        cards: c,
        phaseName: `Bajada (${c} cartas)`,
      });
    }

    // 5. Vuelta Final (1 hand per player)
    for (let i = 0; i < newNumPlayers; i++) {
      remainingRoundsConfig.push({
        cards: 1,
        phaseName: 'Vuelta Final (1 carta)',
      });
    }
  } else if (!isDescending && !isFinalVuelta && currentCards < newMaxCards) {
    // Subida phase (currently ascending at currentCards)
    // 1. Finish Subida from currentCards + 1 up to newMaxCards - 1
    for (let c = currentCards + 1; c < newMaxCards; c++) {
      remainingRoundsConfig.push({
        cards: c,
        phaseName: `Subida (${c} cartas)`,
      });
    }

    // 2. Máximas rounds for newNumPlayers
    for (let i = 0; i < maxRoundsCount; i++) {
      let isSub = false;
      let isRand = false;
      let pName = `Todas las Cartas (${newMaxCards} cartas)`;

      if (enableSubastado && i < newNumPlayers) {
        isSub = true;
        pName = `Vuelta Máximas: Subastado (${newMaxCards} cartas)`;
      } else if (enableRandomTrumpMax) {
        isRand = true;
        pName = `Vuelta Máximas: Triunfo Dador (${newMaxCards} cartas)`;
      } else {
        pName = `Vuelta Máximas (${newMaxCards} cartas)`;
      }

      remainingRoundsConfig.push({
        cards: newMaxCards,
        phaseName: pName,
        isSubastado: isSub,
        isRandomTrumpMax: isRand,
      });
    }

    // 3. Bajada
    for (let c = newMaxCards - 1; c >= 2; c--) {
      remainingRoundsConfig.push({
        cards: c,
        phaseName: `Bajada (${c} cartas)`,
      });
    }

    // 4. Vuelta Final (1 hand per player)
    for (let i = 0; i < newNumPlayers; i++) {
      remainingRoundsConfig.push({
        cards: 1,
        phaseName: 'Vuelta Final (1 carta)',
      });
    }
  } else if (isMaxPhase || (currentCards === newMaxCards && !isDescending && !isFinalVuelta)) {
    // Máximas Phase (All Cards)
    // How many max-card rounds are already in adaptedRounds (including current):
    const maxRoundsDone = adaptedRounds.filter((r) => r.cards === newMaxCards).length;
    const remainingMaxRounds = Math.max(newNumPlayers, maxRoundsCount - maxRoundsDone);

    for (let i = 0; i < remainingMaxRounds; i++) {
      const idx = maxRoundsDone + i;
      let isSub = false;
      let isRand = false;
      let pName = `Todas las Cartas (${newMaxCards} cartas)`;

      if (enableSubastado && idx < newNumPlayers) {
        isSub = true;
        pName = `Vuelta Máximas: Subastado (${newMaxCards} cartas)`;
      } else if (enableRandomTrumpMax) {
        isRand = true;
        pName = `Vuelta Máximas: Triunfo Dador (${newMaxCards} cartas)`;
      } else {
        pName = `Vuelta Máximas (${newMaxCards} cartas)`;
      }

      remainingRoundsConfig.push({
        cards: newMaxCards,
        phaseName: pName,
        isSubastado: isSub,
        isRandomTrumpMax: isRand,
      });
    }

    // Bajada from newMaxCards - 1 down to 2
    for (let c = newMaxCards - 1; c >= 2; c--) {
      remainingRoundsConfig.push({
        cards: c,
        phaseName: `Bajada (${c} cartas)`,
      });
    }

    // Vuelta Final (1 hand per player)
    for (let i = 0; i < newNumPlayers; i++) {
      remainingRoundsConfig.push({
        cards: 1,
        phaseName: 'Vuelta Final (1 carta)',
      });
    }
  } else if (isDescending) {
    // Bajada phase (currently descending)
    const startDescend = currentCards > 2 ? currentCards - 1 : 2;
    for (let c = startDescend; c >= 2; c--) {
      remainingRoundsConfig.push({
        cards: c,
        phaseName: `Bajada (${c} cartas)`,
      });
    }

    // Vuelta Final (1 hand per player)
    for (let i = 0; i < newNumPlayers; i++) {
      remainingRoundsConfig.push({
        cards: 1,
        phaseName: 'Vuelta Final (1 carta)',
      });
    }
  } else if (isFinalVuelta) {
    // Vuelta Final phase
    const finalDone = adaptedRounds.filter(
      (r) => r.cards === 1 && r.phaseName?.toLowerCase().includes('final')
    ).length;
    const remainingFinal = Math.max(0, newNumPlayers - finalDone);

    for (let i = 0; i < remainingFinal; i++) {
      remainingRoundsConfig.push({
        cards: 1,
        phaseName: 'Vuelta Final (1 carta)',
      });
    }
  }

  // Append remaining rounds with sequential dealers and correct trump rotation
  remainingRoundsConfig.forEach((cfg) => {
    let trump: Suit;
    if (cfg.isSubastado) {
      trump = 'oros';
    } else if (cfg.isRandomTrumpMax) {
      trump = drawRandomCardForTrump().suit;
    } else {
      trump = getNextSuit();
    }

    adaptedRounds.push({
      id: `round_${adaptedRounds.length + 1}`,
      roundNumber: adaptedRounds.length + 1,
      cards: cfg.cards,
      dealerIndex: getNextDealer(),
      trump,
      phase: 'bidding',
      scores: {},
      phaseName: cfg.phaseName,
      isSubastado: cfg.isSubastado,
      isRandomTrumpMax: cfg.isRandomTrumpMax,
    });
  });

  // Re-number and re-id all rounds
  const finalRounds = adaptedRounds.map((r, idx) => ({
    ...r,
    roundNumber: idx + 1,
    id: `round_${idx + 1}`,
  }));

  return recalculateGameScores(updatedPlayers, finalRounds, rules);
}

/**
 * Reorders the players in an ongoing game to match their physical table seating positions.
 * Remaps the dealer index for past/current rounds so the historical dealer remains the same person,
 * and seamlessly rotates future dealers around the new table seating order.
 */
export function reorderGamePlayers(
  existingRounds: Round[],
  currentRoundIndex: number,
  originalPlayers: Player[],
  newOrderedPlayers: Player[],
  rules: GameRules,
  rotateFutureDealersSequentially: boolean = true
): { players: Player[]; rounds: Round[] } {
  const numPlayers = newOrderedPlayers.length;

  const playerIdToNewIndex: Record<string, number> = {};
  newOrderedPlayers.forEach((p, idx) => {
    playerIdToNewIndex[p.id] = idx;
  });

  const updatedRounds: Round[] = [];

  // 1. Process past rounds (0 .. currentRoundIndex - 1)
  for (let i = 0; i < currentRoundIndex; i++) {
    const round = existingRounds[i];
    if (!round) continue;

    const oldDealer = originalPlayers[round.dealerIndex];
    const newDealerIdx =
      oldDealer && playerIdToNewIndex[oldDealer.id] !== undefined
        ? playerIdToNewIndex[oldDealer.id]
        : round.dealerIndex % numPlayers;

    updatedRounds.push({
      ...round,
      dealerIndex: newDealerIdx,
    });
  }

  // 2. Process current round
  const currentRound = existingRounds[currentRoundIndex];
  let currentDealerNewIdx = 0;

  if (currentRound) {
    const oldDealer = originalPlayers[currentRound.dealerIndex];
    currentDealerNewIdx =
      oldDealer && playerIdToNewIndex[oldDealer.id] !== undefined
        ? playerIdToNewIndex[oldDealer.id]
        : currentRound.dealerIndex % numPlayers;

    updatedRounds.push({
      ...currentRound,
      dealerIndex: currentDealerNewIdx,
    });
  }

  // 3. Process future rounds
  let nextDealerTracker = (currentDealerNewIdx + 1) % numPlayers;

  for (let i = currentRoundIndex + 1; i < existingRounds.length; i++) {
    const futureRound = existingRounds[i];
    if (!futureRound) continue;

    let targetDealerIdx: number;

    if (rotateFutureDealersSequentially) {
      targetDealerIdx = nextDealerTracker;
      nextDealerTracker = (nextDealerTracker + 1) % numPlayers;
    } else {
      const oldDealer = originalPlayers[futureRound.dealerIndex];
      targetDealerIdx =
        oldDealer && playerIdToNewIndex[oldDealer.id] !== undefined
          ? playerIdToNewIndex[oldDealer.id]
          : futureRound.dealerIndex % numPlayers;
    }

    updatedRounds.push({
      ...futureRound,
      dealerIndex: targetDealerIdx,
    });
  }

  const recalculatedRounds = recalculateGameScores(newOrderedPlayers, updatedRounds, rules);

  return {
    players: newOrderedPlayers,
    rounds: recalculatedRounds,
  };
}

export interface DeckCard {
  suit: Suit;
  rank: string;
  name: string;
  symbol: string;
}

/**
 * Draws a random Spanish deck card to randomly select trump suit
 */
export function drawRandomCardForTrump(): DeckCard {
  const suits: Suit[] = ['oros', 'copas', 'espadas', 'bastos'];
  const ranks = ['As', '2', '3', '4', '5', '6', '7', '8', '9', 'Sota', 'Caballo', 'Rey'];

  const selectedSuit = suits[Math.floor(Math.random() * suits.length)];
  const selectedRank = ranks[Math.floor(Math.random() * ranks.length)];
  const suitInfo = SUITS[selectedSuit];

  return {
    suit: selectedSuit,
    rank: selectedRank,
    name: `${selectedRank} de ${suitInfo.name}`,
    symbol: suitInfo.symbol,
  };
}

/**
 * Finds highest bidder player in a round
 */
export function getHighestBidder(
  players: Player[],
  round: Round
): { player: Player; bid: number } | null {
  let highestBid = -1;
  let topPlayer: Player | null = null;

  players.forEach((p) => {
    const b = round.scores[p.id]?.bid;
    if (b !== undefined && b !== null && b > highestBid) {
      highestBid = b;
      topPlayer = p;
    }
  });

  if (!topPlayer || highestBid < 0) return null;
  return { player: topPlayer, bid: highestBid };
}

/**
 * Calculates points for a single player in a round
 * Rules:
 * - Pocha (cards >= 4, actual === cards, bid === cards): (5 * cards) * 4 points (doble del doble)
 * - Hit: +10 base points + 5 * bid
 * - Miss: -10 base points - 5 * |bid - actual|
 * - If trump is 'oros' and doubleOros is enabled: Multiply entire result by 2.
 */
export function calculateScore(
  bid: number,
  actual: number,
  trump: Suit,
  cards: number = 1,
  rules: GameRules = { forbiddenDealerBid: true, doubleOros: true, allowSinTriunfo: true, pochaDoubleDouble: true }
): { points: number; hit: boolean; difference: number; isPocha: boolean } {
  const hit = bid === actual;
  const difference = Math.abs(bid - actual);

  // Pocha condition: player bids ALL tricks in round with 4+ cards (cards >= 4 && bid === cards)
  const isPochaAttempt = cards >= 4 && bid === cards && rules?.pochaDoubleDouble !== false;
  const isPocha = isPochaAttempt && hit;

  const isOrosDouble = trump === 'oros' && rules?.doubleOros !== false;

  if (isPochaAttempt) {
    // Base hit value: (5 * cards) + 10
    // Multiplier: x2 for Pocha bid, and additional x2 if trump is Oros (x4 total in Oros)
    // Non-Oros 8 cards: (40 + 10) * 2 = 100 pts (+100 hit, -100 fail)
    // Oros 8 cards: (40 + 10) * 2 * 2 = 200 pts (+200 hit, -200 fail)
    const baseValue = 5 * cards + 10;
    const pochaMultiplier = 2 * (isOrosDouble ? 2 : 1);
    const pochaMagnitude = baseValue * pochaMultiplier;
    const points = hit ? pochaMagnitude : -pochaMagnitude;

    console.log(
      `[POCHA SCORE LOG] 🃏 Cards: ${cards} | Bid: ${bid} | Actual: ${actual} | Trump: ${trump} | Hit: ${hit}\n` +
      `  - Base Value (5*cards + 10): ${baseValue}\n` +
      `  - Multipliers: Pocha (x2)${isOrosDouble ? ' x Oros (x2) = x4 Total' : ' = x2 Total'}\n` +
      `  - Calculation: ${baseValue} * ${pochaMultiplier} = ${pochaMagnitude} (${hit ? '+' : '-'}${pochaMagnitude} pts)\n` +
      `  - Final Points: ${points}`
    );

    return { points, hit, difference, isPocha };
  }

  let basePoints = 0;
  if (hit) {
    if (bid === 0) {
      // Regla de Apuestas a Cero (Pedir 0 bazas)
      const zeroRule = rules?.zeroBidRule || 'standard';
      if (zeroRule === 'reduced_penalty') {
        basePoints = 5; // Penalizar 0 fácil (+5 pts)
      } else if (zeroRule === 'bonus_reward') {
        basePoints = 20; // Premiar 0 (+20 pts)
      } else if (zeroRule === 'scaled_cards') {
        // Escalar por dificultad según cartas repartidas
        basePoints = 10 + 2 * cards;
      } else if (zeroRule === 'custom_points') {
        basePoints = rules?.zeroBidCustomPoints !== undefined ? rules.zeroBidCustomPoints : 10;
      } else {
        basePoints = 10; // Estándar oficial (10 + 5*0 = 10)
      }
    } else {
      basePoints = 10 + 5 * bid;
    }
  } else {
    if (bid === 0) {
      // Penalización por fallar apuesta de cero bazas
      const zeroFailPenalty = rules?.zeroBidFailPenalty || 'standard';
      if (zeroFailPenalty === 'double_penalty') {
        basePoints = -20 - 10 * difference; // Doble castigo por comerse bazas involuntarias
      } else if (zeroFailPenalty === 'harsh_20') {
        basePoints = -20 - 5 * difference; // Base agravada de -20
      } else {
        basePoints = -10 - 5 * difference; // Estándar oficial
      }
    } else {
      basePoints = -10 - 5 * difference;
    }
  }

  const points = isOrosDouble ? basePoints * 2 : basePoints;

  console.log(
    `[SCORE LOG] 🃏 Cards: ${cards} | Bid: ${bid} | Actual: ${actual} | Trump: ${trump} | Hit: ${hit}\n` +
    `  - Base Points: ${basePoints} (${hit ? `10 + 5*${bid}` : `-10 - 5*${difference}`})\n` +
    `  - Oros Double: ${isOrosDouble ? 'Yes (x2)' : 'No'}\n` +
    `  - Final Points: ${points}`
  );

  return { points, hit, difference, isPocha };
}

/**
 * Recalculates all scores and accumulated points across all rounds
 */
export function recalculateGameScores(
  players: Player[],
  rounds: Round[],
  rules: GameRules
): Round[] {
  const accumulatedMap: Record<string, number> = {};
  players.forEach((p) => {
    accumulatedMap[p.id] = p.startingPoints || 0;
  });

  return rounds.map((round, rIdx) => {
    const updatedScores: Record<string, RoundScore> = {};

    players.forEach((player) => {
      // If player joined mid-game after this round, they didn't participate in this round
      const joinedIdx = player.joinedAtRoundIndex;
      const joinedAfterThisRound = joinedIdx !== undefined && rIdx < joinedIdx;

      const currentScore = round.scores[player.id];
      const bid = joinedAfterThisRound ? null : (currentScore?.bid ?? null);
      const actual = joinedAfterThisRound ? null : (currentScore?.actual ?? null);

      let points = 0;
      let hit: boolean | null = null;
      let diff = 0;
      let isPocha = false;

      if (bid !== null && actual !== null) {
        const result = calculateScore(bid, actual, round.trump, round.cards, rules);
        points = result.points;
        hit = result.hit;
        diff = result.difference;
        isPocha = result.isPocha;
      }

      const prevAccumulated = accumulatedMap[player.id] ?? (player.startingPoints || 0);
      const newAccumulated = round.phase === 'completed' ? prevAccumulated + points : prevAccumulated;

      if (round.phase === 'completed') {
        accumulatedMap[player.id] = newAccumulated;
      }

      updatedScores[player.id] = {
        playerId: player.id,
        bid,
        actual,
        points: round.phase === 'completed' ? points : 0,
        accumulatedPoints: round.phase === 'completed' ? newAccumulated : prevAccumulated,
        hit,
        difference: diff,
        isPocha,
      };
    });

    return {
      ...round,
      scores: updatedScores,
    };
  });
}

/**
 * Gets the list of players ordered starting from the Mano (player after dealer)
 */
export function getBiddingOrder(players: Player[], dealerIndex: number): Player[] {
  const n = players.length;
  if (n === 0) return [];
  const safeDealerIndex = ((dealerIndex % n) + n) % n;
  const order: Player[] = [];
  for (let i = 1; i <= n; i++) {
    const idx = (safeDealerIndex + i) % n;
    if (players[idx]) {
      order.push(players[idx]);
    }
  }
  return order;
}

/**
 * Checks if a specific bid is forbidden for the dealer (Repartidor)
 */
export function getForbiddenDealerBid(
  players: Player[],
  dealerIndex: number,
  round: Round,
  rules: GameRules
): number | null {
  if (!rules.forbiddenDealerBid || players.length === 0) return null;

  const cards = round.cards;
  const safeDealerIndex = ((dealerIndex % players.length) + players.length) % players.length;
  const dealer = players[safeDealerIndex];
  if (!dealer) return null;

  const biddingOrder = getBiddingOrder(players, safeDealerIndex);

  let sumOthers = 0;
  let otherBidsCount = 0;

  biddingOrder.forEach((p) => {
    if (p && p.id !== dealer.id) {
      const b = round.scores[p.id]?.bid;
      if (b !== undefined && b !== null) {
        sumOthers += b;
        otherBidsCount++;
      }
    }
  });

  // Only apply restriction if all non-dealer players have placed their bids
  if (otherBidsCount === players.length - 1) {
    const forbidden = cards - sumOthers;
    if (forbidden >= 0 && forbidden <= cards) {
      return forbidden;
    }
  }

  return null;
}

/**
 * Calculates automatically how many tricks are left or exceeded in the bidding phase
 * based on the number of cards dealt, and detects impossible, invalid, or forbidden bidding situations.
 */
export function calculateBiddingStatus(
  cards: number,
  bids: Record<string, number | null | undefined>,
  players: Player[],
  dealerIndex: number,
  rules: GameRules
): BiddingAnalysis {
  const safeDealerIndex = players.length > 0 ? ((dealerIndex % players.length) + players.length) % players.length : 0;
  const dealer = players[safeDealerIndex];

  let totalBids = 0;
  let enteredCount = 0;
  let hasIndividualInvalidBids = false;

  players.forEach((p) => {
    const val = bids[p.id];
    if (val !== undefined && val !== null) {
      if (val < 0 || val > cards) {
        hasIndividualInvalidBids = true;
      }
      totalBids += Math.max(0, val);
      enteredCount++;
    }
  });

  const allBidsEntered = enteredCount === players.length;
  const pendingPlayersCount = Math.max(0, players.length - enteredCount);
  const remainingToMatchCards = cards - totalBids;
  const differenceAbs = Math.abs(remainingToMatchCards);
  const maxPossibleBidsInRound = cards * players.length;

  let bidsStatus: 'under' | 'over' | 'exact' = 'exact';
  if (remainingToMatchCards > 0) {
    bidsStatus = 'under';
  } else if (remainingToMatchCards < 0) {
    bidsStatus = 'over';
  }

  // Calculate forbidden dealer bid
  const mockRound: Round = {
    id: 'temp',
    roundNumber: 1,
    cards,
    dealerIndex: safeDealerIndex,
    trump: 'oros',
    phase: 'bidding',
    scores: Object.fromEntries(
      Object.entries(bids).map(([pId, b]) => [
        pId,
        {
          playerId: pId,
          bid: b ?? null,
          actual: null,
          points: 0,
          accumulatedPoints: 0,
          hit: null,
          difference: 0,
        },
      ])
    ),
  };

  const forbiddenDealerBid = getForbiddenDealerBid(players, safeDealerIndex, mockRound, rules);
  const dealerBid = dealer ? bids[dealer.id] : undefined;
  const isDealerForbiddenViolated =
    Boolean(rules.forbiddenDealerBid) &&
    forbiddenDealerBid !== null &&
    dealerBid !== undefined &&
    dealerBid !== null &&
    dealerBid === forbiddenDealerBid;

  let statusMessage = '';
  let tacticalTip = '';
  let severity: 'info' | 'success' | 'warning' | 'error' = 'info';

  if (hasIndividualInvalidBids) {
    statusMessage = `Apuesta inválida: ningún jugador puede pedir más de ${cards} ni menos de 0 bazas con ${cards} ${cards === 1 ? 'carta' : 'cartas'} en juego.`;
    tacticalTip = 'Corrige las apuestas individuales para que estén comprendidas entre 0 y el número de cartas de la ronda.';
    severity = 'error';
  } else if (isDealerForbiddenViolated) {
    statusMessage = `¡Regla violada! El repartidor (${dealer?.name || 'repartidor'}) no puede pedir ${forbiddenDealerBid} bazas porque empataría exactamente las ${cards} cartas.`;
    tacticalTip = 'El repartidor debe cambiar su apuesta (pedir al menos 1 baza más o menos) para que la suma no coincida con las cartas.';
    severity = 'error';
  } else if (totalBids > maxPossibleBidsInRound) {
    statusMessage = `Suma imposible: se han pedido ${totalBids} bazas en total, pero el límite físico absoluto de la mesa es ${maxPossibleBidsInRound}.`;
    tacticalTip = 'Revisa las apuestas introducidas en la ronda.';
    severity = 'error';
  } else if (bidsStatus === 'under') {
    // Faltan bazas por pedir para cubrir las cartas repartidas
    statusMessage = `Faltan ${differenceAbs} ${differenceAbs === 1 ? 'baza' : 'bazas'} por pedir para cubrir las ${cards} cartas (${totalBids}/${cards}).`;
    tacticalTip = allBidsEntered
      ? `📉 La partida va corta (de menos): Sobrarán ${differenceAbs} ${differenceAbs === 1 ? 'baza libre' : 'bazas libres'} sin dueño. Al menos un jugador ganará bazas involuntarias y fallará su apuesta.`
      : `Quedan ${pendingPlayersCount} ${pendingPlayersCount === 1 ? 'jugador' : 'jugadores'} por pedir su apuesta.`;
    severity = allBidsEntered ? 'warning' : 'info';
  } else if (bidsStatus === 'over') {
    // Se han pedido más bazas de las cartas repartidas
    statusMessage = `Se han pedido +${differenceAbs} ${differenceAbs === 1 ? 'baza' : 'bazas'} de más respecto a las ${cards} cartas (${totalBids}/${cards}).`;
    tacticalTip = `🔥 La partida va pasada (de más): Faltan ${differenceAbs} ${differenceAbs === 1 ? 'baza física' : 'bazas físicas'} en la mesa. Al menos un jugador no podrá cumplir su apuesta obligatoriamente.`;
    severity = 'warning';
  } else {
    // Exact match (totalBids === cards)
    statusMessage = `La suma de bazas pedidas (${totalBids}) coincide exactamente con las ${cards} cartas repartidas.`;
    if (rules.forbiddenDealerBid) {
      tacticalTip = '⚠️ Si todos los jugadores han apostado, el repartidor no tiene permitido dejar la suma exacta.';
      severity = 'warning';
    } else {
      tacticalTip = '🎯 Subasta exacta: Si todos los jugadores ganan sus bazas pedidas, todos puntuarán en la ronda.';
      severity = 'success';
    }
  }

  return {
    cards,
    totalBids,
    remainingToMatchCards,
    bidsStatus,
    differenceAbs,
    allBidsEntered,
    pendingPlayersCount,
    maxPossibleBidsInRound,
    isDealerForbiddenViolated,
    forbiddenDealerBid,
    hasIndividualInvalidBids,
    statusMessage,
    tacticalTip,
    severity,
  };
}

/**
 * Parses natural Spanish spoken or typed text into player bids or actuals
 * E.g., "Carlos 2, Ana 1, Pedro cero" -> { "p_1": 2, "p_2": 1, "p_3": 0 }
 */
export function parseVoiceInput(
  text: string,
  players: Player[]
): { parsedScores: Record<string, number>; unmatchedText: string } {
  const normalizedText = text.toLowerCase().trim();

  // Map Spanish number words
  const wordToNum: Record<string, number> = {
    cero: 0,
    ninguna: 0,
    ninguno: 0,
    nada: 0,
    una: 1,
    uno: 1,
    un: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10,
  };

  const parsedScores: Record<string, number> = {};

  // For each player, search for player name followed by number or number word
  players.forEach((player) => {
    const pName = player.name.toLowerCase().trim();
    // Regex for player name followed by number or word
    const regex = new RegExp(`${pName}\\s*(?:pide|pido|hace|hizo|tiene|:|=)?\\s*(\\d+|cero|ninguna|ninguno|nada|una|uno|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)`, 'i');
    const match = normalizedText.match(regex);

    if (match && match[1]) {
      const valStr = match[1];
      const val = !isNaN(parseInt(valStr, 10))
        ? parseInt(valStr, 10)
        : wordToNum[valStr] ?? null;

      if (val !== null) {
        parsedScores[player.id] = val;
      }
    }
  });

  // Fallback: If text is just a list of numbers like "2 1 0 3", assign in dealer order
  if (Object.keys(parsedScores).length === 0) {
    const numbersMatch = normalizedText.match(/\d+/g);
    if (numbersMatch && numbersMatch.length === players.length) {
      players.forEach((p, idx) => {
        parsedScores[p.id] = parseInt(numbersMatch[idx], 10);
      });
    }
  }

  return { parsedScores, unmatchedText: normalizedText };
}

/**
 * Calculates detailed game statistics for analysis
 */
export function calculatePlayerStats(players: Player[], rounds: Round[]): PlayerStats[] {
  const completedRounds = rounds.filter((r) => r.phase === 'completed');

  return players.map((player) => {
    let totalPoints = player.startingPoints || 0;
    let totalHits = 0;
    let totalMisses = 0;
    let totalBids = 0;
    let totalActuals = 0;
    let orosPoints = 0;
    let normalPoints = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let totalDiff = 0;

    let bestRound: { roundNumber: number; points: number } | null = null;
    let worstRound: { roundNumber: number; points: number } | null = null;

    completedRounds.forEach((round) => {
      const s = round.scores[player.id];
      if (!s || s.bid === null || s.actual === null) return;

      totalPoints += s.points;
      totalBids += s.bid;
      totalActuals += s.actual;
      totalDiff += s.difference;

      if (round.trump === 'oros') {
        orosPoints += s.points;
      } else {
        normalPoints += s.points;
      }

      if (s.hit) {
        totalHits++;
        currentStreak++;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
        }
      } else {
        totalMisses++;
        currentStreak = 0;
      }

      if (!bestRound || s.points > bestRound.points) {
        bestRound = { roundNumber: round.roundNumber, points: s.points };
      }
      if (!worstRound || s.points < worstRound.points) {
        worstRound = { roundNumber: round.roundNumber, points: s.points };
      }
    });

    const totalRoundsPlayed = totalHits + totalMisses;
    const hitPercentage = totalRoundsPlayed > 0 ? Math.round((totalHits / totalRoundsPlayed) * 100) : 0;
    const avgErrorMargin = totalRoundsPlayed > 0 ? Number((totalDiff / totalRoundsPlayed).toFixed(2)) : 0;

    return {
      player,
      totalPoints,
      rank: 1, // Will be set after sorting
      totalRounds: totalRoundsPlayed,
      totalHits,
      totalMisses,
      hitPercentage,
      totalBids,
      totalActuals,
      orosPoints,
      normalPoints,
      bestRound,
      worstRound,
      currentStreak,
      maxStreak,
      avgErrorMargin,
    };
  })
  .sort((a, b) => b.totalPoints - a.totalPoints)
  .map((stat, idx) => ({ ...stat, rank: idx + 1 }));
}
