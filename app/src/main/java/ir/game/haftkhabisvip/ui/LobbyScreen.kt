package ir.game.haftkhabisvip.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ir.game.haftkhabisvip.GameSession
import ir.game.haftkhabisvip.model.Card
import ir.game.haftkhabisvip.model.Rank
import ir.game.haftkhabisvip.model.Suit

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = Color.White,
    unfocusedTextColor = Color.White,
    focusedBorderColor = Pal.Gold,
    unfocusedBorderColor = Color(0x66FFFFFF),
    focusedLabelColor = Pal.Gold,
    unfocusedLabelColor = Color(0xCCFFFFFF),
    cursorColor = Pal.Gold
)

@Composable
private fun Panel(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Box(
        modifier
            .fillMaxWidth()
            .background(Color(0x88062414), RoundedCornerShape(18.dp))
            .border(1.dp, Pal.Gold.copy(alpha = 0.35f), RoundedCornerShape(18.dp))
            .padding(16.dp)
    ) { content() }
}

@Composable
fun LobbyScreen(s: GameSession) {
    val hero = remember {
        listOf(
            Card(suit = Suit.SPADES, rank = Rank.ACE),
            Card(suit = Suit.HEARTS, rank = Rank.SEVEN),
            Card(suit = Suit.JOKER, rank = Rank.JOKER)
        )
    }
    Box(Modifier.fillMaxSize().background(feltBrush())) {
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) { MusicToggle() }
            // کارت‌های تزئینی
            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                Box(Modifier.height(130.dp).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    hero.forEachIndexed { i, c ->
                        PlayingCardView(
                            card = c, width = 70.dp,
                            modifier = Modifier.graphicsLayer {
                                rotationZ = (i - 1) * 14f
                                translationX = (i - 1) * 62.dp.toPx()
                                translationY = if (i == 1) -4.dp.toPx() else 6.dp.toPx()
                            }
                        )
                    }
                }
            }
            Text("هفت خبیث", fontSize = 38.sp, fontWeight = FontWeight.ExtraBold, color = Pal.Gold)
            Text("بازی چندنفره‌ی آفلاین با هات‌اسپات  •  ۲ تا ۷ نفر", color = Color.White.copy(alpha = 0.8f), fontSize = 13.sp, textAlign = TextAlign.Center)

            when (s.role) {
                GameSession.Role.NONE -> RoleChooser(s)
                GameSession.Role.HOST -> HostPanel(s)
                GameSession.Role.CLIENT -> ClientPanel(s)
            }
        }
    }
}

@Composable
private fun RoleChooser(s: GameSession) {
    Panel {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(
                value = s.playerName,
                onValueChange = { s.updateName(it) },
                label = { Text("نام شما در بازی") },
                singleLine = true,
                colors = fieldColors(),
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = s.roundsInput,
                onValueChange = { s.roundsInput = it.filter { ch -> ch.isDigit() }.take(2) },
                label = { Text("تعداد دست‌ها (۱ تا ۵۰) — فقط میزبان") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                colors = fieldColors(),
                modifier = Modifier.fillMaxWidth()
            )
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                PillButton("ساخت میز (میزبان)", { s.startHost() }, Modifier.weight(1f), fontSize = 14)
                PillButton("پیوستن به میز", { s.startClient() }, Modifier.weight(1f), container = Pal.Sky, content = Color.White, fontSize = 14)
            }
        }
    }
    Panel {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("راهنمای اتصال با هات‌اسپات", color = Pal.Gold, fontWeight = FontWeight.Bold)
            Text("۱. روی یکی از گوشی‌ها هات‌اسپات را روشن کنید و «ساخت میز» را بزنید.", color = Color.White, fontSize = 13.sp)
            Text("۲. بقیه به وای‌فایِ همان هات‌اسپات وصل شوند و «پیوستن به میز» را بزنند.", color = Color.White, fontSize = 13.sp)
            Text("۳. نیازی به اینترنت نیست؛ فقط هات‌اسپات باید روشن باشد.", color = Color.White, fontSize = 13.sp)
        }
    }
}

@Composable
private fun PlayerRow(name: String, tag: String? = null) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(Color(0x22FFFFFF), RoundedCornerShape(12.dp))
            .padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Avatar(name, 34.dp)
        Text(name, color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f), maxLines = 1)
        if (tag != null) Text(tag, color = Pal.Gold, fontSize = 12.sp)
    }
}

