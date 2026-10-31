package ir.game.haftkhabisvip.engine

import ir.game.haftkhabisvip.model.*

/** قوانین مشترک بین موتور بازی (میزبان) و رابط کاربری (همه بازیکن‌ها). */
object Rules {
    fun canPlay(state: GameState, card: Card): Boolean {
        val top = state.topCard ?: return false
        val currentSuit = state.activeSuit ?: top.suit

        if (state.sevenChainPenalty > 0) {
            return card.rank == Rank.SEVEN || (card.rank == Rank.KING && card.suit == top.suit)
        }
        if (state.pendingAction == PendingActionType.EIGHT_STREAK) {
            return card.rank == Rank.EIGHT || card.rank == Rank.JACK || card.suit == top.suit
        }
        if (state.pendingAction != PendingActionType.NONE) return false

        if (card.rank == Rank.JACK || card.rank == Rank.JOKER) return true
        return card.suit == currentSuit || card.rank == top.rank
    }
}
