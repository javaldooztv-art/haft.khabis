package ir.game.haftkhabisvip.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ir.game.haftkhabisvip.model.Card
import ir.game.haftkhabisvip.model.Rank
import ir.game.haftkhabisvip.model.Suit
import kotlinx.coroutines.delay
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

private const val CARD_ASPECT = 4f / 3f

/** ترتیب نمایش دست: از چپ به راست خشت، پیک، دل، گشنیز (رنگ‌ها یک‌درمیان) و در هر خال از تک و شاه و بی‌بی تا ۲. */
private fun suitSlot(s: Suit): Int = when (s) {
    Suit.DIAMONDS -> 0
    Suit.SPADES -> 1
    Suit.HEARTS -> 2
    Suit.CLUBS -> 3
    Suit.JOKER -> 4
}

private fun rankSlot(r: Rank): Int = when (r) {
    Rank.ACE -> 0
    Rank.KING -> 1
    Rank.QUEEN -> 2
    Rank.JACK -> 3
    Rank.TEN -> 4
    Rank.NINE -> 5
    Rank.EIGHT -> 6
    Rank.SEVEN -> 7
    Rank.SIX -> 8
    Rank.FIVE -> 9
    Rank.FOUR -> 10
    Rank.THREE -> 11
    Rank.TWO -> 12
    Rank.JOKER -> 13
}

fun sortHand(cards: List<Card>): List<Card> = cards.sortedBy { suitSlot(it.suit) * 100 + rankSlot(it.rank) }

private fun rankResName(rank: Rank): String = when (rank) {
    Rank.ACE -> "ace"
    Rank.TWO -> "2"
    Rank.THREE -> "3"
    Rank.FOUR -> "4"
    Rank.FIVE -> "5"
    Rank.SIX -> "6"
    Rank.SEVEN -> "7"
    Rank.EIGHT -> "8"
    Rank.NINE -> "9"
    Rank.TEN -> "10"
    Rank.JACK -> "jack"
    Rank.QUEEN -> "queen"
    Rank.KING -> "king"
    Rank.JOKER -> "joker"
}

private fun cardResName(card: Card): String {
    if (card.rank == Rank.JOKER) {
        return if ((card.id.hashCode() and 1) == 0) "card_joker_red" else "card_joker_blue"
    }
    val suit = when (card.suit) {
        Suit.HEARTS -> "hearts"
        Suit.DIAMONDS -> "diamonds"
        Suit.CLUBS -> "clubs"
        Suit.SPADES -> "spades"
        Suit.JOKER -> "hearts"
    }
    return "card_${suit}_${rankResName(card.rank)}"
}

@Composable
private fun drawableId(name: String): Int {
    val ctx = LocalContext.current
    return remember(name) { ctx.resources.getIdentifier(name, "drawable", ctx.packageName) }
}

// ------------------------------------------------------------------ کارت رو

@Composable
fun PlayingCardView(
    card: Card,
    width: Dp = 84.dp,
    modifier: Modifier = Modifier,
    dim: Boolean = false,
    glow: Boolean = false,
    onClick: (() -> Unit)? = null
) {
    val height = width * CARD_ASPECT
    val shape = RoundedCornerShape(width * 0.073f)
    val ink = if (card.rank == Rank.JOKER) Pal.Purple else suitColor(card.suit)
    val resId = drawableId(cardResName(card))

    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
        Box(
            modifier = modifier
                .size(width, height)
                .shadow(
                    elevation = if (glow) 14.dp else 5.dp,
                    shape = shape,
                    ambientColor = if (glow) Pal.Gold else Color.Black,
                    spotColor = if (glow) Pal.Gold else Color.Black
                )
                .clip(shape)
                .background(Brush.verticalGradient(listOf(Pal.Ivory, Pal.IvoryDark)))
                .border(if (glow) 2.dp else 1.dp, if (glow) Pal.Gold else Color(0x33000000), shape)
                .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier)
        ) {
            if (resId != 0) {
                Image(
                    painter = painterResource(resId),
                    contentDescription = null,
                    contentScale = ContentScale.FillBounds,
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                CardFace(card, width, ink)
            }
            if (dim) {
                Box(Modifier.fillMaxSize().background(Color(0x66000000)))
            }
        }
    }
}

