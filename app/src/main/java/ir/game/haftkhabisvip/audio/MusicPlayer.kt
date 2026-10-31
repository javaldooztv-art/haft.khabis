package ir.game.haftkhabisvip.audio

import android.content.Context
import android.media.MediaPlayer
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import ir.game.haftkhabisvip.R

/** موسیقی پس‌زمینه (فایل res/raw/bg_music.mp3). روشن/خاموش بودن در حافظه‌ی برنامه ذخیره می‌شود. */
object MusicPlayer {
    private const val PREFS = "haftkhabis_prefs"
    private const val KEY_ON = "music_on"

    private var player: MediaPlayer? = null
    private var appContext: Context? = null

    var enabled by mutableStateOf(true)
        private set

    fun init(context: Context) {
        if (appContext != null) return
        val ctx = context.applicationContext
        appContext = ctx
        enabled = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ON, true)
        try {
            val mp = MediaPlayer.create(ctx, R.raw.bg_music)
            if (mp != null) {
                mp.isLooping = true
                mp.setVolume(0.35f, 0.35f)
                player = mp
            }
        } catch (e: Exception) {
            player = null
        }
    }

    fun resume() {
        if (!enabled) return
        try {
            val p = player ?: return
            if (!p.isPlaying) p.start()
        } catch (e: Exception) {
        }
    }

    fun pause() {
        try {
            val p = player ?: return
            if (p.isPlaying) p.pause()
        } catch (e: Exception) {
        }
    }

    fun toggle() {
        enabled = !enabled
        appContext?.getSharedPreferences(PREFS, Context.MODE_PRIVATE)?.edit()?.putBoolean(KEY_ON, enabled)?.apply()
        if (enabled) resume() else pause()
    }

    fun release() {
        try {
            player?.release()
        } catch (e: Exception) {
        }
        player = null
        appContext = null
    }
}
