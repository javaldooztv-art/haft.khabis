package ir.game.haftkhabisvip.audio

import android.media.AudioManager
import android.media.ToneGenerator

object SoundEffects {
    private val toneGen: ToneGenerator? by lazy {
        try {
            ToneGenerator(AudioManager.STREAM_MUSIC, 85)
        } catch (e: Exception) {
            null
        }
    }

    private fun tone(type: Int, ms: Int) {
        try {
            toneGen?.startTone(type, ms)
        } catch (e: Exception) {
        }
    }

    fun playCardThrow() = tone(ToneGenerator.TONE_PROP_BEEP, 60)
    fun playDrawCard() = tone(ToneGenerator.TONE_PROP_ACK, 90)
    fun playError() = tone(ToneGenerator.TONE_PROP_NACK, 200)
    fun playTurnNotification() = tone(ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD, 150)
    fun playRoundWin() = tone(ToneGenerator.TONE_CDMA_MED_L, 400)
    fun playShuffle() = tone(ToneGenerator.TONE_PROP_BEEP2, 180)
}