@Composable
private fun BoxScope.CardFace(card: Card, width: Dp, ink: Color) {
    val isJoker = card.rank == Rank.JOKER
    val isFace = card.rank == Rank.JACK || card.rank == Rank.QUEEN || card.rank == Rank.KING

    Canvas(Modifier.fillMaxSize()) {
        val w = size.width
        val h = size.height
        when {
            isJoker -> drawJokerArt(w, h)
            isFace -> drawFaceArt(card, w, h, ink)
            card.rank == Rank.ACE -> drawAceArt(card.suit, w, h, ink)
            else -> drawPips(card.suit, pipCount(card.rank), w, h, ink)
        }
    }

    val label = if (isJoker) null else card.rank.label
    CornerIndex(label, card.suit, width, ink, Modifier.align(Alignment.TopStart))
    CornerIndex(
        label, card.suit, width, ink,
        Modifier.align(Alignment.BottomEnd).graphicsLayer { rotationZ = 180f }
    )

    if (isJoker) {
        Text(
            text = "JOKER",
            color = Pal.Purple,
            fontWeight = FontWeight.ExtraBold,
            fontSize = (width.value * 0.12f).sp,
            letterSpacing = 2.sp,
            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = width * 0.1f)
        )
    }
}

@Composable
private fun CornerIndex(label: String?, suit: Suit, width: Dp, ink: Color, modifier: Modifier) {
    val fs = (width.value * 0.2f).sp
    Column(
        modifier = modifier.padding(start = width * 0.07f, end = width * 0.07f, top = width * 0.045f, bottom = width * 0.045f),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        if (label != null) {
            Text(
                text = label,
                color = ink,
                fontWeight = FontWeight.ExtraBold,
                fontFamily = FontFamily.Serif,
                fontSize = fs,
                lineHeight = fs,
                maxLines = 1,
                softWrap = false,
                textAlign = TextAlign.Center
            )
        }
        SuitIcon(suit, width * 0.15f, color = ink)
    }
}

private fun pipCount(rank: Rank): Int = when (rank) {
    Rank.TWO -> 2
    Rank.THREE -> 3
    Rank.FOUR -> 4
    Rank.FIVE -> 5
    Rank.SIX -> 6
    Rank.SEVEN -> 7
    Rank.EIGHT -> 8
    Rank.NINE -> 9
    Rank.TEN -> 10
    else -> 0
}

private fun DrawScope.drawPips(suit: Suit, n: Int, w: Float, h: Float, color: Color) {
    val l = 0.33f
    val c = 0.5f
    val r = 0.67f
    val pts = mutableListOf<Offset>()
    fun add(x: Float, y: Float) { pts.add(Offset(x, y)) }
    when (n) {
        2 -> { add(c, 0.22f); add(c, 0.78f) }
        3 -> { add(c, 0.22f); add(c, 0.5f); add(c, 0.78f) }
        4 -> { add(l, 0.22f); add(r, 0.22f); add(l, 0.78f); add(r, 0.78f) }
        5 -> { add(l, 0.22f); add(r, 0.22f); add(l, 0.78f); add(r, 0.78f); add(c, 0.5f) }
        6 -> { for (y in listOf(0.22f, 0.5f, 0.78f)) { add(l, y); add(r, y) } }
        7 -> { for (y in listOf(0.22f, 0.5f, 0.78f)) { add(l, y); add(r, y) }; add(c, 0.36f) }
        8 -> { for (y in listOf(0.22f, 0.5f, 0.78f)) { add(l, y); add(r, y) }; add(c, 0.36f); add(c, 0.64f) }
        9 -> { for (y in listOf(0.22f, 0.41f, 0.59f, 0.78f)) { add(l, y); add(r, y) }; add(c, 0.5f) }
        10 -> { for (y in listOf(0.22f, 0.41f, 0.59f, 0.78f)) { add(l, y); add(r, y) }; add(c, 0.31f); add(c, 0.69f) }
    }
    val pip = w * (if (n <= 3) 0.27f else 0.2f)
    for (o in pts) {
        drawSuit(suit, Offset(o.x * w - pip / 2f, o.y * h - pip / 2f), pip, color, rotated = o.y > 0.5f)
    }
}

