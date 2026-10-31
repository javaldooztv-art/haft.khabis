package ir.game.haftkhabisvip.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

enum class ButtonKind { GOLD, BLUE, RED, GREEN, GHOST }

@Composable
fun FancyButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    kind: ButtonKind = ButtonKind.GOLD
) {
    val (top, bottom, fg) = when (kind) {
        ButtonKind.GOLD -> Triple(Color(0xFFFFE08A), Color(0xFFD4A22E), Color(0xFF2B1B00))
        ButtonKind.BLUE -> Triple(Color(0xFF4A90E2), Color(0xFF1E5BB8), Color.White)
        ButtonKind.RED -> Triple(Color(0xFFEF5350), Color(0xFFB71C1C), Color.White)
        ButtonKind.GREEN -> Triple(Color(0xFF66BB6A), Color(0xFF2E7D32), Color.White)
        ButtonKind.GHOST -> Triple(Color(0x22FFFFFF), Color(0x11FFFFFF), Color.White)
    }
    val shape = RoundedCornerShape(16.dp)
    Box(
        modifier
            .clip(shape)
            .background(Brush.verticalGradient(listOf(top, bottom)))
            .border(1.dp, Color.White.copy(alpha = if (kind == ButtonKind.GHOST) 0.3f else 0.35f), shape)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 13.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text,
            color = if (enabled) fg else fg.copy(alpha = 0.45f),
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun GlassPanel(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    val shape = RoundedCornerShape(20.dp)
    Column(
        modifier
            .fillMaxWidth()
            .clip(shape)
            .background(HK.Panel)
            .border(1.dp, HK.Gold.copy(alpha = 0.35f), shape)
            .padding(16.dp),
        content = content
    )
}

private val avatarColors = listOf(
    0xFFEF6C00, 0xFF8E24AA, 0xFF00897B, 0xFF3949AB, 0xFFC62828, 0xFF6D4C41, 0xFF039BE5
)

@Composable
fun AvatarCircle(name: String, size: Dp, ring: Color = Color.White.copy(alpha = 0.3f), ringWidth: Dp = 1.5.dp) {
    val base = Color(avatarColors[Math.floorMod(name.hashCode(), avatarColors.size)])
    Box(
        Modifier
            .size(size)
            .clip(CircleShape)
            .background(Brush.verticalGradient(listOf(lerp(base, Color.White, 0.3f), base)))
            .border(ringWidth, ring, CircleShape),
        contentAlignment = Alignment.Center
    ) {
        Text(
            name.trim().take(1).ifEmpty { "؟" },
            color = Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = (size.value * 0.42f).sp
        )
    }
}

@Composable
fun StatusPill(text: String, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(50)
    Box(
        modifier
            .clip(shape)
            .background(Color(0xAA000000))
            .border(1.dp, HK.Gold.copy(alpha = 0.5f), shape)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text,
            color = HK.GoldBright,
            fontWeight = FontWeight.Bold,
            fontSize = 13.sp,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
    }
}
