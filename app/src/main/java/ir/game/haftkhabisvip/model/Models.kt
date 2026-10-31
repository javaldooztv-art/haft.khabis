package ir.game.haftkhabisvip.model

import kotlinx.serialization.Serializable
import java.util.UUID

@Serializable
enum class Suit(val symbol: String, val title: String, val isRed: Boolean) {
    HEARTS("♥", "دل", true),
    DIAMONDS("♦", "خشت", true),
    CLUBS("♣", "گشنیز", false),
    SPADES("♠", "پیک", false),
    JOKER("🃏", "جوکر", true)
}

@Serializable
enum class Rank(val label: String, val pointValue: Int) {
    ACE("A", 11),
    TWO("2", 2),
    THREE("3", 3),
    FOUR("4", 4),
    FIVE("5", 5),
    SIX("6", 6),
    SEVEN("7", 7),
    EIGHT("8", 8),
    NINE("9", 9),
    TEN("10", 10),
    JACK("J", 20),
    QUEEN("Q", 3),
    KING("K", 4),
    JOKER("JOKER", 30)
}

@Serializable
data class Card(
    val id: String = UUID.randomUUID().toString(),
    val suit: Suit,
    val rank: Rank
)

@Serializable
data class Player(
    val id: String,
    val name: String,
    val hand: List<Card> = emptyList(),
    val totalScore: Int = 0,
    val lastRoundScore: Int = 0,
    val saidTakKard: Boolean = false
)

@Serializable
enum class PendingActionType {
    NONE,
    CHOOSE_SUIT,
    GIVE_PENALTY_CARD,
    EIGHT_STREAK
}

@Serializable
data class GameState(
    val players: List<Player> = emptyList(),
    val deckCount: Int = 0,
    val topCard: Card? = null,
    val activeSuit: Suit? = null,
    val currentTurnIndex: Int = 0,
    val direction: Int = -1,
    val currentRound: Int = 1,
    val totalRounds: Int = 5,
    val hakemIndex: Int = 0,
    val sevenChainPenalty: Int = 0,
    val sevenChainInitiatorId: String? = null,
    val pendingAction: PendingActionType = PendingActionType.NONE,
    val hasDrawnThisTurn: Boolean = false,
    val statusMessage: String = "در انتظار شروع بازی...",
    val isRoundOver: Boolean = false,
    val isGameOver: Boolean = false,
    val catchTargetId: String? = null
)

@Serializable
sealed class ClientIntent {
    @Serializable data class PlayCard(val cardId: String) : ClientIntent()
    @Serializable object DrawCard : ClientIntent()
    @Serializable object PassEightBonus : ClientIntent()
    @Serializable data class SelectSuit(val suit: Suit) : ClientIntent()
    @Serializable data class GiveCardToPlayer(val cardId: String, val targetPlayerId: String) : ClientIntent()
    @Serializable object DeclareTakKard : ClientIntent()
    @Serializable object CatchTakKard : ClientIntent()
    @Serializable object PassTurn : ClientIntent()
}


/** قانون مجاز بودن انداختن کارت؛ هم موتور بازی و هم رابط کاربری (برای کم‌رنگ کردن کارت‌های غیرمجاز) از همین استفاده می‌کنند. */
fun GameState.canPlay(card: Card): Boolean {
    val top = topCard ?: return false
    val currentSuit = activeSuit ?: top.suit

    if (sevenChainPenalty > 0) {
        return card.rank == Rank.SEVEN || (card.rank == Rank.KING && card.suit == top.suit)
    }
    if (pendingAction == PendingActionType.EIGHT_STREAK) {
        return card.rank == Rank.EIGHT || card.rank == Rank.JACK || card.suit == top.suit
    }
    if (pendingAction != PendingActionType.NONE) return false
    if (card.rank == Rank.JACK || card.rank == Rank.JOKER) return true
    return card.suit == currentSuit || card.rank == top.rank
}


/** نسخه‌ای از وضعیت بازی که فقط دستِ خودِ بیننده را دارد؛ از بقیه فقط تعداد کارت‌ها (کارت‌های ناشناس) فرستاده می‌شود. */
fun GameState.maskedFor(viewerId: String): GameState = copy(
    players = players.map { p ->
        if (p.id == viewerId) p
        else p.copy(hand = List(p.hand.size) { i -> Card(id = "hidden_${p.id}_$i", suit = Suit.SPADES, rank = Rank.TWO) })
    }
)