private fun DrawScope.drawAceArt(suit: Suit, w: Float, h: Float, color: Color) {
    val cx = w / 2f
    val cy = h / 2f
    drawCircle(color.copy(alpha = 0.07f), radius = w * 0.38f, center = Offset(cx, cy))
    drawCircle(color.copy(alpha = 0.35f), radius = w * 0.38f, center = Offset(cx, cy), style = Stroke(w * 0.01f))
    val s = if (suit == Suit.SPADES) w * 0.56f else w * 0.5f
    drawSuit(suit, Offset(cx - s / 2f, cy - s / 2f), s, color)
}

private fun DrawScope.drawCrown(center: Offset, cw: Float, ch: Float, tips: Int, ink: Color) {
    val left = center.x - cw / 2f
    val top = center.y - ch / 2f
    val step = cw / (tips - 1)
    fun tipY(i: Int) = if (tips % 2 == 1 && i == tips / 2) top else top + ch * 0.18f
    val path = Path()
    path.moveTo(left, top + ch)
    for (i in 0 until tips) {
        path.lineTo(left + step * i, tipY(i))
        if (i < tips - 1) path.lineTo(left + step * (i + 0.5f), top + ch * 0.62f)
    }
    path.lineTo(left + cw, top + ch)
    path.close()
    drawPath(path, Brush.verticalGradient(listOf(Pal.GoldSoft, Pal.GoldDeep), startY = top, endY = top + ch))
    drawPath(path, ink, style = Stroke(width = cw * 0.035f, join = StrokeJoin.Round))
    drawRect(ink.copy(alpha = 0.85f), Offset(left, top + ch * 0.84f), Size(cw, ch * 0.16f))
    for (i in 0 until tips) {
        drawCircle(ink, cw * 0.04f, Offset(left + step * i, tipY(i)))
    }
}

private fun DrawScope.drawPlume(center: Offset, cw: Float, ch: Float, ink: Color) {
    val left = center.x - cw / 2f
    val top = center.y - ch / 2f
    val path = Path().apply {
        moveTo(left + cw * 0.15f, top + ch)
        cubicTo(left + cw * 0.05f, top + ch * 0.3f, left + cw * 0.55f, top - ch * 0.1f, left + cw * 0.98f, top + ch * 0.1f)
        cubicTo(left + cw * 0.7f, top + ch * 0.35f, left + cw * 0.55f, top + ch * 0.75f, left + cw * 0.15f, top + ch)
        close()
    }
    drawPath(path, Brush.linearGradient(listOf(Pal.GoldSoft, ink.copy(alpha = 0.9f)), Offset(left, top), Offset(left + cw, top + ch)))
    drawPath(path, ink, style = Stroke(cw * 0.03f, join = StrokeJoin.Round))
    drawLine(ink, Offset(left + cw * 0.15f, top + ch), Offset(left + cw * 0.85f, top + ch * 0.12f), strokeWidth = cw * 0.025f)
    drawRect(ink.copy(alpha = 0.85f), Offset(left, top + ch * 0.9f), Size(cw * 0.35f, ch * 0.12f))
}

private fun DrawScope.drawEmblem(rank: Rank, center: Offset, w: Float, ink: Color) {
    when (rank) {
        Rank.KING -> drawCrown(center, w * 0.34f, w * 0.2f, 3, ink)
        Rank.QUEEN -> drawCrown(center, w * 0.36f, w * 0.2f, 5, ink)
        else -> drawPlume(center, w * 0.34f, w * 0.22f, ink)
    }
}

