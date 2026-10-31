package ir.game.haftkhabisvip.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ir.game.haftkhabisvip.model.Card
import ir.game.haftkhabisvip.model.GameState
import ir.game.haftkhabisvip.model.Player
import ir.game.haftkhabisvip.model.Suit

@Composable
fun SuitSelectionDialog(
    canDeclareTak: Boolean = false,
    onDeclareTak: () -> Unit = {},
    onSelectSuit: (Suit) -> Unit
) {
    AlertDialog(
        onDismissRequest = {},
        containerColor = Pal.Panel,
        titleContentColor = Pal.Gold,
        title = { Text("خال حکم را انتخاب کنید", fontWeight = FontWeight.Bold, fontSize = 17.sp) },
        text = {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                listOf(Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS, Suit.SPADES).forEach { suit ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(
                            Modifier
                                .size(58.dp)
                                .background(Pal.Ivory, CircleShape)
                                .border(2.dp, Pal.Gold, CircleShape)
                                .clickable { onSelectSuit(suit) },
                            contentAlignment = Alignment.Center
                        ) { SuitIcon(suit, 30.dp) }
                        Text(suit.title, color = Color.White, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
                    }
                }
            }
        },
        confirmButton = {
            if (canDeclareTak) {
                PillButton("اعلام تک کارت!", onDeclareTak, container = Color(0xFFD32F2F), content = Color.White)
            }
        }
    )
}

@Composable
fun GiveCardPenaltyDialog(
    myHand: List<Card>,
    otherPlayers: List<Player>,
    canDeclareTak: Boolean = false,
    onDeclareTak: () -> Unit = {},
    onConfirm: (cardId: String, targetPlayerId: String) -> Unit
) {
    var selectedCardId by remember { mutableStateOf(myHand.firstOrNull()?.id ?: "") }
    var selectedPlayerId by remember { mutableStateOf(otherPlayers.firstOrNull()?.id ?: "") }

    AlertDialog(
        onDismissRequest = {},
        containerColor = Pal.Panel,
        titleContentColor = Pal.Gold,
        textContentColor = Color.White,
        title = { Text("جریمه کارت ۲: یک کارت به یک نفر بدهید", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("۱. کارت را انتخاب کنید:")
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), contentPadding = androidx.compose.foundation.layout.PaddingValues(vertical = 14.dp)) {
                    items(sortHand(myHand), key = { it.id }) { c ->
                        PlayingCardView(
                            card = c,
                            width = 56.dp,
                            glow = selectedCardId == c.id,
                            modifier = Modifier.padding(top = if (selectedCardId == c.id) 0.dp else 8.dp),
                            onClick = { selectedCardId = c.id }
                        )
                    }
                }
                Text("۲. بازیکن مقصد:")
                otherPlayers.forEach { p ->
                    FilterChip(
                        selected = selectedPlayerId == p.id,
                        onClick = { selectedPlayerId = p.id },
                        label = { Text("${p.name} (${p.hand.size} کارت)") }
                    )
                }
            }
        },
        confirmButton = {
            PillButton("ارسال کارت جریمه", {
                if (selectedCardId.isNotEmpty() && selectedPlayerId.isNotEmpty()) onConfirm(selectedCardId, selectedPlayerId)
            })
        },
        dismissButton = {
            if (canDeclareTak) {
                PillButton("اعلام تک کارت!", onDeclareTak, container = Color(0xFFD32F2F), content = Color.White)
            }
        }
    )
}

@Composable
fun ScoreboardDialog(
    state: GameState,
    myId: String?,
    isHost: Boolean,
    onDismiss: () -> Unit,
    onNextRound: () -> Unit,
    onExit: () -> Unit
) {
    val sorted = state.players.sortedBy { it.totalScore }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Pal.Panel,
        titleContentColor = Pal.Gold,
        textContentColor = Color.White,
        title = {
            Text(
                if (state.isGameOver) "🏆 نتیجه نهایی (کمترین امتیاز برنده است)"
                else "جدول امتیازات (دست ${state.currentRound} از ${state.totalRounds})",
                fontWeight = FontWeight.Bold, fontSize = 16.sp
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (state.isGameOver) {
                    val best = state.players.minOf { it.totalScore }
                    val winners = state.players.filter { it.totalScore == best }.joinToString(" و ") { it.name }
                    val grow = pulse(0.9f, 1.05f, 700)
                    Text(
                        if (winners.contains(" و ")) "🎉 هووورا $winners برنده شدند! 🎉" else "🎉 هووورا $winners برنده شد! 🎉",
                        color = Pal.Gold,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 20.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .graphicsLayer { scaleX = grow; scaleY = grow }
                            .padding(vertical = 6.dp)
                    )
                } else if (state.isRoundOver) {
                    Text(state.statusMessage, color = Color(0xFFFFE082), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
                sorted.forEachIndexed { idx, p ->
                    val medal = when (idx) { 0 -> "🥇"; 1 -> "🥈"; 2 -> "🥉"; else -> "${idx + 1}." }
                    val mine = p.id == myId
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .background(if (mine) Color(0x33FFD54F) else Color(0x22FFFFFF), RoundedCornerShape(12.dp))
                            .padding(horizontal = 10.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(medal, fontSize = 18.sp)
                        Avatar(p.name, 30.dp)
                        Column(Modifier.weight(1f)) {
                            Text(p.name, fontWeight = FontWeight.Bold, fontSize = 14.sp, maxLines = 1)
                            Text("این دست: \u200E${p.lastRoundScore}", fontSize = 11.sp, color = Color(0xFFB0BEC5))
                        }
                        Text("\u200E${p.totalScore}", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = Pal.Gold)
                    }
                }
            }
        },
        confirmButton = {
            when {
                state.isGameOver -> PillButton("بازگشت به منو", onExit)
                state.isRoundOver && isHost -> PillButton("شروع دست بعدی", onNextRound)
                state.isRoundOver -> PillButton("بستن (منتظر میزبان)", onDismiss, container = Color(0x55FFFFFF), content = Color.White)
                else -> PillButton("بستن", onDismiss)
            }
        }
    )
}
