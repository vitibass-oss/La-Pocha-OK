export type Suit = 'oros' | 'copas' | 'espadas' | 'bastos' | 'sin_triunfo';

export interface SuitInfo {
  id: Suit;
  name: string;
  symbol: string;
  icon: string; // Emoji or SVG key
  color: string;
  bgColor: string;
  borderColor: string;
  isDouble: boolean;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  avatar: string;
  startingPoints?: number;       // Score offset when joining mid-game (starts with fewest points)
  joinedAtRoundIndex?: number;   // Round index when the player joined mid-game
}

export interface RoundScore {
  playerId: string;
  bid: number | null;     // Bazas pedidas
  actual: number | null;  // Bazas hechas
  points: number;         // Points gained/lost in this round
  accumulatedPoints: number; // Total points up to this round
  hit: boolean | null;    // true if bid === actual
  difference: number;     // Math.abs((bid || 0) - (actual || 0))
  isPocha?: boolean;      // true if player made all tricks in round >= 4 cards
}

export type RoundPhase = 'bidding' | 'playing' | 'completed';

export interface Round {
  id: string;
  roundNumber: number;
  cards: number;
  dealerIndex: number;    // Index of the player dealing
  trump: Suit;
  phase: RoundPhase;
  scores: Record<string, RoundScore>; // Keyed by playerId
  phaseName?: string;     // e.g., '1 carta', 'Subida', 'Subastado', 'Máximas Triunfo Visible', 'Bajada'
  isSubastado?: boolean;  // True if it's a Subastado round (highest bidder picks trump)
  isRandomTrumpMax?: boolean; // True if it's max cards round with random trump per dealer
  isVisibleTrumpMax?: boolean; // True if it's max cards round with visible trump
  subastadoWinnerId?: string;  // Player ID who won subastado and chose trump
}

export type ZeroBidRuleMode =
  | 'standard'         // +10 pts al acertar 0 bazas (Regla estándar clásica)
  | 'scaled_cards'     // Premiar por cartas: +10 base + 2 por carta repartida (mayor mérito a más cartas)
  | 'reduced_penalty'  // Penalizar 0 fácil: +5 pts fijos por acertar 0 bazas
  | 'bonus_reward'     // Superpremio a 0: +20 pts fijos por acertar 0 bazas
  | 'custom_points';   // Puntuación fija personalizada

export type ZeroBidFailPenalty =
  | 'standard'        // -10 base - 5 por baza de más (Regla estándar)
  | 'double_penalty'  // Castigo doble: -20 base - 10 por baza involuntaria
  | 'harsh_20';       // Penalización severa: -20 base - 5 por baza

export type RoundProgressionMode =
  | 'standard'        // Clásica oficial (1s -> Subida -> Máximas -> Bajada -> 1s)
  | 'ascending'       // Ascendente (1 a Máx cartas)
  | 'descending'      // Descendente (Máx a 1 carta)
  | 'pyramid'         // Subir y Bajar (1 -> Máx -> 1 carta directa)
  | 'constant'        // Rondas constantes (mismo número de cartas todas las rondas)
  | 'custom';         // Secuencia personalizada manual (definida carta por carta)

export interface GameRules {
  forbiddenDealerBid: boolean; // Dealer cannot match total cards
  doubleOros: boolean;         // Oros scores double
  allowSinTriunfo: boolean;    // Allow "Sin Triunfo" rounds
  deckCards?: number;          // Total cards in deck (e.g. 40, 48, 49, 52)
  pochaDoubleDouble?: boolean; // Make all tricks in >= 4 cards scores 4x (doble del doble)
  enableSubastado?: boolean;   // Enable subastado round in max cards
  singleMaxCardsRound?: boolean; // If true, plays exactly 1 single hand of max cards instead of a full round per player
  randomTrumpAfterSubastado?: boolean; // Enable max cards round with random trump drawn by dealer
  visibleTrumpAfterSubastado?: boolean; // Enable max cards round with visible trump after subastado
  zeroBidRule?: ZeroBidRuleMode; // Modo de puntuación al acertar 0 bazas
  zeroBidCustomPoints?: number;  // Puntos personalizados al acertar 0 bazas si se elige 'custom_points'
  zeroBidFailPenalty?: ZeroBidFailPenalty; // Penalización al fallar apuesta de 0 bazas
  roundProgressionMode?: RoundProgressionMode; // Modo de progresión de cartas
  constantCardsCount?: number;   // Número de cartas por ronda si el modo es 'constant'
  constantRoundsCount?: number;  // Número de rondas si el modo es 'constant'
  roundsPerLevel?: number;       // Manos por nivel de cartas en ascendente/descendente/pirámide (1 o numPlayers)
  customCardSequence?: number[]; // Secuencia manual de cartas por ronda si el modo es 'custom'
}

export interface Game {
  id: string;
  createdAt: string;
  updatedAt: string;
  players: Player[];
  rounds: Round[];
  currentRoundIndex: number;
  rules: GameRules;
  isFinished: boolean;
  name?: string;
}

export interface BiddingAnalysis {
  cards: number;
  totalBids: number;
  remainingToMatchCards: number; // cards - totalBids (>0 means faltan bazas, <0 means sobran bazas, 0 means igualadas)
  bidsStatus: 'under' | 'over' | 'exact'; // 'under': van de menos, 'over': van de más, 'exact': igualadas
  differenceAbs: number; // |cards - totalBids|
  allBidsEntered: boolean;
  pendingPlayersCount: number;
  maxPossibleBidsInRound: number; // cards * playersCount (theoretical maximum)
  isDealerForbiddenViolated: boolean;
  forbiddenDealerBid: number | null;
  hasIndividualInvalidBids: boolean; // if any bid < 0 or bid > cards
  statusMessage: string;
  tacticalTip: string;
  severity: 'info' | 'success' | 'warning' | 'error';
}

export interface PlayerStats {
  player: Player;
  totalPoints: number;
  rank: number;
  totalRounds: number;
  totalHits: number;
  totalMisses: number;
  hitPercentage: number;
  totalBids: number;
  totalActuals: number;
  orosPoints: number;
  normalPoints: number;
  bestRound: { roundNumber: number; points: number } | null;
  worstRound: { roundNumber: number; points: number } | null;
  currentStreak: number;
  maxStreak: number;
  avgErrorMargin: number;
}