private fun DrawScope.drawFaceArt(card: Card, w: Float, h: Float, ink: Color) {
    val frame = Rect(w * 0.2f, h * 0.1f, w * 0.8f, h * 0.9f)
    val corner = CornerRadius(w * 0.05f, w * 0.05f)
    drawRoundRect(ink.copy(alpha = 0.06f), frame.topLeft, frame.size, corner)
    clipRect(frame.left, frame.top, frame.right, frame.bottom) {
        var x = frame.left - frame.height
        while (x < frame.right) {
            drawLine(
                ink.copy(alpha = 0.09f),
                Offset(x, frame.bottom),
                Offset(x + frame.height, frame.top),
                strokeWidth = w * 0.012f
            )
            x += w * 0.055f
        }
    }
    drawRoundRect(ink.copy(alpha = 0.6f), frame.topLeft, frame.size, corner, style = Stroke(w * 0.014f))

    val cx = w / 2f
    val cy = h / 2f
    val emblemCenter = Offset(cx, cy - h * 0.2f)
    drawEmblem(card.rank, emblemCenter, w, ink)
    withTransform({ rotate(180f, Offset(cx, cy)) }) {
        drawEmblem(card.rank, emblemCenter, w, ink)
    }

    val radius = w * 0.17f
    drawCircle(
        brush = Brush.radialGradient(listOf(Pal.GoldSoft, Pal.GoldDeep), center = Offset(cx, cy), radius = radius),
        radius = radius,
        center = Offset(cx, cy)
    )
    drawCircle(ink, radius, Offset(cx, cy), style = Stroke(w * 0.015f))
    val s = w * 0.2f
    drawSuit(card.suit, Offset(cx - s / 2f, cy - s / 2f), s, ink)
}

private fun DrawScope.drawJokerArt(w: Float, h: Float) {
    val cx = w / 2f
    val cy = h * 0.46f
    val rainbow = listOf(
        Color(0xFFE53935), Color(0xFFFB8C00), Color(0xFFFDD835), Color(0xFF43A047),
        Color(0xFF1E88E5), Color(0xFF8E24AA), Color(0xFFE53935)
    )
    drawCircle(Brush.sweepGradient(rainbow, Offset(cx, cy)), w * 0.3f, Offset(cx, cy))
    drawCircle(Pal.Purple, w * 0.3f, Offset(cx, cy), style = Stroke(w * 0.015f))
    val s = w * 0.46f
    drawSuit(Suit.JOKER, Offset(cx - s / 2f, cy - s / 2f), s, Color.White)
    val small = w * 0.1f
    drawSuit(Suit.JOKER, Offset(w * 0.68f, h * 0.12f), small, Pal.Purple.copy(alpha = 0.8f))
    drawSuit(Suit.JOKER, Offset(w * 0.22f, h * 0.76f), small, Pal.Purple.copy(alpha = 0.8f), rotated = true)
}

// ------------------------------------------------------------------ پشت کارت

@Composable
fun CardBackView(
    width: Dp = 84.dp,
    modifier: Modifier = Modifier,
    glow: Boolean = false,
    label: String? = null,
    onClick: (() -> Unit)? = null
) {
    val height = width * CARD_ASPECT
    val shape = RoundedCornerShape(width * 0.073f)
    val backId = drawableId("card_back")
    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
        Box(
            modifier = modifier
                .size(width, height)
                .shadow(
                    if (glow) 14.dp else 5.dp, shape,
                    ambientColor = if (glow) Pal.Gold else Color.Black,
                    spotColor = if (glow) Pal.Gold else Color.Black
                )
                .clip(shape)
                .background(Brush.linearGradient(listOf(Pal.BackA, Pal.BackB)))
                .border(BorderStroke(if (glow) 2.dp else 1.dp, if (glow) Pal.Gold else Pal.GoldDeep), shape)
                .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier),
            contentAlignment = Alignment.Center
        ) {
            if (backId != 0) {
                Image(
                    painter = painterResource(backId),
                    contentDescription = null,
                    contentScale = ContentScale.FillBounds,
                    modifier = Modifier.fillMaxSize()
                )
            } else Canvas(Modifier.fillMaxSize()) {
                val w = size.width
                val h = size.height
                val m = w * 0.08f
                drawRoundRect(
                    Pal.Gold.copy(alpha = 0.8f), Offset(m, m), Size(w - 2 * m, h - 2 * m),
                    CornerRadius(w * 0.05f, w * 0.05f), style = Stroke(w * 0.012f)
                )
                clipRect(m, m, w - m, h - m) {
                    val step = w * 0.1f
                    var x = -h
                    while (x < w + h) {
                        drawLine(Pal.Gold.copy(alpha = 0.16f), Offset(x, 0f), Offset(x + h, h), strokeWidth = w * 0.008f)
                        drawLine(Pal.Gold.copy(alpha = 0.16f), Offset(x + h, 0f), Offset(x, h), strokeWidth = w * 0.008f)
                        x += step
                    }
                }
                val d = Path().apply {
                    moveTo(w / 2f, h * 0.3f)
                    lineTo(w * 0.78f, h / 2f)
                    lineTo(w / 2f, h * 0.7f)
                    lineTo(w * 0.22f, h / 2f)
                    close()
                }
                drawPath(d, Pal.BackB)
                drawPath(d, Pal.Gold, style = Stroke(w * 0.015f, join = StrokeJoin.Round))
                val s = w * 0.22f
                drawSuit(Suit.SPADES, Offset(w / 2f - s / 2f, h / 2f - s / 2f), s, Pal.Gold)
            }
            if (label != null) {
                Box(
                    Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = width * 0.12f)
                        .background(Color(0xCC000000), RoundedCornerShape(50))
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text(label, color = Pal.Gold, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }
        }
    }
}

