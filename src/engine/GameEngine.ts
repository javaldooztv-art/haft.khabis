import { Card, GameState, Player, Rank, Suit, ClientIntent, canPlayCard, RANK_POINTS } from '../types';

function createUid(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

const SUITS: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
const RANKS: Rank[] = [
  'ACE',
  'TWO',
  'THREE',
  'FOUR',
  'FIVE',
  'SIX',
  'SEVEN',
  'EIGHT',
  'NINE',
  'TEN',
  'JACK',
  'QUEEN',
  'KING',
];

export class GameEngine {
  private drawPile: Card[] = [];
  private discardPile: Card[] = [];
  public state: GameState;
  public catchArmedAtMs = 0;

  constructor(initialPlayers: { id: string; name: string; avatarId?: string; isBot?: boolean }[], maxRounds = 5) {
    const hakem = Math.floor(Math.random() * initialPlayers.length);
    this.state = {
      players: initialPlayers.map((p, idx) => ({
        id: p.id,
        name: p.name,
        avatarId: p.avatarId || `avatar_${(idx % 10) + 1}`,
        isBot: p.isBot ?? false,
        hand: [],
        totalScore: 0,
        lastRoundScore: 0,
        saidTakKard: false,
      })),
      deckCount: 0,
      topCard: null,
      activeSuit: null,
      currentTurnIndex: hakem,
      direction: -1, // Persian default: counter-clockwise (پادساعتگرد)
      currentRound: 1,
      totalRounds: maxRounds,
      hakemIndex: hakem,
      sevenChainPenalty: 0,
      sevenChainInitiatorId: null,
      pendingAction: 'NONE',
      hasDrawnThisTurn: false,
      statusMessage: 'در انتظار شروع بازی...',
      isRoundOver: false,
      isGameOver: false,
      catchTargetId: null,
    };
  }

  public startNewRound(winnerFromLastRoundIndex?: number) {
    const hakem = winnerFromLastRoundIndex !== undefined ? winnerFromLastRoundIndex : this.state.hakemIndex;
    const numDecks = this.state.players.length <= 4 ? 1 : 2;

    this.drawPile = [];
    this.discardPile = [];

    for (let d = 0; d < numDecks; d++) {
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          this.drawPile.push({ id: `c_${d}_${suit}_${rank}_${createUid()}`, suit, rank });
        }
      }
      this.drawPile.push({ id: `j1_${d}_${createUid()}`, suit: 'JOKER', rank: 'JOKER' });
      this.drawPile.push({ id: `j2_${d}_${createUid()}`, suit: 'JOKER', rank: 'JOKER' });
    }

    // Shuffle draw pile
    this.shuffle(this.drawPile);

    // Deal 7 cards to each player
    const updatedPlayers = this.state.players.map((p) => {
      const hand: Card[] = [];
      for (let i = 0; i < 7; i++) {
        hand.push(this.drawFromBank());
      }
      return { ...p, hand, saidTakKard: false };
    });

    // Flip first card; must not be Joker, 7, or Jack
    let firstCard = this.drawFromBank();
    while (firstCard.rank === 'JOKER' || firstCard.rank === 'SEVEN' || firstCard.rank === 'JACK') {
      this.drawPile.unshift(firstCard);
      this.shuffle(this.drawPile);
      firstCard = this.drawFromBank();
    }
    this.discardPile.push(firstCard);

    this.state = {
      ...this.state,
      players: updatedPlayers,
      deckCount: this.drawPile.length,
      topCard: firstCard,
      activeSuit: firstCard.suit,
      currentTurnIndex: hakem,
      hakemIndex: hakem,
      direction: -1,
      sevenChainPenalty: 0,
      sevenChainInitiatorId: null,
      pendingAction: 'NONE',
      hasDrawnThisTurn: false,
      catchTargetId: null,
      isRoundOver: false,
      statusMessage: `دست ${this.state.currentRound} شروع شد! نوبت ${updatedPlayers[hakem].name}`,
    };
  }

  private shuffle(array: Card[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  public drawFromBank(): Card {
    if (this.drawPile.length === 0) {
      if (this.discardPile.length > 1) {
        const top = this.discardPile.pop()!;
        this.drawPile = [...this.discardPile];
        this.discardPile = [top];
        this.shuffle(this.drawPile);
      } else {
        return { id: `fallback_${createUid()}`, suit: 'HEARTS', rank: 'TWO' };
      }
    }
    return this.drawPile.pop()!;
  }

  public processIntent(playerId: string, intent: ClientIntent): boolean {
    if (this.state.isRoundOver || this.state.isGameOver) return false;
    const playerIdx = this.state.players.findIndex((p) => p.id === playerId);
    if (playerIdx === -1) return false;

    if (intent.t === 'tak') {
      const p = this.state.players[playerIdx];
      if (p.hand.length === 1 && !p.saidTakKard) {
        this.updatePlayer(playerIdx, (pl) => ({ ...pl, saidTakKard: true }));
        this.state = {
          ...this.state,
          catchTargetId: this.state.catchTargetId === p.id ? null : this.state.catchTargetId,
          statusMessage: `${p.name} اعلام کرد: تک کارت!`,
        };
        return true;
      }
      return false;
    }

    if (intent.t === 'catch') {
      const targetId = this.state.catchTargetId;
      if (!targetId || targetId === playerId) return false;
      if (this.state.pendingAction !== 'NONE') return false;
      if (Date.now() < this.catchArmedAtMs + 1800) return false;

      const targetIdx = this.state.players.findIndex((p) => p.id === targetId);
      if (targetIdx === -1) return false;
      const target = this.state.players[targetIdx];
      if (target.hand.length !== 1 || target.saidTakKard) {
        this.state = { ...this.state, catchTargetId: null };
        return false;
      }

      const penalty = this.drawFromBank();
      this.updatePlayer(targetIdx, (pl) => ({ ...pl, hand: [...pl.hand, penalty] }));
      this.state = {
        ...this.state,
        catchTargetId: null,
        deckCount: this.drawPile.length,
        statusMessage: `${target.name} تک نگفت! ${this.state.players[playerIdx].name} گیرش انداخت — ۱ کارت جریمه`,
      };
      return true;
    }

    if (playerIdx !== this.state.currentTurnIndex) return false;

    const prevCatch = this.state.catchTargetId;
    const shouldClear = prevCatch !== null && (prevCatch !== playerId || intent.t === 'draw');
    if (shouldClear) {
      this.state = { ...this.state, catchTargetId: null };
    }

    let ok = false;
    switch (intent.t) {
      case 'play':
        ok = this.handlePlayCard(playerIdx, intent.cardId);
        break;
      case 'draw':
        ok = this.handleDrawCard(playerIdx);
        break;
      case 'pass':
        ok = this.handlePassTurn(playerIdx);
        break;
      case 'eight':
        if (this.state.pendingAction === 'EIGHT_STREAK') {
          this.advanceTurn(1);
          ok = true;
        }
        break;
      case 'suit':
        ok = this.handleSelectSuit(playerIdx, intent.suit);
        break;
      case 'give':
        ok = this.handleGiveCard(playerIdx, intent.cardId, intent.target);
        break;
    }

    if (!ok && shouldClear) {
      this.state = { ...this.state, catchTargetId: prevCatch };
    }

    this.normalizeTakKard();
    return ok;
  }

  private handlePlayCard(playerIdx: IntNumber, cardId: string): boolean {
    const player = this.state.players[playerIdx];
    const card = player.hand.find((c) => c.id === cardId);
    if (!card || !canPlayCard(this.state, card)) return false;

    const newHand = player.hand.filter((c) => c.id !== cardId);
    this.discardPile.push(card);

    this.updatePlayer(playerIdx, (pl) => ({
      ...pl,
      hand: newHand,
      saidTakKard: newHand.length === 1 ? pl.saidTakKard : false,
    }));

    this.state = {
      ...this.state,
      topCard: card,
      activeSuit: card.rank === 'JOKER' ? this.state.activeSuit : card.suit,
      deckCount: this.drawPile.length,
      pendingAction: 'NONE',
      catchTargetId: newHand.length === 1 && !player.saidTakKard ? player.id : this.state.catchTargetId,
    };

    if (newHand.length === 0) {
      this.finishRound(playerIdx, card);
      return true;
    }

    switch (card.rank) {
      case 'SEVEN': {
        const initiator = this.state.sevenChainInitiatorId || player.id;
        const newPenalty = this.state.sevenChainPenalty + 2;
        this.state = {
          ...this.state,
          sevenChainPenalty: newPenalty,
          sevenChainInitiatorId: initiator,
          statusMessage: `${player.name} کارت ۷ انداخت! جریمه فعلی: ${newPenalty} کارت`,
        };
        this.advanceTurn(1);
        break;
      }
      case 'KING': {
        if (this.state.sevenChainPenalty > 0) {
          const initiatorIdx = this.state.players.findIndex((p) => p.id === this.state.sevenChainInitiatorId);
          const penaltyCount = this.state.sevenChainPenalty;
          if (initiatorIdx !== -1) {
            const penaltyCards: Card[] = [];
            for (let i = 0; i < penaltyCount; i++) penaltyCards.push(this.drawFromBank());
            this.updatePlayer(initiatorIdx, (pl) => ({ ...pl, hand: [...pl.hand, ...penaltyCards] }));
          }
          const initiatorName = this.state.players[initiatorIdx]?.name || 'شروع‌کننده';
          this.state = {
            ...this.state,
            sevenChainPenalty: 0,
            sevenChainInitiatorId: null,
            deckCount: this.drawPile.length,
            statusMessage: `دفاع با شاه! ${penaltyCount} کارت جریمه به ${initiatorName} برگشت!`,
          };
        }
        this.advanceTurn(1);
        break;
      }
      case 'JACK': {
        this.state = {
          ...this.state,
          pendingAction: 'CHOOSE_SUIT',
          statusMessage: `${player.name} سرباز انداخت. در حال انتخاب خال...`,
        };
        break;
      }
      case 'JOKER': {
        this.state.players.forEach((_, idx) => {
          if (idx !== playerIdx) {
            const pen = this.drawFromBank();
            this.updatePlayer(idx, (pl) => ({ ...pl, hand: [...pl.hand, pen] }));
          }
        });
        this.state = {
          ...this.state,
          deckCount: this.drawPile.length,
          pendingAction: 'CHOOSE_SUIT',
          statusMessage: `${player.name} جوکر انداخت! همه ۱ کارت جریمه گرفتند. در حال انتخاب خال...`,
        };
        break;
      }
      case 'TWO': {
        this.state = {
          ...this.state,
          pendingAction: 'GIVE_PENALTY_CARD',
          statusMessage: `${player.name} کارت ۲ انداخت. باید یک کارت به یک نفر بدهد.`,
        };
        break;
      }
      case 'EIGHT': {
        this.state = {
          ...this.state,
          pendingAction: 'EIGHT_STREAK',
          statusMessage: `${player.name} کارت ۸ انداخت. می‌تواند ۸ دیگر یا جایزه بیندازد.`,
        };
        break;
      }
      case 'TEN': {
        const newDir = this.state.direction * -1;
        this.state = {
          ...this.state,
          direction: newDir,
          statusMessage: 'جهت بازی برعکس شد!',
        };
        this.advanceTurn(1);
        break;
      }
      case 'ACE': {
        this.state = {
          ...this.state,
          statusMessage: `${player.name} تک انداخت! نفر بعدی بلوک شد.`,
        };
        this.advanceTurn(2);
        break;
      }
      default:
        this.advanceTurn(1);
        break;
    }
    return true;
  }

  private handleDrawCard(playerIdx: number): boolean {
    const player = this.state.players[playerIdx];

    if (this.state.sevenChainPenalty > 0) {
      const count = this.state.sevenChainPenalty;
      const penaltyCards: Card[] = [];
      for (let i = 0; i < count; i++) penaltyCards.push(this.drawFromBank());
      this.updatePlayer(playerIdx, (pl) => ({ ...pl, hand: [...pl.hand, ...penaltyCards] }));
      this.state = {
        ...this.state,
        sevenChainPenalty: 0,
        sevenChainInitiatorId: null,
        deckCount: this.drawPile.length,
        statusMessage: `${player.name} تعداد ${count} کارت جریمه هفت را برداشت.`,
      };
      this.advanceTurn(1);
      return true;
    }

    if (this.state.pendingAction !== 'NONE') return false;
    if (this.state.hasDrawnThisTurn) return false;

    const drawn = this.drawFromBank();
    this.updatePlayer(playerIdx, (pl) => ({ ...pl, hand: [...pl.hand, drawn] }));
    this.state = {
      ...this.state,
      deckCount: this.drawPile.length,
      hasDrawnThisTurn: true,
      statusMessage: `${player.name} یک کارت از بانک برداشت.`,
    };

    // If player has no playable cards even after drawing, automatically advance turn
    const curPlayer = this.state.players[playerIdx];
    if (!curPlayer.hand.some((c) => canPlayCard(this.state, c))) {
      this.advanceTurn(1);
    }
    return true;
  }

  private handlePassTurn(playerIdx: number): boolean {
    if (!this.state.hasDrawnThisTurn) return false;
    if (this.state.pendingAction !== 'NONE' || this.state.sevenChainPenalty > 0) return false;
    this.state = {
      ...this.state,
      statusMessage: `${this.state.players[playerIdx].name} نوبت را رد کرد.`,
    };
    this.advanceTurn(1);
    return true;
  }

  private normalizeTakKard() {
    let changed = false;
    const updated = this.state.players.map((p) => {
      if (p.saidTakKard && p.hand.length !== 1) {
        changed = true;
        return { ...p, saidTakKard: false };
      }
      return p;
    });
    if (changed) {
      this.state = { ...this.state, players: updated };
    }
  }

  private handleSelectSuit(playerIdx: number, suit: Suit): boolean {
    if (this.state.pendingAction !== 'CHOOSE_SUIT' || suit === 'JOKER') return false;
    const suitTitles: Record<Suit, string> = {
      HEARTS: 'دل ♥',
      DIAMONDS: 'خشت ♦',
      CLUBS: 'گشنیز ♣',
      SPADES: 'پیک ♠',
      JOKER: 'جوکر',
    };
    this.state = {
      ...this.state,
      activeSuit: suit,
      pendingAction: 'NONE',
      statusMessage: `خال جدید اعلام شد: ${suitTitles[suit]}`,
    };
    this.advanceTurn(1);
    return true;
  }

  private handleGiveCard(playerIdx: number, cardId: string, targetPlayerId: string): boolean {
    if (this.state.pendingAction !== 'GIVE_PENALTY_CARD') return false;
    const giver = this.state.players[playerIdx];
    const targetIdx = this.state.players.findIndex((p) => p.id === targetPlayerId);
    if (targetIdx === -1 || targetIdx === playerIdx) return false;

    const cardToGive = giver.hand.find((c) => c.id === cardId);
    if (!cardToGive) return false;

    const newGiverHand = giver.hand.filter((c) => c.id !== cardId);
    this.updatePlayer(playerIdx, (pl) => ({ ...pl, hand: newGiverHand }));
    this.updatePlayer(targetIdx, (pl) => ({ ...pl, hand: [...pl.hand, cardToGive] }));

    this.state = {
      ...this.state,
      pendingAction: 'NONE',
      statusMessage: `${giver.name} یک کارت جریمه به ${this.state.players[targetIdx].name} داد.`,
    };

    if (newGiverHand.length === 0) {
      this.finishRound(playerIdx, this.state.topCard!);
    } else {
      if (newGiverHand.length === 1 && !giver.saidTakKard) {
        this.state = { ...this.state, catchTargetId: giver.id };
      }
      this.advanceTurn(1);
    }
    return true;
  }

  public advanceTurn(steps: number) {
    if (this.state.catchTargetId) {
      this.catchArmedAtMs = Date.now();
    }
    const count = this.state.players.length;
    let nextIdx = (this.state.currentTurnIndex + steps * this.state.direction) % count;
    if (nextIdx < 0) nextIdx += count;

    const prevMsg = this.state.statusMessage.split(' | ')[0];
    this.state = {
      ...this.state,
      currentTurnIndex: nextIdx,
      pendingAction: 'NONE',
      hasDrawnThisTurn: false,
      statusMessage: `${prevMsg} | نوبت ${this.state.players[nextIdx].name}`,
    };
  }

  private finishRound(winnerIdx: number, lastPlayedCard: Card) {
    const endedWithJack = lastPlayedCard.rank === 'JACK';
    const endedWithSeven = lastPlayedCard.rank === 'SEVEN';
    const multiplier = endedWithJack ? 2 : 1;

    const scoredPlayers = this.state.players.map((player, idx) => {
      if (idx === winnerIdx) {
        const winnerScore = endedWithSeven ? -70 : 0;
        return {
          ...player,
          lastRoundScore: winnerScore,
          totalScore: player.totalScore + winnerScore,
        };
      } else {
        const finalHand: Card[] = [];
        for (const c of player.hand) {
          if (c.rank === 'SEVEN') {
            finalHand.push(this.drawFromBank());
            finalHand.push(this.drawFromBank());
          } else {
            finalHand.push(c);
          }
        }
        const rawPoints = finalHand.reduce((acc, c) => acc + RANK_POINTS[c.rank], 0);
        const finalRoundScore = rawPoints * multiplier;
        return {
          ...player,
          hand: finalHand,
          lastRoundScore: finalRoundScore,
          totalScore: player.totalScore + finalRoundScore,
        };
      }
    });

    const isFinalRound = this.state.currentRound >= this.state.totalRounds;
    const winnerName = scoredPlayers[winnerIdx].name;

    this.state = {
      ...this.state,
      players: scoredPlayers,
      isRoundOver: true,
      isGameOver: isFinalRound,
      hakemIndex: winnerIdx,
      statusMessage: isFinalRound
        ? `پایان کل بازی! برنده این دست: ${winnerName}`
        : `پایان دست ${this.state.currentRound}! برنده: ${winnerName}`,
    };
  }

  public proceedToNextRound() {
    if (!this.state.isRoundOver || this.state.isGameOver) return;
    this.state = {
      ...this.state,
      currentRound: this.state.currentRound + 1,
    };
    this.startNewRound(this.state.hakemIndex);
  }

  private updatePlayer(index: number, transform: (p: Player) => Player) {
    const newPlayers = [...this.state.players];
    newPlayers[index] = transform(newPlayers[index]);
    this.state = { ...this.state, players: newPlayers };
  }

  // AI Bot Step
  public stepBotIfNeeded(): boolean {
    if (this.state.isRoundOver || this.state.isGameOver) return false;

    // Check if bots can catch someone who forgot to say Tak Kard
    if (this.state.catchTargetId && this.state.pendingAction === 'NONE') {
      const target = this.state.players.find((p) => p.id === this.state.catchTargetId);
      if (target && target.hand.length === 1 && !target.saidTakKard && Date.now() > this.catchArmedAtMs + 2100) {
        // Random bot catches
        const bot = this.state.players.find((p) => p.isBot && p.id !== target.id);
        if (bot) {
          this.processIntent(bot.id, { t: 'catch' });
          return true;
        }
      }
    }

    const current = this.state.players[this.state.currentTurnIndex];
    if (!current || !current.isBot) return false;

    // 1. If pending action is CHOOSE_SUIT
    if (this.state.pendingAction === 'CHOOSE_SUIT') {
      const suitCounts: Record<Suit, number> = { HEARTS: 0, DIAMONDS: 0, CLUBS: 0, SPADES: 0, JOKER: 0 };
      current.hand.forEach((c) => {
        if (c.suit !== 'JOKER') suitCounts[c.suit]++;
      });
      const bestSuit = SUITS.reduce((best, s) => (suitCounts[s] > suitCounts[best] ? s : best), 'HEARTS');
      return this.processIntent(current.id, { t: 'suit', suit: bestSuit });
    }

    // 2. If pending action is GIVE_PENALTY_CARD
    if (this.state.pendingAction === 'GIVE_PENALTY_CARD') {
      const others = this.state.players.filter((p) => p.id !== current.id);
      if (others.length === 0 || current.hand.length === 0) return false;
      // Target player with lowest hand count or lowest totalScore
      const target = others.reduce((t, p) => (p.hand.length < t.hand.length ? p : t), others[0]);
      // Give highest point card
      const highestCard = current.hand.slice().sort((a, b) => RANK_POINTS[b.rank] - RANK_POINTS[a.rank])[0];
      return this.processIntent(current.id, { t: 'give', cardId: highestCard.id, target: target.id });
    }

    // 3. If pending action is EIGHT_STREAK
    if (this.state.pendingAction === 'EIGHT_STREAK') {
      const playableEight = current.hand.find((c) => canPlayCard(this.state, c));
      if (playableEight) {
        return this.processIntent(current.id, { t: 'play', cardId: playableEight.id });
      }
      return this.processIntent(current.id, { t: 'eight' });
    }

    // 4. Normal turn
    // If bot has 1 card left and hasn't said Tak Kard, say it
    if (current.hand.length === 1 && !current.saidTakKard) {
      this.processIntent(current.id, { t: 'tak' });
    }

    // If seven chain is active, must play 7 or King of top suit, or draw penalty
    if (this.state.sevenChainPenalty > 0) {
      const defenseCard = current.hand.find((c) => canPlayCard(this.state, c));
      if (defenseCard) {
        if (current.hand.length === 2) {
          this.processIntent(current.id, { t: 'tak' });
        }
        return this.processIntent(current.id, { t: 'play', cardId: defenseCard.id });
      }
      return this.processIntent(current.id, { t: 'draw' });
    }

    const playableCards = current.hand.filter((c) => canPlayCard(this.state, c));
    if (playableCards.length > 0) {
      // Prioritize high-impact cards or cards with high point values to dump
      playableCards.sort((a, b) => {
        if (a.rank === 'SEVEN') return -1;
        if (b.rank === 'SEVEN') return 1;
        return RANK_POINTS[b.rank] - RANK_POINTS[a.rank];
      });
      const cardToPlay = playableCards[0];
      if (current.hand.length === 2) {
        // Will have 1 card after play, say Tak Kard!
        this.processIntent(current.id, { t: 'tak' });
      }
      return this.processIntent(current.id, { t: 'play', cardId: cardToPlay.id });
    }

    // Cannot play
    if (!this.state.hasDrawnThisTurn) {
      return this.processIntent(current.id, { t: 'draw' });
    } else {
      return this.processIntent(current.id, { t: 'pass' });
    }
  }
}
type IntNumber = number;
