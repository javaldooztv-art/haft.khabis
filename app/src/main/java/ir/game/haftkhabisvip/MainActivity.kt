package ir.game.haftkhabisvip

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ir.game.haftkhabisvip.audio.MusicPlayer
import ir.game.haftkhabisvip.ui.GameTableScreen
import ir.game.haftkhabisvip.ui.LobbyScreen
import ir.game.haftkhabisvip.ui.Pal
import ir.game.haftkhabisvip.ui.PillButton
import ir.game.haftkhabisvip.ui.ScoreboardDialog
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {
    private val session: GameSession by viewModels()

    override fun onResume() {
        super.onResume()
        MusicPlayer.resume()
    }

    override fun onPause() {
        MusicPlayer.pause()
        super.onPause()
    }

    override fun onDestroy() {
        if (isFinishing) MusicPlayer.release()
        super.onDestroy()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        MusicPlayer.init(this)
        @Suppress("DEPRECATION")
        run {
            window.statusBarColor = 0xFF031509.toInt()
            window.navigationBarColor = 0xFF031509.toInt()
        }
        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(primary = Pal.Gold, onPrimary = Color.Black, surface = Pal.Panel)
            ) {
                // رابط فارسی است؛ کل برنامه راست‌به‌چپ (کارت‌ها جداگانه چپ‌به‌راست‌اند)
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    HaftKhabisApp(session)
                }
            }
        }
    }
}

@Composable
fun HaftKhabisApp(s: GameSession) {
    var confirmLeave by remember { mutableStateOf(false) }
    val state = s.gameState

    BackHandler(enabled = s.role != GameSession.Role.NONE) {
        if (state != null) confirmLeave = true else s.leave()
    }

    Box(Modifier.fillMaxSize()) {
        if (state == null) {
            LobbyScreen(s)
        } else {
            val myPlayer = state.players.find { it.id == s.myId } ?: state.players.first()
            val isHost = s.role == GameSession.Role.HOST

            GameTableScreen(
                state = state,
                myPlayer = myPlayer,
                isHost = isHost,
                disconnectedIds = s.disconnectedIds,
                onSendIntent = { s.send(it) },
                onShowScores = { s.showScoreboard = true },
                onSkipTurn = { s.hostSkipTurn() },
                onLeave = { confirmLeave = true }
            )

            val showScores = s.showScoreboard || (state.isRoundOver && s.scoreDismissedRound != state.currentRound)
            if (showScores) {
                ScoreboardDialog(
                    state = state,
                    myId = s.myId,
                    isHost = isHost,
                    onDismiss = {
                        s.showScoreboard = false
                        if (state.isRoundOver) s.scoreDismissedRound = state.currentRound
                    },
                    onNextRound = {
                        s.showScoreboard = false
                        s.nextRound()
                    },
                    onExit = { s.leave() }
                )
            }
        }

        if (s.reconnecting) {
            ReconnectOverlay(onExit = { s.leave() })
        }

        NoticeToast(s.notice) { s.notice = null }
    }

    if (confirmLeave) {
        AlertDialog(
            onDismissRequest = { confirmLeave = false },
            containerColor = Pal.Panel,
            titleContentColor = Pal.Gold,
            textContentColor = Color.White,
            title = { Text("خروج از بازی؟", fontWeight = FontWeight.Bold) },
            text = { Text("اگر خارج شوید ارتباط شما با میز قطع می‌شود.") },
            confirmButton = {
                PillButton("خروج", { confirmLeave = false; s.leave() }, container = Pal.Ruby, content = Color.White)
            },
            dismissButton = {
                PillButton("ادامه بازی", { confirmLeave = false }, container = Color(0x33FFFFFF), content = Color.White)
            }
        )
    }
}

@Composable
private fun NoticeToast(message: String?, onDone: () -> Unit) {
    LaunchedEffect(message) {
        if (message != null) {
            delay(4500)
            onDone()
        }
    }
    Box(Modifier.fillMaxSize().padding(top = 28.dp), contentAlignment = Alignment.TopCenter) {
        AnimatedVisibility(
            visible = message != null,
            enter = slideInVertically { -it } + fadeIn(),
            exit = slideOutVertically { -it } + fadeOut()
        ) {
            Box(
                Modifier
                    .padding(horizontal = 20.dp)
                    .background(Color(0xEE000000), RoundedCornerShape(16.dp))
                    .padding(horizontal = 16.dp, vertical = 10.dp)
            ) {
                Text(message ?: "", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}


@Composable
private fun ReconnectOverlay(onExit: () -> Unit) {
    Box(
        Modifier
            .fillMaxSize()
            .background(Color(0xCC000000))
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) { },
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.padding(24.dp)
        ) {
            CircularProgressIndicator(color = Pal.Gold)
            Text("ارتباط با میزبان قطع شد", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 17.sp)
            Text(
                "در حال اتصال دوباره... دست و امتیاز شما حفظ می‌شود.",
                color = Color(0xFFB0BEC5), fontSize = 13.sp
            )
            PillButton("خروج از بازی", onExit, container = Pal.Ruby, content = Color.White)
        }
    }
}
