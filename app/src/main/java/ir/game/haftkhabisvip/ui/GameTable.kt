package ir.game.haftkhabisvip.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.absoluteOffset
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ir.game.haftkhabisvip.audio.SoundEffects
import ir.game.haftkhabisvip.model.Card
import ir.game.haftkhabisvip.model.ClientIntent
import ir.game.haftkhabisvip.model.GameState
import ir.game.haftkhabisvip.model.PendingActionType
import ir.game.haftkhabisvip.model.Player
import ir.game.haftkhabisvip.model.Suit
import ir.game.haftkhabisvip.model.canPlay
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.random.Random
import kotlinx.coroutines.delay

@Composable
fun GameTableScreen(
    state: GameState,
    myPlayer: Player,
    isHost: Boolean,
    disconnectedIds: List<String>,
    onSendIntent: (ClientIntent) -> Unit,
    onShowScores: () -> Unit,
    onSkipTurn: () -> Unit,
    onLeave: () -> Unit
) {
    val currentPlayer = state.players.getOrNull(state.currentTurnIndex)
    val isMyTurn = currentPlayer?.id == myPlayer.id
    // حریف‌ها به ترتیب نشستن (ساعتگرد از سمت چپ من): بعد از من در لیست = اولین نفر از چپ
    val nPlayers = state.players.size
    val myIdx = state.players.indexOfFirst { it.id == myPlayer.id }.coerceAtLeast(0)
    val opponents = (1 until nPlayers).map { state.players[(myIdx + it) % nPlayers] }
    val nextPlayer = if (nPlayers > 0) state.players[Math.floorMod(state.currentTurnIndex + state.direction, nPlayers)] else null
    val dirColor = if (state.direction == -1) Pal.DirRed else Pal.DirBlue

    // دکمه‌ی «تک نگفت» ۲ ثانیه بعد از آماده شدن پنجره ظاهر می‌شود (و نه وسط پنجره‌های انتخاب)
    var catchReady by remember { mutableStateOf(false) }
    val catchOpen = state.catchTargetId != null && state.pendingAction == PendingActionType.NONE
    LaunchedEffect(state.catchTargetId, catchOpen, state.currentTurnIndex, state.currentRound) {
        catchReady = false
        if (catchOpen) {
            delay(2000)
            catchReady = true
        }
    }
    val dots = remember {
        val r = Random(7)
        List(280) { Offset(r.nextFloat(), r.nextFloat()) }
    }

    // ---- انیمیشن پرواز کارت‌ها (پرتاب روی میز، کشیدن از بانک، دادن کارت)
    val anchors = remember { HashMap<String, Offset>() }
    val cardPos = remember { HashMap<String, Offset>() }
    val originHolder = remember { arrayOf(Offset.Zero) }
    val prevHolder = remember { arrayOfNulls<GameState>(1) }
    val flights = remember { mutableStateListOf<Flight>() }
    val keyCounter = remember { longArrayOf(0L) }
    var shownTop by remember { mutableStateOf(state.topCard) }

    fun posOf(id: String, cardId: String?): Offset? =
        if (id == myPlayer.id) (cardId?.let { cardPos[it] } ?: anchors["hand"]) else anchors[id]

    fun launchFlight(from: Offset, to: Offset, card: Card?, delayMs: Int, spin: Float) {
        keyCounter[0] += 1L
        flights.add(Flight(keyCounter[0], from - originHolder[0], to - originHolder[0], card, delayMs, spin))
    }

    LaunchedEffect(state) {
        val prev = prevHolder[0]
        prevHolder[0] = state
        var hold = false
        if (prev != null && prev.currentRound == state.currentRound && !prev.isRoundOver &&
            prev.players.size == state.players.size
        ) {
            val newTop = state.topCard
            val topChanged = newTop != null && newTop.id != prev.topCard?.id
            val deltas = state.players.mapIndexed { i, p -> Triple(p.id, p.hand.size - prev.players[i].hand.size, i) }
            val shrinkers = deltas.filter { it.second < 0 }
            val discardPos = anchors["discard"]

            if (topChanged && newTop != null && shrinkers.isNotEmpty() && discardPos != null) {
                val moverId = shrinkers.first().first
                val oldHand = prev.players.first { it.id == moverId }.hand
                val newIds = state.players.first { it.id == moverId }.hand.map { it.id }.toSet()
                val playedId = oldHand.firstOrNull { it.id !in newIds }?.id
                val from = posOf(moverId, playedId)
                if (from != null) {
                    launchFlight(from, discardPos, newTop, 0, if (newTop.id.hashCode() % 2 == 0) 10f else -10f)
                    hold = true
                }
            }

            val deckMoved = prev.deckCount != state.deckCount
            val giverId = if (topChanged) shrinkers.drop(1).firstOrNull()?.first else shrinkers.firstOrNull()?.first
            for (d in deltas.filter { it.second > 0 }) {
                val src = if (deckMoved) anchors["draw"] else giverId?.let { posOf(it, null) }
                val dst = posOf(d.first, null)
                if (src != null && dst != null) {
                    repeat(min(d.second, 3)) { k -> launchFlight(src, dst, null, k * 130, 0f) }
                }
            }
        }
        if (hold) delay(380)
        shownTop = state.topCard
    }

    Box(
        Modifier
            .fillMaxSize()
            .onGloballyPositioned { originHolder[0] = it.positionInRoot() }
            .background(feltBrush())
            .drawBehind {
                dots.forEach {
                    drawCircle(Color.White.copy(alpha = 0.025f), 1.2.dp.toPx(), Offset(it.x * size.width, it.y * size.height))
                }
                val inset = 6.dp.toPx()
                drawRoundRect(
                    Pal.Gold.copy(alpha = 0.14f),
                    Offset(inset, inset),
                    Size(size.width - 2 * inset, size.height - 2 * inset),
                    CornerRadius(28.dp.toPx(), 28.dp.toPx()),
                    style = Stroke(1.5.dp.toPx())
                )
            }
    ) {
        Column(Modifier.fillMaxSize().padding(horizontal = 10.dp, vertical = 10.dp)) {
            // ---- سربرگ
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    PillButton("خروج", onLeave, container = Color(0x33FFFFFF), content = Color.White)
                    MusicToggle()
                }
                Box(
                    Modifier
                        .background(Color(0x55000000), RoundedCornerShape(50))
                        .padding(horizontal = 14.dp, vertical = 7.dp)
                ) {
                    Text(
                        "دست ${state.currentRound} از ${state.totalRounds}",
                        color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold
                    )
                }
                PillButton("جدول امتیاز", onShowScores)
            }

            Spacer(Modifier.height(6.dp))

            // ---- حریف‌ها
            val rows = opponents.chunked(if (opponents.size <= 4) 4 else 3)
            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    rows.forEach { row ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                            row.forEach { p ->
                                val isTurnP = currentPlayer?.id == p.id
                                OpponentBadge(
                                    p,
                                    isTurn = isTurnP,
                                    disconnected = p.id in disconnectedIds,
                                    canCatch = catchReady && catchOpen && state.catchTargetId == p.id,
                                    onCatch = { onSendIntent(ClientIntent.CatchTakKard) },
                                    onPos = { anchors[p.id] = it },
                                    nextName = if (isTurnP) nextPlayer?.name else null,
                                    dirColor = dirColor
                                )
                            }
                        }
                    }
                }
            }

            // ---- مرکز میز
            Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                DirectionRing(state.direction, dirColor, Modifier.size(250.dp))
                DirectionChip(state.direction, dirColor, Modifier.align(Alignment.TopCenter))
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    if (state.sevenChainPenalty > 0) {
                        val a = pulse(0.75f, 1f, 600)
                        Box(
                            Modifier
                                .graphicsLayer { alpha = a }
                                .background(Pal.Ruby, RoundedCornerShape(50))
                                .padding(horizontal = 14.dp, vertical = 6.dp)
                        ) {
                            Text(
                                "🔥 زنجیره هفت: ${state.sevenChainPenalty} کارت جریمه",
                                color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(20.dp), verticalAlignment = Alignment.CenterVertically) {
                        DrawPile(
                            count = state.deckCount,
                            hint = isMyTurn && state.pendingAction == PendingActionType.NONE && !state.hasDrawnThisTurn,
                            onPos = { anchors["draw"] = it },
                            onClick = {
                                SoundEffects.playDrawCard()
                                onSendIntent(ClientIntent.DrawCard)
                            }
                        )
                        DiscardPile(shownTop) { anchors["discard"] = it }
                        ActiveSuitBadge(state.activeSuit)
                    }

                    StatusBanner(state.statusMessage)

                    if (isMyTurn && state.hasDrawnThisTurn && state.pendingAction == PendingActionType.NONE &&
                        state.sevenChainPenalty == 0
                    ) {
                        PillButton("رد نوبت", { onSendIntent(ClientIntent.PassTurn) }, container = Color(0xFF78909C), content = Color.White)
                    }
                    if (isMyTurn && state.pendingAction == PendingActionType.EIGHT_STREAK) {
                        PillButton("پایان نوبت ۸", { onSendIntent(ClientIntent.PassEightBonus) }, container = Color(0xFFFF8F00))
                    }
                    if (isHost && currentPlayer != null && currentPlayer.id in disconnectedIds) {
                        PillButton("رد کردن نوبتِ بازیکن قطع‌شده", onSkipTurn, container = Pal.Ruby, content = Color.White)
                    }
                }
            }

            // ---- نوار پایین
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                val p = pulse(0.5f, 1f, 700)
                Column(horizontalAlignment = Alignment.Start, verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Box(
                        Modifier
                            .graphicsLayer { alpha = if (isMyTurn) p else 1f }
                            .background(if (isMyTurn) Color(0xFF1B5E20) else Color(0x55000000), RoundedCornerShape(50))
                            .border(1.5.dp, if (isMyTurn) Pal.Mint else Color(0x44FFFFFF), RoundedCornerShape(50))
                            .padding(horizontal = 14.dp, vertical = 7.dp)
                    ) {
                        Text(
                            if (isMyTurn) "نوبت شماست!" else "نوبت ${currentPlayer?.name ?: ""}",
                            color = if (isMyTurn) Pal.Mint else Color.LightGray,
                            fontWeight = FontWeight.Bold, fontSize = 14.sp,
                            maxLines = 1, overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.widthIn(max = 180.dp)
                        )
                    }
                    if (nextPlayer != null) {
                        Row(
                            Modifier
                                .border(1.5.dp, dirColor, RoundedCornerShape(8.dp))
                                .padding(horizontal = 8.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(if (state.direction == -1) "↺" else "↻", color = dirColor, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold)
                            Text(
                                "بعدی: ${nextPlayer.name}",
                                color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold,
                                maxLines = 1, overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.widthIn(max = 150.dp)
                            )
                        }
                    }
                }
                PillButton(
                    "اعلام تک کارت!",
                    { onSendIntent(ClientIntent.DeclareTakKard) },
                    enabled = myPlayer.hand.size == 1 && !myPlayer.saidTakKard,
                    container = Color(0xFFD32F2F), content = Color.White
                )
            }

            // ---- دست خودم
            HandFan(
                cards = myPlayer.hand,
                enabled = isMyTurn,
                canPlay = { state.canPlay(it) },
                onPlay = { c -> onSendIntent(ClientIntent.PlayCard(c.id)) },
                modifier = Modifier.onGloballyPositioned { anchors["hand"] = it.centerInRoot() },
                onCardPos = { id, pos -> cardPos[id] = pos }
            )
        }

        // لایه‌ی کارت‌های در حال پرواز
        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
            Box(Modifier.fillMaxSize()) {
                flights.forEach { f ->
                    key(f.key) { FlyingCard(f) { flights.remove(f) } }
                }
            }
        }

        if (isMyTurn && state.pendingAction == PendingActionType.CHOOSE_SUIT) {
            SuitSelectionDialog(
                canDeclareTak = myPlayer.hand.size == 1 && !myPlayer.saidTakKard,
                onDeclareTak = { onSendIntent(ClientIntent.DeclareTakKard) }
            ) { onSendIntent(ClientIntent.SelectSuit(it)) }
        }
        if (isMyTurn && state.pendingAction == PendingActionType.GIVE_PENALTY_CARD) {
            GiveCardPenaltyDialog(
                myHand = myPlayer.hand,
                otherPlayers = opponents,
                canDeclareTak = myPlayer.hand.size == 1 && !myPlayer.saidTakKard,
                onDeclareTak = { onSendIntent(ClientIntent.DeclareTakKard) },
                onConfirm = { cardId, target -> onSendIntent(ClientIntent.GiveCardToPlayer(cardId, target)) }
            )
        }
    }
}