// ------------------------------------------------------------------ دست بازیکن (بادبزنی)

@Composable
fun HandFan(
    cards: List<Card>,
    enabled: Boolean,
    canPlay: (Card) -> Boolean,
    onPlay: (Card) -> Unit,
    modifier: Modifier = Modifier,
    onCardPos: (String, Offset) -> Unit = { _, _ -> }
) {
    val sorted = remember(cards) {
        sortHand(cards)
    }
    // کارت‌های تازه: پخش اولیه (از بالا و پله‌پله) یا کارتِ کشیده‌شده (بعد از رسیدن کارت پروازی ظاهر می‌شود)
    val known = remember { mutableSetOf<String>() }
    val newIds = sorted.filter { it.id !in known }.map { it.id }
    val dealStyle = known.isEmpty() || newIds.size >= 5
    SideEffect {
        known.clear()
        known.addAll(sorted.map { it.id })
    }

    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
        BoxWithConstraints(modifier.fillMaxWidth().height(175.dp)) {
            val n = sorted.size
            val cardW = if (n <= 7) 84.dp else if (n <= 12) 76.dp else 68.dp
            val avail = maxWidth - cardW - 16.dp
            val idealStep = cardW * 0.62f
            val step = if (n <= 1) 0.dp else minOf(idealStep, avail / (n - 1))
            val total = step * (n - 1) + cardW
            val startX = (maxWidth - total) / 2f
            val mid = (n - 1) / 2f
            val angleStep = min(3.5f, 28f / max(n, 1))
            val dropK = 0.9f * min(1f, 8f / max(n, 1))

            sorted.forEachIndexed { i, card ->
                key(card.id) {
                    val rel = i - mid
                    val angle = rel * angleStep
                    val dy = (rel * rel * dropK).dp
                    val playable = enabled && canPlay(card)
                    val lift by animateDpAsState(if (playable) 18.dp else 0.dp, label = "lift")
                    val idxNew = newIds.indexOf(card.id)
                    val fall = if (dealStyle) -320f else 0f
                    val appear = remember { Animatable(if (idxNew < 0) 1f else 0f) }
                    LaunchedEffect(Unit) {
                        if (idxNew >= 0) {
                            if (dealStyle) {
                                delay(idxNew * 70L)
                                appear.animateTo(1f, tween(380, easing = FastOutSlowInEasing))
                            } else {
                                delay(400L + idxNew * 130L)
                                appear.animateTo(1f, tween(220))
                            }
                        }
                    }
                    Box(
                        Modifier
                            .offset(x = startX + step * i, y = 30.dp + dy - lift)
                            .onGloballyPositioned {
                                onCardPos(card.id, it.positionInRoot() + Offset(it.size.width / 2f, it.size.height / 2f))
                            }
                            .graphicsLayer {
                                rotationZ = angle
                                transformOrigin = TransformOrigin(0.5f, 1.5f)
                                alpha = appear.value
                                translationY = (1f - appear.value) * fall
                                val sc = 0.7f + 0.3f * appear.value
                                scaleX = sc
                                scaleY = sc
                            }
                    ) {
                        PlayingCardView(
                            card = card,
                            width = cardW,
                            dim = enabled && !playable,
                            glow = playable,
                            onClick = { onPlay(card) }
                        )
                    }
                }
            }
        }
    }
}

@Suppress("unused")
private fun absF(x: Float) = abs(x)
