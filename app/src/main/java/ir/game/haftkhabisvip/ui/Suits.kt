package ir.game.haftkhabisvip.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.unit.Dp
import ir.game.haftkhabisvip.model.Suit
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

// همه‌ی شکل‌ها در مربع واحد (۰ تا ۱) تعریف شده‌اند و موقع رسم مقیاس می‌گیرند.

private fun buildHeart(): Path = Path().apply {
    moveTo(0.5f, 0.95f)
    cubicTo(0.15f, 0.68f, 0.0f, 0.48f, 0.0f, 0.30f)
    cubicTo(0.0f, 0.12f, 0.14f, 0.02f, 0.27f, 0.02f)
    cubicTo(0.40f, 0.02f, 0.47f, 0.10f, 0.50f, 0.22f)
    cubicTo(0.53f, 0.10f, 0.60f, 0.02f, 0.73f, 0.02f)
    cubicTo(0.86f, 0.02f, 1.0f, 0.12f, 1.0f, 0.30f)
    cubicTo(1.0f, 0.48f, 0.85f, 0.68f, 0.5f, 0.95f)
    close()
}

private fun buildDiamond(): Path = Path().apply {
    moveTo(0.5f, 0.0f)
    lineTo(0.9f, 0.5f)
    lineTo(0.5f, 1.0f)
    lineTo(0.1f, 0.5f)
    close()
}

private fun buildSpade(): Path = Path().apply {
    moveTo(0.5f, 0.0f)
    cubicTo(0.62f, 0.2f, 1.0f, 0.38f, 1.0f, 0.60f)
    cubicTo(1.0f, 0.80f, 0.82f, 0.88f, 0.68f, 0.82f)
    cubicTo(0.64f, 0.80f, 0.58f, 0.76f, 0.56f, 0.72f)
    cubicTo(0.58f, 0.85f, 0.62f, 0.95f, 0.70f, 1.0f)
    lineTo(0.30f, 1.0f)
    cubicTo(0.38f, 0.95f, 0.42f, 0.85f, 0.44f, 0.72f)
    cubicTo(0.42f, 0.76f, 0.36f, 0.80f, 0.32f, 0.82f)
    cubicTo(0.18f, 0.88f, 0.0f, 0.80f, 0.0f, 0.60f)
    cubicTo(0.0f, 0.38f, 0.38f, 0.2f, 0.5f, 0.0f)
    close()
}

private fun buildClub(): Path = Path().apply {
    addOval(Rect(Offset(0.50f, 0.27f), 0.25f))
    addOval(Rect(Offset(0.25f, 0.65f), 0.25f))
    addOval(Rect(Offset(0.75f, 0.65f), 0.25f))
    addOval(Rect(Offset(0.50f, 0.50f), 0.15f))
    moveTo(0.47f, 0.55f)
    lineTo(0.36f, 1.0f)
    lineTo(0.64f, 1.0f)
    lineTo(0.53f, 0.55f)
    close()
}

private fun buildStar(): Path = Path().apply {
    val points = 5
    for (i in 0 until points * 2) {
        val r = if (i % 2 == 0) 0.5f else 0.22f
        val a = -PI / 2 + i * PI / points
        val x = 0.5f + (r * cos(a)).toFloat()
        val y = 0.52f + (r * sin(a)).toFloat()
        if (i == 0) moveTo(x, y) else lineTo(x, y)
    }
    close()
}

private val heartPath = buildHeart()
private val diamondPath = buildDiamond()
private val spadePath = buildSpade()
private val clubPath = buildClub()
private val starPath = buildStar()

fun unitPathFor(suit: Suit): Path = when (suit) {
    Suit.HEARTS -> heartPath
    Suit.DIAMONDS -> diamondPath
    Suit.CLUBS -> clubPath
    Suit.SPADES -> spadePath
    Suit.JOKER -> starPath
}

fun suitColor(suit: Suit): Color = if (suit.isRed) Pal.CardRed else Pal.CardBlack

fun DrawScope.drawSuit(
    suit: Suit,
    topLeft: Offset,
    size: Float,
    color: Color,
    rotated: Boolean = false
) {
    withTransform({
        translate(topLeft.x, topLeft.y)
        if (rotated) rotate(180f, Offset(size / 2f, size / 2f))
        scale(size, size, Offset.Zero)
    }) {
        drawPath(unitPathFor(suit), color)
    }
}

@Composable
fun SuitIcon(suit: Suit, iconSize: Dp, modifier: Modifier = Modifier, color: Color = suitColor(suit)) {
    Canvas(modifier.size(iconSize)) {
        drawSuit(suit, Offset.Zero, this.size.minDimension, color)
    }
}