// ---------------------------------------------------------------- اجزای میز

@Composable
private fun DrawPile(count: Int, hint: Boolean, onPos: (Offset) -> Unit, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.onGloballyPositioned { onPos(it.centerInRoot()) }
        ) {
            CardBackView(width = 84.dp, modifier = Modifier.offset(x = 4.dp, y = 4.dp))
            CardBackView(width = 84.dp, modifier = Modifier.offset(x = 2.dp, y = 2.dp))
            CardBackView(width = 84.dp, glow = hint, label = "$count", onClick = onClick)
        }
        Spacer(Modifier.height(8.dp))
        Text("بانک", color = Color.White.copy(alpha = 0.85f), fontSize = 12.sp)
    }
}

@Composable
private fun DiscardPile(top: Card?, onPos: (Offset) -> Unit) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .size(width = 100.dp, height = 130.dp)
            .onGloballyPositioned { onPos(it.centerInRoot()) }
    ) {
        Box(
            Modifier
                .size(width = 84.dp, height = 112.dp)
                .graphicsLayer { rotationZ = -8f }
                .background(Pal.Ivory.copy(alpha = 0.45f), RoundedCornerShape(8.dp))
        )
        if (top != null) {
            AnimatedContent(
                targetState = top,
                transitionSpec = {
                    (fadeIn(tween(120)) + scaleIn(tween(160), initialScale = 1.08f)) togetherWith fadeOut(tween(160))
                },
                label = "topCard"
            ) { c ->
                val tilt = ((c.id.hashCode() and 0xF) - 8) * 0.8f
                PlayingCardView(
                    card = c,
                    width = 90.dp,
                    modifier = Modifier.graphicsLayer { rotationZ = tilt }
                )
            }
        }
    }
}

