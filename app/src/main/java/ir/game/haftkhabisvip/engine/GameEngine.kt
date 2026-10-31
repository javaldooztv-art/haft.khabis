package ir.game.haftkhabisvip.engine

import ir.game.haftkhabisvip.model.*
import kotlin.random.Random

class GameEngine(
    private val initialPlayers: List<Pair<String, String>>,
    private val maxRounds: Int
) {
    private var drawPile = mutableListOf<Card>()
    private var discardPile = mutableListOf<Card>()
    
    var state = GameState(
        players = initialPlayers.map { Player(id = it.first, name = it.second) },
        totalRounds = maxRounds,
        hakemIndex = Random.nextInt(initialPlayers.size)
    )
        private set

    /** زمانِ آخرین «مسلح شدن» پنجره‌ی گیر انداختن؛ تا ۲ ثانیه بعد از آن کسی نمی‌تواند «تک نگفت» بزند. */
    private var catchArmedAtMs = 0L

    fun startNewRound(winnerFromLastRoundIndex: Int? = null) {
        val hakem = winnerFromLastRoundIndex ?: state.hakemIndex
        val numDecks = if (state.players.size <= 4) 1 else 2
        
        drawPile.clear()
        discardPile.clear()
        
        repeat(numDecks) {
            for (suit in listOf(Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS, Suit.SPADES)) {
                for (rank in Rank.values().filter { it != Rank.JOKER }) {
                    drawPile.add(Card(suit = suit, rank = rank))
                }
            }
            drawPile.add(Card(suit = Suit.JOKER, rank = Rank.JOKER))
            drawPile.add(Card(suit = Suit.JOKER, rank = Rank.JOKER))
        }
        drawPile.shuffle()

        val updatedPlayers = state.players.map { player ->
            val hand = (1..7).map { drawFromBank() }
            player.copy(hand = hand, saidTakKard = false)
        }

        var firstCard = drawFromBank()
        while (firstCard.rank == Rank.JOKER || firstCard.rank == Rank.SEVEN || firstCard.rank == Rank.JACK) {
            drawPile.add(0, firstCard)
            drawPile.shuffle()
            firstCard = drawFromBank()
        }
        discardPile.add(firstCard)

        state = state.copy(
            players = updatedPlayers,
            deckCount = drawPile.size,
            topCard = firstCard,
            activeSuit = firstCard.suit,
            currentTurnIndex = hakem,
            hakemIndex = hakem,
            direction = -1,
            sevenChainPenalty = 0,
            sevenChainInitiatorId = null,
            pendingAction = PendingActionType.NONE,
            hasDrawnThisTurn = false,
            catchTargetId = null,
            isRoundOver = false,
            statusMessage = "دست ${state.currentRound} شروع شد! نوبت ${updatedPlayers[hakem].name}"
        )
    }

    private fun drawFromBank(): Card {
        if (drawPile.isEmpty()) {
            if (discardPile.size > 1) {
                val top = discardPile.removeLast()
                drawPile.addAll(discardPile)
                discardPile.clear()
                discardPile.add(top)
                drawPile.shuffle()
            } else {
                return Card(suit = Suit.HEARTS, rank = Rank.TWO)
            }
        }
        return drawPile.removeLast()
    }

    fun canPlayCard(card: Card): Boolean = state.canPlay(card)

    fun processIntent(playerId: String, intent: ClientIntent): Boolean {
        if (state.isRoundOver || state.isGameOver) return false
        val playerIdx = state.players.indexOfFirst { it.id == playerId }
        if (playerIdx == -1) return false

        if (intent is ClientIntent.DeclareTakKard) {
            val p = state.players[playerIdx]
            if (p.hand.size == 1 && !p.saidTakKard) {
                updatePlayer(playerIdx) { it.copy(saidTakKard = true) }
                state = state.copy(
                    catchTargetId = if (state.catchTargetId == p.id) null else state.catchTargetId,
                    statusMessage = "${p.name} اعلام کرد: تک کارت!"
                )
                return true
            }
            return false
        }

        if (intent is ClientIntent.CatchTakKard) {
            val targetId = state.catchTargetId ?: return false
            if (targetId == playerId) return false
            // وسط پنجره‌ی انتخاب (خال، کارت جریمه) یا زنجیره‌ی ۸ نمی‌شود گیر انداخت
            if (state.pendingAction != PendingActionType.NONE) return false
            // ۲ ثانیه فرصت برای اعلام «تک کارت»
            if (System.currentTimeMillis() < catchArmedAtMs + 1900L) return false
            val targetIdx = state.players.indexOfFirst { it.id == targetId }
            if (targetIdx == -1) return false
            val target = state.players[targetIdx]
            if (target.hand.size != 1 || target.saidTakKard) {
                state = state.copy(catchTargetId = null)
                return false
            }
            val penalty = drawFromBank()
            updatePlayer(targetIdx) { it.copy(hand = it.hand + penalty) }
            state = state.copy(
                catchTargetId = null,
                deckCount = drawPile.size,
                statusMessage = "${target.name} تک نگفت! ${state.players[playerIdx].name} گیرش انداخت — ۱ کارت جریمه"
            )
            return true
        }

        if (playerIdx != state.currentTurnIndex) return false

        val prevCatch = state.catchTargetId
        val shouldClear = prevCatch != null && (prevCatch != playerId || intent is ClientIntent.DrawCard)
        if (shouldClear) state = state.copy(catchTargetId = null)

        val ok = when (intent) {
            is ClientIntent.PlayCard -> handlePlayCard(playerIdx, intent.cardId)
            is ClientIntent.DrawCard -> handleDrawCard(playerIdx)
            is ClientIntent.PassTurn -> handlePassTurn(playerIdx)
            is ClientIntent.SelectSuit -> handleSelectSuit(playerIdx, intent.suit)
            is ClientIntent.GiveCardToPlayer -> handleGiveCard(playerIdx, intent.cardId, intent.targetPlayerId)
            is ClientIntent.PassEightBonus -> {
                if (state.pendingAction == PendingActionType.EIGHT_STREAK) {
                    advanceTurn(steps = 1)
                    true
                } else false
            }
            else -> false
        }
        if (!ok && shouldClear) state = state.copy(catchTargetId = prevCatch)
        normalizeTakKard()
        return ok
    }

    /** برای وقتی بازیکنی وسط بازی قطع شده: میزبان نوبتش را رد می‌کند. */
    fun skipCurrentTurn() {
        if (state.isRoundOver || state.isGameOver) return
        val idx = state.currentTurnIndex
        state = state.copy(catchTargetId = null)
        if (state.sevenChainPenalty > 0) {
            handleDrawCard(idx)
            return
        }
        state = state.copy(
            pendingAction = PendingActionType.NONE,
            statusMessage = "نوبت ${state.players[idx].name} رد شد"
        )
        advanceTurn(1)
    }

    private fun handlePlayCard(playerIdx: Int, cardId: String): Boolean {
        val player = state.players[playerIdx]
        val card = player.hand.find { it.id == cardId } ?: return false
        if (!canPlayCard(card)) return false

        val newHand = player.hand.filterNot { it.id == cardId }
        discardPile.add(card)
        updatePlayer(playerIdx) { it.copy(hand = newHand, saidTakKard = if (newHand.size == 1) it.saidTakKard else false) }

        state = state.copy(
            topCard = card,
            activeSuit = if (card.rank == Rank.JOKER) state.activeSuit else card.suit,
            deckCount = drawPile.size,
            pendingAction = PendingActionType.NONE,
            catchTargetId = if (newHand.size == 1 && !player.saidTakKard) player.id else state.catchTargetId
        )

        if (newHand.isEmpty()) {
            finishRound(winnerIdx = playerIdx, lastPlayedCard = card)
            return true
        }

        when (card.rank) {
            Rank.SEVEN -> {
                val initiator = state.sevenChainInitiatorId ?: player.id
                val newPenalty = state.sevenChainPenalty + 2
                state = state.copy(
                    sevenChainPenalty = newPenalty,
                    sevenChainInitiatorId = initiator,
                    statusMessage = "${player.name} کارت ۷ انداخت! جریمه فعلی: $newPenalty کارت"
                )
                advanceTurn(1)
            }
            Rank.KING -> {
                if (state.sevenChainPenalty > 0) {
                    val initiatorIdx = state.players.indexOfFirst { it.id == state.sevenChainInitiatorId }
                    val penaltyCount = state.sevenChainPenalty
                    if (initiatorIdx != -1) {
                        val penaltyCards = (1..penaltyCount).map { drawFromBank() }
                        updatePlayer(initiatorIdx) { it.copy(hand = it.hand + penaltyCards) }
                    }
                    val initiatorName = state.players.getOrNull(initiatorIdx)?.name ?: "شروع‌کننده"
                    state = state.copy(
                        sevenChainPenalty = 0,
                        sevenChainInitiatorId = null,
                        deckCount = drawPile.size,
                        statusMessage = "دفاع با شاه! $penaltyCount کارت جریمه به $initiatorName برگشت!"
                    )
                }
                advanceTurn(1)
            }
            Rank.JACK -> {
                state = state.copy(
                    pendingAction = PendingActionType.CHOOSE_SUIT,
                    statusMessage = "${player.name} سرباز انداخت. در حال انتخاب خال..."
                )
            }
            Rank.JOKER -> {
                state.players.forEachIndexed { idx, _ ->
                    if (idx != playerIdx) {
                        val penalty = drawFromBank()
                        updatePlayer(idx) { it.copy(hand = it.hand + penalty) }
                    }
                }
                state = state.copy(
                    deckCount = drawPile.size,
                    pendingAction = PendingActionType.CHOOSE_SUIT,
                    statusMessage = "${player.name} جوکر انداخت! همه ۱ کارت جریمه گرفتند. در حال انتخاب خال..."
                )
            }
            Rank.TWO -> {
                state = state.copy(
                    pendingAction = PendingActionType.GIVE_PENALTY_CARD,
                    statusMessage = "${player.name} کارت ۲ انداخت. باید یک کارت به یک نفر بدهد."
                )
            }
            Rank.EIGHT -> {
                state = state.copy(
                    pendingAction = PendingActionType.EIGHT_STREAK,
                    statusMessage = "${player.name} کارت ۸ انداخت. می‌تواند ۸ دیگر یا جایزه بیندازد."
                )
            }
            Rank.TEN -> {
                val newDir = state.direction * -1
                state = state.copy(
                    direction = newDir,
                    statusMessage = "جهت بازی برعکس شد!"
                )
                advanceTurn(1)
            }
            Rank.ACE -> {
                state = state.copy(statusMessage = "${player.name} تک انداخت! نفر بعدی بلوک شد.")
                advanceTurn(2)
            }
            else -> {
                advanceTurn(1)
            }
        }
        return true
    }

    private fun handleDrawCard(playerIdx: Int): Boolean {
        val player = state.players[playerIdx]

        if (state.sevenChainPenalty > 0) {
            val penaltyCount = state.sevenChainPenalty
            val penaltyCards = (1..penaltyCount).map { drawFromBank() }
            updatePlayer(playerIdx) { it.copy(hand = it.hand + penaltyCards) }
            state = state.copy(
                sevenChainPenalty = 0,
                sevenChainInitiatorId = null,
                deckCount = drawPile.size,
                statusMessage = "${player.name} تعداد $penaltyCount کارت جریمه هفت را برداشت."
            )
            advanceTurn(1)
            return true
        }

        if (state.pendingAction != PendingActionType.NONE) return false
        // فقط یک بار در هر نوبت می‌شود از بانک کشید؛ برای نگه داشتن کارت از دکمه‌ی «رد نوبت» استفاده می‌شود
        if (state.hasDrawnThisTurn) return false

        val drawn = drawFromBank()
        updatePlayer(playerIdx) { it.copy(hand = it.hand + drawn) }
        state = state.copy(
            deckCount = drawPile.size,
            hasDrawnThisTurn = true,
            statusMessage = "${player.name} یک کارت از بانک برداشت."
        )

        // اگر هیچ کارتِ قابل‌انداختنی در دست نیست نوبت خودکار تمام می‌شود؛ وگرنه بازیکن می‌تواند بیندازد یا «رد نوبت» بزند
        if (state.players[playerIdx].hand.none { canPlayCard(it) }) {
            advanceTurn(1)
        }
        return true
    }

    private fun handlePassTurn(playerIdx: Int): Boolean {
        if (!state.hasDrawnThisTurn) return false
        if (state.pendingAction != PendingActionType.NONE || state.sevenChainPenalty > 0) return false
        state = state.copy(statusMessage = "${state.players[playerIdx].name} نوبت را رد کرد.")
        advanceTurn(1)
        return true
    }

    /** پرچم «تک کارت» فقط وقتی معتبر است که بازیکن دقیقاً یک کارت دارد. */
    private fun normalizeTakKard() {
        if (state.players.any { it.saidTakKard && it.hand.size != 1 }) {
            state = state.copy(
                players = state.players.map {
                    if (it.saidTakKard && it.hand.size != 1) it.copy(saidTakKard = false) else it
                }
            )
        }
    }

    private fun handleSelectSuit(playerIdx: Int, suit: Suit): Boolean {
        if (state.pendingAction != PendingActionType.CHOOSE_SUIT) return false
        if (suit == Suit.JOKER) return false

        state = state.copy(
            activeSuit = suit,
            pendingAction = PendingActionType.NONE,
            statusMessage = "خال جدید اعلام شد: ${suit.title} ${suit.symbol}"
        )
        advanceTurn(1)
        return true
    }

    private fun handleGiveCard(playerIdx: Int, cardId: String, targetPlayerId: String): Boolean {
        if (state.pendingAction != PendingActionType.GIVE_PENALTY_CARD) return false
        val giver = state.players[playerIdx]
        val targetIdx = state.players.indexOfFirst { it.id == targetPlayerId }
        if (targetIdx == -1 || targetIdx == playerIdx) return false

        val cardToGive = giver.hand.find { it.id == cardId } ?: return false
        val newGiverHand = giver.hand.filterNot { it.id == cardId }

        updatePlayer(playerIdx) { it.copy(hand = newGiverHand) }
        updatePlayer(targetIdx) { it.copy(hand = it.hand + cardToGive) }

        state = state.copy(
            pendingAction = PendingActionType.NONE,
            statusMessage = "${giver.name} یک کارت جریمه به ${state.players[targetIdx].name} داد."
        )

        if (newGiverHand.isEmpty()) {
            finishRound(winnerIdx = playerIdx, lastPlayedCard = state.topCard!!)
        } else {
            if (newGiverHand.size == 1 && !giver.saidTakKard) {
                state = state.copy(catchTargetId = giver.id)
            }
            advanceTurn(1)
        }
        return true
    }

    private fun advanceTurn(steps: Int) {
        if (state.catchTargetId != null) catchArmedAtMs = System.currentTimeMillis()
        val count = state.players.size
        var nextIdx = (state.currentTurnIndex + (steps * state.direction)) % count
        if (nextIdx < 0) nextIdx += count

        state = state.copy(
            currentTurnIndex = nextIdx,
            pendingAction = PendingActionType.NONE,
            hasDrawnThisTurn = false,
            statusMessage = "${state.statusMessage.substringBefore(" | نوبت")} | نوبت ${state.players[nextIdx].name}"
        )
    }

    private fun finishRound(winnerIdx: Int, lastPlayedCard: Card) {
        val endedWithJack = lastPlayedCard.rank == Rank.JACK
        val endedWithSeven = lastPlayedCard.rank == Rank.SEVEN
        val multiplier = if (endedWithJack) 2 else 1

        val scoredPlayers = state.players.mapIndexed { idx, player ->
            if (idx == winnerIdx) {
                val winnerRoundScore = if (endedWithSeven) -70 else 0
                player.copy(
                    lastRoundScore = winnerRoundScore,
                    totalScore = player.totalScore + winnerRoundScore
                )
            } else {
                val finalHand = mutableListOf<Card>()
                for (c in player.hand) {
                    if (c.rank == Rank.SEVEN) {
                        finalHand.add(drawFromBank())
                        finalHand.add(drawFromBank())
                    } else {
                        finalHand.add(c)
                    }
                }
                val rawPoints = finalHand.sumOf { it.rank.pointValue }
                val finalRoundScore = rawPoints * multiplier
                player.copy(
                    hand = finalHand,
                    lastRoundScore = finalRoundScore,
                    totalScore = player.totalScore + finalRoundScore
                )
            }
        }

        val isFinalRound = state.currentRound >= state.totalRounds
        val winnerName = scoredPlayers[winnerIdx].name

        state = state.copy(
            players = scoredPlayers,
            isRoundOver = true,
            isGameOver = isFinalRound,
            hakemIndex = winnerIdx,
            statusMessage = if (isFinalRound) "پایان کل بازی! برنده این دست: $winnerName" 
                            else "پایان دست ${state.currentRound}! برنده: $winnerName"
        )
    }

    fun proceedToNextRound() {
        if (!state.isRoundOver || state.isGameOver) return
        state = state.copy(currentRound = state.currentRound + 1)
        startNewRound(winnerFromLastRoundIndex = state.hakemIndex)
    }

    private fun updatePlayer(index: Int, transform: (Player) -> Player) {
        val mutable = state.players.toMutableList()
        mutable[index] = transform(mutable[index])
        state = state.copy(players = mutable)
    }
}
