package ir.game.haftkhabisvip

import android.app.Application
import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import ir.game.haftkhabisvip.audio.SoundEffects
import ir.game.haftkhabisvip.engine.GameEngine
import ir.game.haftkhabisvip.model.ClientIntent
import ir.game.haftkhabisvip.model.GameState
import ir.game.haftkhabisvip.network.LanNetworkManager
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** وضعیت کل برنامه (لابی، شبکه، بازی). با ViewModel نگه داشته می‌شود تا با تغییر تنظیمات گوشی اتصال قطع نشود. */
class GameSession(app: Application) : AndroidViewModel(app), LanNetworkManager.Listener {

    enum class Role { NONE, HOST, CLIENT }

    private val prefs = app.getSharedPreferences("haftkhabis_prefs", Context.MODE_PRIVATE)

    var playerName by mutableStateOf(
        prefs.getString("player_name", null)?.takeIf { it.isNotBlank() } ?: "بازیکن ۱"
    )
        private set
    var roundsInput by mutableStateOf("5")
    var manualIp by mutableStateOf("")

    var role by mutableStateOf(Role.NONE)
    var myId by mutableStateOf<String?>(null)
    var joined by mutableStateOf(false)
    var searching by mutableStateOf(false)
    var connecting by mutableStateOf(false)
    var reconnecting by mutableStateOf(false)
    var notice by mutableStateOf<String?>(null)
    var gameState by mutableStateOf<GameState?>(null)
    var showScoreboard by mutableStateOf(false)
    var scoreDismissedRound by mutableStateOf(-1)
    var localIps by mutableStateOf<List<String>>(emptyList())
    var webPort by mutableStateOf(0)

    val lobbyNames = mutableStateListOf<String>()
    val foundHosts = mutableStateMapOf<String, String>()
    val disconnectedIds = mutableStateListOf<String>()

    private val hostPlayers = mutableListOf<Pair<String, String>>()
    private var engine: GameEngine? = null
    private val net = LanNetworkManager(app, this)

    // برای اتصال دوباره‌ی کلاینت
    private var lastHostIp: String = ""
    private var myToken: String? = null
    private var reconnectJob: Job? = null

    /** نام بازیکن ذخیره می‌شود تا دفعه‌ی بعد دوباره تایپ نشود. */
    fun updateName(value: String) {
        playerName = value.take(20)
        prefs.edit().putString("player_name", playerName).apply()
    }

    // ------------------------------------------------------------ lobby actions

    fun startHost() {
        resetState()
        role = Role.HOST
        myId = "HOST"
        hostPlayers.add("HOST" to playerName.trim().ifEmpty { "میزبان" })
        refreshLobby()
        localIps = net.localIpv4()
        net.startHost(playerName)
    }

    fun refreshIps() {
        localIps = net.localIpv4()
    }

    fun startClient() {
        resetState()
        role = Role.CLIENT
        startSearch()
    }

    fun startSearch() {
        foundHosts.clear()
        searching = true
        net.discoverHosts()
    }

    fun connectTo(ip: String) {
        val target = ip.trim()
        if (target.isEmpty()) {
            notice = "آی‌پی میزبان را وارد کنید"
            return
        }
        lastHostIp = target
        connecting = true
        net.connect(target, playerName)
    }

    fun connectToGateway() {
        val gw = net.gatewayIp()
        if (gw == null) {
            notice = "به وای‌فای (هات‌اسپات میزبان) وصل نیستید"
        } else {
            connectTo(gw)
        }
    }

    fun leave() {
        net.stopAll()
        resetState()
    }

    private fun resetState() {
        reconnectJob?.cancel()
        reconnectJob = null
        reconnecting = false
        engine = null
        gameState = null
        role = Role.NONE
        myId = null
        myToken = null
        joined = false
        searching = false
        connecting = false
        showScoreboard = false
        scoreDismissedRound = -1
        lobbyNames.clear()
        foundHosts.clear()
        disconnectedIds.clear()
        hostPlayers.clear()
        webPort = 0
    }

    private fun refreshLobby() {
        val names = hostPlayers.map { it.second }
        lobbyNames.clear()
        lobbyNames.addAll(names)
        net.broadcastLobby(names)
    }

    // -------------------------------------------------------------- game actions

    fun startGame() {
        if (role != Role.HOST || hostPlayers.size !in 2..7) return
        val rounds = (roundsInput.toIntOrNull() ?: 5).coerceIn(1, 50)
        net.acceptingJoins = false
        disconnectedIds.clear()
        val e = GameEngine(hostPlayers.toList(), rounds)
        e.startNewRound()
        engine = e
        SoundEffects.playShuffle()
        publish()
    }