@Composable
private fun ActiveSuitBadge(suit: Suit?) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        if (suit != null && suit != Suit.JOKER) {
            AnimatedContent(
                targetState = suit,
                transitionSpec = {
                    (scaleIn(spring(Spring.DampingRatioMediumBouncy)) + fadeIn()) togetherWith (scaleOut() + fadeOut())
                },
                label = "suit"
            ) { s ->
                Box(
                    Modifier
                        .size(48.dp)
                        .shadow(8.dp, CircleShape)
                        .background(Pal.Ivory, CircleShape)
                        .border(2.5.dp, Pal.Gold, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    SuitIcon(s, 26.dp)
                }
            }
            Spacer(Modifier.height(6.dp))
            Text("خال حکم", color = Pal.Gold, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun StatusBanner(text: String) {
    AnimatedContent(
        targetState = text,
        transitionSpec = { fadeIn(tween(250)) togetherWith fadeOut(tween(150)) },
        label = "status"
    ) { t ->
        Box(
            Modifier
                .widthIn(max = 330.dp)
                .background(Color(0x66000000), RoundedCornerShape(16.dp))
                .border(1.dp, Pal.Gold.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                .padding(horizontal = 14.dp, vertical = 8.dp)
        ) {
            Text(
                t, color = Color(0xFFFFE082), fontWeight = FontWeight.Bold, fontSize = 13.sp,
                textAlign = TextAlign.Center, maxLines = 3, overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun DirectionRing(direction: Int, ringColor: Color, modifier: Modifier = Modifier) {
    val t = rememberInfiniteTransition(label = "ring")
    val angle by t.animateFloat(
        0f, 360f,
        infiniteRepeatable(tween(16000, easing = LinearEasing), RepeatMode.Restart),
        label = "ringAngle"
    )
    Canvas(
        modifier.graphicsLayer {
            rotationZ = angle
            scaleX = if (direction == -1) -1f else 1f
        }
    ) {
        val r = size.minDimension / 2f - 6.dp.toPx()
        val c = center
        val col = ringColor.copy(alpha = 0.65f)
        for (k in 0 until 3) {
            val start = k * 120f + 10f
            drawArc(
                col, start, 72f, false,
                Offset(c.x - r, c.y - r), Size(2 * r, 2 * r),
                style = Stroke(4.dp.toPx(), cap = StrokeCap.Round)
            )
            val a = Math.toRadians((start + 72f).toDouble())
            val px = c.x + r * cos(a).toFloat()
            val py = c.y + r * sin(a).toFloat()
            val tx = -sin(a).toFloat()
            val ty = cos(a).toFloat()
            val nx = cos(a).toFloat()
            val ny = sin(a).toFloat()
            val head = Path().apply {
                moveTo(px + tx * 17.dp.toPx(), py + ty * 17.dp.toPx())
                lineTo(px - nx * 11.dp.toPx(), py - ny * 11.dp.toPx())
                lineTo(px + nx * 11.dp.toPx(), py + ny * 11.dp.toPx())
                close()
            }
            drawPath(head, col)
        }
    }
}

@Composable
private fun OpponentBadge(
    p: Player,
    isTurn: Boolean,
    disconnected: Boolean,
    canCatch: Boolean,
    onCatch: () -> Unit,
    onPos: (Offset) -> Unit,
    nextName: String?,
    dirColor: Color
) {
    val a = pulse(0.4f, 1f, 750)
    val ring = if (isTurn) Pal.Gold.copy(alpha = a) else null
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.graphicsLayer { alpha = if (disconnected) 0.45f else 1f }
    ) {
        // بادبزن پشت کارت‌ها
        Box(Modifier.size(width = 76.dp, height = 40.dp), contentAlignment = Alignment.BottomCenter) {
            val shown = min(p.hand.size, 7)
            for (i in 0 until shown) {
                val rel = i - (shown - 1) / 2f
                CardBackView(
                    width = 22.dp,
                    modifier = Modifier
                        .offset(x = (rel * 8f).dp)
                        .graphicsLayer { rotationZ = rel * 8f }
                )
            }
        }
        Box(
            contentAlignment = Alignment.TopEnd,
            modifier = Modifier.onGloballyPositioned { onPos(it.centerInRoot()) }
        ) {
            Avatar(p.name, 46.dp, ring)
            Box(
                Modifier
                    .offset(x = 6.dp, y = (-4).dp)
                    .size(22.dp)
                    .background(Color(0xFF1A237E), CircleShape)
                    .border(1.5.dp, Pal.Gold, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text("${p.hand.size}", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }
        Text(
            p.name, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold,
            maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.widthIn(max = 80.dp)
        )
        Text(
            if (disconnected) "قطع شد" else "امتیاز \u200E${p.totalScore}",
            color = if (disconnected) Color(0xFFFF8A80) else Color(0xFFB0BEC5), fontSize = 10.sp
        )
        if (nextName != null && !disconnected) {
            Box(
                Modifier
                    .padding(top = 2.dp)
                    .border(1.dp, dirColor, RoundedCornerShape(6.dp))
                    .padding(horizontal = 5.dp, vertical = 1.dp)
            ) {
                Text(
                    "بعدی: $nextName", color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold,
                    maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.widthIn(max = 74.dp)
                )
            }
        }
        if (!disconnected && canCatch) {
            val cb = pulse(0.6f, 1f, 400)
            Box(
                Modifier
                    .graphicsLayer { alpha = cb }
                    .clip(RoundedCornerShape(50))
                    .background(Color(0xFFD32F2F))
                    .clickable { onCatch() }
                    .padding(horizontal = 10.dp, vertical = 4.dp)
            ) {
                Text("تک نگفت😁", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        } else if (!disconnected && p.saidTakKard) {
            val b = pulse(0.5f, 1f, 450)
            Text(
                "تک کارت!", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .graphicsLayer { alpha = b }
                    .background(Color(0xFFD32F2F), RoundedCornerShape(50))
                    .padding(horizontal = 8.dp, vertical = 1.dp)
            )
        }
    }
}


// ------------------------------------------------------------ پرواز کارت‌ها

private const val FLIGHT_MS = 420

private class Flight(
    val key: Long,
    val from: Offset,
    val to: Offset,
    val card: Card?,
    val delayMs: Int,
    val spin: Float
)

private fun LayoutCoordinates.centerInRoot(): Offset =
    positionInRoot() + Offset(size.width / 2f, size.height / 2f)

@Composable
private fun FlyingCard(f: Flight, onDone: () -> Unit) {
    val progress = remember { Animatable(0f) }
    var started by remember { mutableStateOf(false) }
    val density = LocalDensity.current
    val w = 72.dp
    val wPx = with(density) { w.toPx() }
    val hPx = wPx * (4f / 3f)
    val arc = with(density) { 40.dp.toPx() }

    LaunchedEffect(Unit) {
        delay(f.delayMs.toLong())
        started = true
        progress.animateTo(1f, tween(FLIGHT_MS, easing = FastOutSlowInEasing))
        onDone()
    }

    val t = progress.value
    val x = f.from.x + (f.to.x - f.from.x) * t
    val y = f.from.y + (f.to.y - f.from.y) * t - arc * sin(PI * t).toFloat()
    Box(
        Modifier
            .absoluteOffset { IntOffset((x - wPx / 2f).roundToInt(), (y - hPx / 2f).roundToInt()) }
            .graphicsLayer {
                alpha = if (started) 1f else 0f
                rotationZ = f.spin * t
                val sc = 0.9f + 0.1f * t
                scaleX = sc
                scaleY = sc
            }
    ) {
        if (f.card != null) PlayingCardView(f.card, w) else CardBackView(w)
    }
}


@Composable
private fun DirectionChip(direction: Int, color: Color, modifier: Modifier = Modifier) {
    Row(
        modifier
            .background(color.copy(alpha = 0.28f), RoundedCornerShape(50))
            .border(1.5.dp, color, RoundedCornerShape(50))
            .padding(horizontal = 12.dp, vertical = 3.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Text(if (direction == -1) "↺" else "↻", color = color, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
        Text(
            if (direction == -1) "جهت بازی: خلاف ساعت" else "جهت بازی: ساعتگرد",
            color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold
        )
    }
}
