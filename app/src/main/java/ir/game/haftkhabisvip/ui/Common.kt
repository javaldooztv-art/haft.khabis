package ir.game.haftkhabisvip.ui

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.abs

fun feltBrush(): Brush = Brush.radialGradient(
    0f to Pal.FeltLight,
    0.55f to Pal.FeltMid,
    1f to Pal.FeltEdge
)

@Composable
fun PillButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    container: Color = Pal.Gold,
    content: Color = Color(0xFF3B2A00),
    fontSize: Int = 13
) {
    val bg = if (enabled) container else container.copy(alpha = 0.3f)
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(bg)
            .then(if (enabled) Modifier.clickable { onClick() } else Modifier)
            .padding(horizontal = 16.dp, vertical = 9.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text,
            color = if (enabled) content else content.copy(alpha = 0.5f),
            fontWeight = FontWeight.Bold,
            fontSize = fontSize.sp,
            textAlign = TextAlign.Center
        )
    }
}

private val avatarColors = listOf(
    Color(0xFFE57373), Color(0xFF64B5F6), Color(0xFFBA68C8),
    Color(0xFFFFB74D), Color(0xFF4DB6AC), Color(0xFFA1887F)
)

@Composable
fun Avatar(name: String, size: Dp, ringColor: Color? = null, modifier: Modifier = Modifier) {
    val base = avatarColors[abs(name.hashCode()) % avatarColors.size]
    val initial = name.trim().firstOrNull()?.toString() ?: "؟"
    Box(
        modifier = modifier
            .size(size)
            .background(Brush.linearGradient(listOf(base, base.copy(alpha = 0.65f))), CircleShape)
            .then(if (ringColor != null) Modifier.border(3.dp, ringColor, CircleShape) else Modifier.border(1.5.dp, Color(0x66FFFFFF), CircleShape)),
        contentAlignment = Alignment.Center
    ) {
        Text(initial, color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = (size.value * 0.45f).sp)
    }
}

@Composable
fun pulse(from: Float = 0.35f, to: Float = 1f, ms: Int = 800): Float {
    val t = rememberInfiniteTransition(label = "pulse")
    val v by t.animateFloat(
        initialValue = from,
        targetValue = to,
        animationSpec = infiniteRepeatable(tween(ms, easing = LinearEasing), RepeatMode.Reverse),
        label = "pulseValue"
    )
    return v
}


@Composable
fun MusicToggle(modifier: Modifier = Modifier) {
    PillButton(
        text = if (ir.game.haftkhabisvip.audio.MusicPlayer.enabled) "🔊" else "🔇",
        onClick = { ir.game.haftkhabisvip.audio.MusicPlayer.toggle() },
        modifier = modifier,
        container = Color(0x33FFFFFF),
        content = Color.White,
        fontSize = 15
    )
}