@Composable
private fun HostPanel(s: GameSession) {
    Panel {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("آی‌پی شما (برای اتصال دستی دوستان)", color = Pal.Gold, fontWeight = FontWeight.Bold)
            if (s.localIps.isEmpty()) {
                Text("هنوز آی‌پی پیدا نشد. هات‌اسپات را روشن کنید و «بروزرسانی» را بزنید.", color = Color.White, fontSize = 13.sp)
            } else {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                    s.localIps.forEach { ip ->
                        Text(ip, color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
            PillButton("بروزرسانی آی‌پی", { s.refreshIps() }, container = Color(0x33FFFFFF), content = Color.White)
        }
    }
    if (s.webPort != 0 && s.localIps.isNotEmpty()) {
        val webIp = s.localIps.firstOrNull { it.startsWith("192.168.") } ?: s.localIps.first()
        val webUrl = "http://$webIp:${s.webPort}"
        Panel {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("بازی با مرورگر (مثلاً آیفون)", color = Pal.Gold, fontWeight = FontWeight.Bold)
                Text(
                    "بازیکن مرورگری به همان وای‌فای وصل شود و این آدرس را در مرورگر باز کند، یا QR را اسکن کند. نیازی به نصب برنامه نیست.",
                    color = Color.White, fontSize = 13.sp, textAlign = TextAlign.Center
                )
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                    Text(webUrl, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }
                QrCode(webUrl, 170.dp)
            }
        }
    }
    Panel {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("بازیکنان (${s.lobbyNames.size}/7)", color = Pal.Gold, fontWeight = FontWeight.Bold)
            s.lobbyNames.forEachIndexed { i, n -> PlayerRow(n, if (i == 0) "میزبان" else null) }
            Spacer(Modifier.height(4.dp))
            PillButton(
                "شروع بازی (${s.lobbyNames.size} نفر)",
                { s.startGame() },
                Modifier.fillMaxWidth(),
                enabled = s.lobbyNames.size >= 2,
                container = Color(0xFF43A047), content = Color.White, fontSize = 15
            )
        }
    }
    PillButton("بازگشت", { s.leave() }, container = Color(0x33FFFFFF), content = Color.White)
}

@Composable
private fun ClientPanel(s: GameSession) {
    if (s.joined) {
        Panel {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("به میز پیوستید! منتظر شروع بازی توسط میزبان...", color = Pal.Mint, fontWeight = FontWeight.Bold)
                s.lobbyNames.forEachIndexed { i, n -> PlayerRow(n, if (i == 0) "میزبان" else null) }
            }
        }
        PillButton("خروج", { s.leave() }, container = Color(0x33FFFFFF), content = Color.White)
        return
    }

    Panel {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (s.searching) CircularProgressIndicator(Modifier.size(20.dp), color = Pal.Gold, strokeWidth = 2.dp)
                Text(
                    if (s.searching) "در حال جستجوی میز..." else if (s.foundHosts.isEmpty()) "میزی پیدا نشد" else "میزهای پیدا شده:",
                    color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f)
                )
                PillButton("جستجوی دوباره", { s.startSearch() }, enabled = !s.searching, container = Color(0x33FFFFFF), content = Color.White, fontSize = 12)
            }
            s.foundHosts.forEach { (ip, name) ->
                Row(
                    Modifier.fillMaxWidth().background(Color(0x22FFFFFF), RoundedCornerShape(12.dp)).padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Avatar(name, 34.dp)
                    Text("میزِ $name", color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f), maxLines = 1)
                    PillButton("اتصال", { s.connectTo(ip) }, enabled = !s.connecting, container = Pal.Sky, content = Color.White)
                }
            }
        }
    }
    Panel {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("اتصال مستقیم", color = Pal.Gold, fontWeight = FontWeight.Bold)
            PillButton(
                "اتصال خودکار به میزبانِ هات‌اسپات",
                { s.connectToGateway() },
                Modifier.fillMaxWidth(), enabled = !s.connecting, container = Pal.Sky, content = Color.White
            )
            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                OutlinedTextField(
                    value = s.manualIp,
                    onValueChange = { s.manualIp = it.filter { ch -> ch.isDigit() || ch == '.' }.take(15) },
                    label = { Text("یا آی‌پی میزبان را وارد کنید (مثلاً 192.168.43.1)") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    colors = fieldColors(),
                    modifier = Modifier.fillMaxWidth()
                )
            }
            PillButton("اتصال با آی‌پی", { s.connectTo(s.manualIp) }, Modifier.fillMaxWidth(), enabled = !s.connecting && s.manualIp.isNotBlank(), container = Color(0x33FFFFFF), content = Color.White)
            if (s.connecting) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(Modifier.size(18.dp), color = Pal.Gold, strokeWidth = 2.dp)
                    Text("در حال اتصال...", color = Color.White, fontSize = 13.sp)
                }
            }
        }
    }
    PillButton("بازگشت", { s.leave() }, container = Color(0x33FFFFFF), content = Color.White)
}