    fun send(intent: ClientIntent) {
        when (role) {
            Role.HOST -> {
                val e = engine ?: return
                if (e.processIntent("HOST", intent)) {
                    SoundEffects.playCardThrow()
                    publish()
                } else {
                    SoundEffects.playError()
                }
            }
            Role.CLIENT -> net.sendIntent(intent)
            Role.NONE -> {}
        }
    }

    fun nextRound() {
        if (role != Role.HOST) return
        SoundEffects.playShuffle()
        engine?.proceedToNextRound()
        publish()
    }

    fun hostSkipTurn() {
        if (role != Role.HOST) return
        engine?.skipCurrentTurn()
        publish()
    }

    private fun publish() {
        val e = engine ?: return
        val old = gameState
        val s = e.state
        gameState = s
        net.broadcastState(s)
        if (s.isRoundOver && old?.isRoundOver != true) {
            SoundEffects.playRoundWin()
        } else if (old != null && old.currentTurnIndex != s.currentTurnIndex &&
            s.players.getOrNull(s.currentTurnIndex)?.id == myId
        ) {
            SoundEffects.playTurnNotification()
        }
    }

    // --------------------------------------------------------- اتصال دوباره

    private fun startReconnect() {
        if (reconnectJob?.isActive == true) return
        reconnecting = true
        reconnectJob = viewModelScope.launch {
            var attempt = 0
            while (reconnecting && attempt < 40) {
                attempt++
                net.connect(lastHostIp, playerName, myId, myToken)
                delay(3000)
            }
            if (reconnecting) {
                net.stopAll()
                resetState()
                notice = "اتصال دوباره ناموفق بود"
            }
        }
    }

    // ------------------------------------------------------- network callbacks

    override fun onClientJoined(clientId: String, name: String) {
        if (role != Role.HOST) return
        hostPlayers.add(clientId to name)
        refreshLobby()
    }

    override fun onClientRejoined(clientId: String) {
        if (role != Role.HOST) return
        disconnectedIds.remove(clientId)
        val name = hostPlayers.firstOrNull { it.first == clientId }?.second ?: "بازیکن"
        notice = "$name دوباره وصل شد"
        engine?.state?.let { net.broadcastState(it) }
    }

    override fun onClientLeft(clientId: String) {
        if (role != Role.HOST) return
        if (engine == null) {
            hostPlayers.removeAll { it.first == clientId }
            refreshLobby()
        } else {
            if (clientId !in disconnectedIds) disconnectedIds.add(clientId)
            val name = hostPlayers.firstOrNull { it.first == clientId }?.second ?: "یک بازیکن"
            notice = "$name از بازی خارج شد (در انتظار اتصال دوباره)"
        }
    }

    override fun onIntent(clientId: String, intent: ClientIntent) {
        val e = engine ?: return
        if (e.processIntent(clientId, intent)) {
            SoundEffects.playCardThrow()
            publish()
        }
    }

    override fun onJoined(myId: String, token: String) {
        this.myId = myId
        myToken = token
        joined = true
        connecting = false
        searching = false
        if (reconnecting) {
            reconnecting = false
            reconnectJob?.cancel()
            reconnectJob = null
            notice = "دوباره به میز وصل شدید"
        }
    }

    override fun onLobby(names: List<String>) {
        lobbyNames.clear()
        lobbyNames.addAll(names)
    }

    override fun onState(state: GameState) {
        val old = gameState
        gameState = state
        if (state.isRoundOver && old?.isRoundOver != true) {
            SoundEffects.playRoundWin()
        } else if (old?.currentTurnIndex != state.currentTurnIndex &&
            state.players.getOrNull(state.currentTurnIndex)?.id == myId
        ) {
            SoundEffects.playTurnNotification()
        }
    }

    override fun onDisconnectedFromHost() {
        if (role != Role.CLIENT) return
        val st = gameState
        if (st != null && !st.isGameOver && myId != null && myToken != null && lastHostIp.isNotEmpty()) {
            // وسط بازی بودیم: به‌جای خروج، تلاش برای اتصال دوباره
            startReconnect()
        } else {
            net.stopAll()
            resetState()
            notice = "ارتباط با میزبان قطع شد"
        }
    }

    override fun onError(message: String) {
        if (reconnecting) return
        connecting = false
        searching = false
        notice = message
    }

    override fun onWebReady(port: Int) {
        if (role == Role.HOST) webPort = port
    }

    override fun onHostFound(ip: String, name: String) {
        foundHosts[ip] = name
    }

    override fun onDiscoveryFinished() {
        searching = false
    }

    override fun onCleared() {
        net.shutdown()
        super.onCleared()
    }
}
