export type Suit = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES' | 'JOKER';

export type Rank =
  | 'ACE'
  | 'TWO'
  | 'THREE'
  | 'FOUR'
  | 'FIVE'
  | 'SIX'
  | 'SEVEN'
  | 'EIGHT'
  | 'NINE'
  | 'TEN'
  | 'JACK'
  | 'QUEEN'
  | 'KING'
  | 'JOKER';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

export interface Player {
  id: string;
  name: string;
  avatarId?: string;
  isBot?: boolean;
  hand: Card[];
  totalScore: number;
  lastRoundScore: number;
  saidTakKard: boolean;
}

export type PendingActionType =
  | 'NONE'
  | 'CHOOSE_SUIT'
  | 'GIVE_PENALTY_CARD'
  | 'EIGHT_STREAK';

export interface GameState {
  players: Player[];
  deckCount: number;
  topCard: Card | null;
  activeSuit: Suit | null;
  currentTurnIndex: number;
  direction: number; // 1 = clockwise, -1 = counter-clockwise
  currentRound: number;
  totalRounds: number;
  hakemIndex: number;
  sevenChainPenalty: number;
  sevenChainInitiatorId: string | null;
  pendingAction: PendingActionType;
  hasDrawnThisTurn: boolean;
  statusMessage: string;
  isRoundOver: boolean;
  isGameOver: boolean;
  catchTargetId: string | null;
}

export type ClientIntent =
  | { t: 'play'; cardId: string }
  | { t: 'draw' }
  | { t: 'pass' }
  | { t: 'eight' }
  | { t: 'suit'; suit: Suit }
  | { t: 'give'; cardId: string; target: string }
  | { t: 'tak' }
  | { t: 'catch' };

export const SUIT_INFO: Record<Suit, { title: string; symbol: string; isRed: boolean }> = {
  HEARTS: { title: 'دل', symbol: '♥', isRed: true },
  DIAMONDS: { title: 'خشت', symbol: '♦', isRed: true },
  CLUBS: { title: 'گشنیز', symbol: '♣', isRed: false },
  SPADES: { title: 'پیک', symbol: '♠', isRed: false },
  JOKER: { title: 'جوکر', symbol: '🃏', isRed: true },
};

export const RANK_POINTS: Record<Rank, number> = {
  ACE: 11,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
  SIX: 6,
  SEVEN: 7,
  EIGHT: 8,
  NINE: 9,
  TEN: 10,
  JACK: 20,
  QUEEN: 3,
  KING: 4,
  JOKER: 30,
};

const RANK_STR: Record<Rank, string> = {
  ACE: 'ace',
  TWO: '2',
  THREE: '3',
  FOUR: '4',
  FIVE: '5',
  SIX: '6',
  SEVEN: '7',
  EIGHT: '8',
  NINE: '9',
  TEN: '10',
  JACK: 'jack',
  QUEEN: 'queen',
  KING: 'king',
  JOKER: 'joker',
};

const SUIT_STR: Record<Suit, string> = {
  HEARTS: 'hearts',
  DIAMONDS: 'diamonds',
  CLUBS: 'clubs',
  SPADES: 'spades',
  JOKER: 'joker',
};

export function getCardImageSrc(card: Card): string {
  if (card.rank === 'JOKER') {
    const isRed = card.id.charCodeAt(0) % 2 === 0;
    return `/cards/card_joker_${isRed ? 'red' : 'blue'}.png`;
  }
  return `/cards/card_${SUIT_STR[card.suit]}_${RANK_STR[card.rank]}.png`;
}

export const CARD_BACK_SRC = '/cards/card_back.png';

// ترتیب خال‌ها با تناوب رنگ‌ها (پیک مشکی، دل قرمز، گشنیز مشکی، خشت قرمز)
export const SUIT_ORDER: Record<Suit, number> = {
  SPADES: 0,   // ۱. پیک ♠ (مشکی)
  HEARTS: 1,   // ۲. دل ♥ (قرمز)
  CLUBS: 2,    // ۳. گشنیز ♣ (مشکی)
  DIAMONDS: 3, // ۴. خشت ♦ (قرمز)
  JOKER: 4,    // جوکر
};

// ترتیب کارت‌ها از بالا به پایین: تک، شاه، بی‌بی، سرباز، ۱۰، ۹، ۸، ۷، ۶، ۵، ۴، ۳، ۲
export const RANK_ORDER: Record<Rank, number> = {
  ACE: 0,   // تک (بالاترین)
  KING: 1,  // شاه
  QUEEN: 2, // بی‌بی
  JACK: 3,  // سرباز
  TEN: 4,   // ۱۰
  NINE: 5,  // ۹
  EIGHT: 6, // ۸
  SEVEN: 7, // ۷
  SIX: 8,   // ۶
  FIVE: 9,  // ۵
  FOUR: 10, // ۴
  THREE: 11,// ۳
  TWO: 12,  // ۲
  JOKER: 13,
};

export function sortHandCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    if (suitDiff !== 0) return suitDiff;
    return RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
  });
}

export function canPlayCard(state: GameState, card: Card): boolean {
  const top = state.topCard;
  if (!top) return false;
  const currentSuit = state.activeSuit || top.suit;

  if (state.sevenChainPenalty > 0) {
    return card.rank === 'SEVEN' || (card.rank === 'KING' && card.suit === top.suit);
  }
  if (state.pendingAction === 'EIGHT_STREAK') {
    return card.rank === 'EIGHT' || card.rank === 'JACK' || card.suit === top.suit;
  }
  if (state.pendingAction !== 'NONE') return false;
  if (card.rank === 'JACK' || card.rank === 'JOKER') return true;
  return card.suit === currentSuit || card.rank === top.rank;
}
