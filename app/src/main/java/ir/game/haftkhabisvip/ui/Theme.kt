package ir.game.haftkhabisvip.ui

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp

object HK {
    val FeltLight = Color(0xFF218049)
    val FeltMid = Color(0xFF0F4D2B)
    val FeltDark = Color(0xFF082E19)
    val FeltDeep = Color(0xFF04170C)
    val Gold = Color(0xFFE2B84B)
    val GoldBright = Color(0xFFFFE08A)
    val GoldDeep = Color(0xFF9A6B12)
    val RedInk = Color(0xFFC62828)
    val BlackInk = Color(0xFF1B1B1F)
    val Cream = Color(0xFFFFFCF4)
    val CreamEdge = Color(0xFFF0E7D3)
    val Panel = Color(0xCC03130A)
}

/** عدد بین ۰ و ۱ که مدام نرم بالا و پایین می‌رود (برای درخشش نوبت). */
@Composable
fun pulseAlpha(): Float {
    val t = rememberInfiniteTransition(label = "pulse")
    return t.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(900, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "pulseValue"
    ).value
}

fun Int.fa(): String =
    toString().map { if (it in '0'..'9') '۰' + (it - '0') else it }.joinToString("")

/** پس‌زمینهٔ میز: نمد سبز، بافت ظریف، حاشیهٔ طلایی و حلقهٔ تزئینی. */
fun Modifier.feltBackground(): Modifier = this.drawBehind {
    drawRect(
        Brush.radialGradient(
            colors = listOf(HK.FeltLight, HK.FeltMid, HK.FeltDark, HK.FeltDeep),
            center = Offset(size.width / 2f, size.height * 0.45f),
            radius = size.maxDimension * 0.8f
        )
    )
    val gap = 5.dp.toPx()
    var y = 0f
    while (y < size.height) {
        drawLine(Color.White.copy(alpha = 0.018f), Offset(0f, y), Offset(size.width, y), 1f)
        y += gap
    }
    val inset = 6.dp.toPx()
    drawRoundRect(
        HK.Gold.copy(alpha = 0.35f),
        topLeft = Offset(inset, inset),
        size = Size(size.width - inset * 2, size.height - inset * 2),
        cornerRadius = CornerRadius(22.dp.toPx()),
        style = Stroke(1.5.dp.toPx())
    )
    drawOval(
        Color.White.copy(alpha = 0.05f),
        topLeft = Offset(size.width * 0.08f, size.height * 0.22f),
        size = Size(size.width * 0.84f, size.height * 0.46f),
        style = Stroke(2.dp.toPx())
    )
}
