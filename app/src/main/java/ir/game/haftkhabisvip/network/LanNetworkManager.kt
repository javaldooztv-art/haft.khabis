package ir.game.haftkhabisvip.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.os.Handler
import android.os.Looper
import ir.game.haftkhabisvip.R
import ir.game.haftkhabisvip.model.ClientIntent
import ir.game.haftkhabisvip.model.GameState
import ir.game.haftkhabisvip.model.Suit
import ir.game.haftkhabisvip.model.maskedFor
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.BufferedReader
import java.io.BufferedWriter
import java.io.IOException
import java.io.InputStreamReader
import java.io.OutputStream
import java.io.OutputStreamWriter
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.Inet4Address
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.ServerSocket
import java.net.Socket
import java.net.SocketTimeoutException
import java.net.URLDecoder
import java.util.Collections
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

/**
 * شبکه‌ی بازی روی وای‌فای / هات‌اسپات (سوکت TCP ساده، بدون نیاز به سرویس‌های گوگل).
 * میزبان: ServerSocket روی پورت ثابت + پاسخ به جستجوی UDP
 * کلاینت: اتصال به آی‌پی میزبان (گیت‌وی هات‌اسپات، جستجوی خودکار یا دستی)
 * اتصال دوباره: کلاینت با شناسه و توکنی که در بار اول گرفته، در وسط بازی دوباره وارد می‌شود.
 */
class LanNetworkManager(context: Context, private val listener: Listener) {

    interface Listener {
        fun onClientJoined(clientId: String, name: String)
        fun onClientRejoined(clientId: String)
        fun onClientLeft(clientId: String)
        fun onIntent(clientId: String, intent: ClientIntent)
        fun onJoined(myId: String, token: String)
        fun onLobby(names: List<String>)
        fun onState(state: GameState)
        fun onDisconnectedFromHost()
        fun onError(message: String)
        fun onHostFound(ip: String, name: String)
        fun onDiscoveryFinished()
        fun onWebReady(port: Int) {}
    }

    companion object {
        const val TCP_PORT = 47821
        const val UDP_PORT = 47822
        private const val DISCOVER_MSG = "HK_DISCOVER"
        private const val HOST_MSG = "HK_HOST:"
        private const val MAX_CLIENTS = 6
        private const val SEP = '\u001F'
        private const val PING_INTERVAL_MS = 5000L
        private const val CLIENT_TIMEOUT_MS = 15000
    }

    /** isWeb=true یعنی بازیکن از مرورگر (جریان رویدادهای SSE) وصل است. */
    private class ClientConn(
        val id: String,
        val name: String,
        val socket: Socket,
        val writer: BufferedWriter,
        val isWeb: Boolean = false
    )

    private class Admission(val id: String, val token: String, val isRejoin: Boolean)

    private val appContext = context.applicationContext
    private val main = Handler(Looper.getMainLooper())
    private val json = Json { ignoreUnknownKeys = true }
    private val webJson = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val pool: ExecutorService = Executors.newCachedThreadPool()
    private val sender: ExecutorService = Executors.newSingleThreadExecutor()

    private val clients = ConcurrentHashMap<String, ClientConn>()
    private val tokens = ConcurrentHashMap<String, String>()
    private val idCounter = AtomicInteger(0)
    @Volatile private var hostRunning = false
    @Volatile var acceptingJoins = true
    private var serverSocket: ServerSocket? = null
    private var discoveryResponder: DatagramSocket? = null
    private var httpServer: ServerSocket? = null
    @Volatile var httpPort = 0
        private set
    private val musicBytes: ByteArray by lazy {
        appContext.resources.openRawResource(R.raw.bg_music).use { it.readBytes() }
    }

    @Volatile private var clientSocket: Socket? = null
    @Volatile private var clientWriter: BufferedWriter? = null
    @Volatile private var clientToken: Any? = null

    private fun post(block: () -> Unit) {
        main.post { block() }
    }

    private fun clean(name: String): String =
        name.replace(Regex("[\\r\\n\\u001F]"), " ").trim().take(20).ifEmpty { "بازیکن" }

    // ------------------------------------------------------------------ host

    fun startHost(hostName: String) {
        stopHost()
        hostRunning = true
        acceptingJoins = true
        val safeName = clean(hostName)

        pool.execute {
            try {
                val ss = ServerSocket()
                ss.reuseAddress = true
                ss.bind(InetSocketAddress(TCP_PORT))
                serverSocket = ss
                while (hostRunning) {
                    val s = ss.accept()
                    pool.execute { handleClient(s) }
                }
            } catch (e: Exception) {
                if (hostRunning) post { listener.onError("راه‌اندازی میزبان ناموفق بود: ${e.message}") }
            }
        }
        pool.execute { runDiscoveryResponder(safeName) }
        startHttpServer()
        pool.execute {
            // ضربان: کلاینت‌ها با نرسیدن آن می‌فهمند ارتباط قطع شده است
            while (hostRunning) {
                try {
                    Thread.sleep(PING_INTERVAL_MS)
                } catch (e: InterruptedException) {
                    break
                }
                if (hostRunning) {
                    clients.values.forEach { c ->
                        send(c, if (c.isWeb) "event: ping\ndata: 1\n" else "PING:")
                    }
                }
            }
        }
    }

    private fun runDiscoveryResponder(hostName: String) {
        try {
            val ds = DatagramSocket(null)
            ds.reuseAddress = true
            ds.bind(InetSocketAddress(UDP_PORT))
            discoveryResponder = ds
            val buf = ByteArray(256)
            while (hostRunning) {
                val p = DatagramPacket(buf, buf.size)
                ds.receive(p)
                val msg = String(p.data, 0, p.length, Charsets.UTF_8)
                if (msg == DISCOVER_MSG) {
                    val reply = (HOST_MSG + hostName).toByteArray(Charsets.UTF_8)
                    ds.send(DatagramPacket(reply, reply.size, p.address, p.port))
                }
            }
        } catch (e: Exception) {
            // سوکت بسته شد یا پورت در دسترس نبود؛ اتصال مستقیم با آی‌پی همچنان کار می‌کند
        }
    }

    private fun handleClient(s: Socket) {
        var conn: ClientConn? = null
        try {
            s.tcpNoDelay = true
            val reader = BufferedReader(InputStreamReader(s.getInputStream(), Charsets.UTF_8))
            val writer = BufferedWriter(OutputStreamWriter(s.getOutputStream(), Charsets.UTF_8))

            s.soTimeout = 5000
            val hello = reader.readLine()
            s.soTimeout = 0
            if (hello == null || !hello.startsWith("HELLO:")) {
                s.close()
                return
            }
            val fields = hello.removePrefix("HELLO:").split(SEP)
            val name = clean(fields[0])
            val rejoinId = fields.getOrNull(1)?.takeIf { it.isNotEmpty() }
            val rejoinToken = fields.getOrNull(2)?.takeIf { it.isNotEmpty() }

            val adm = admit(rejoinId, rejoinToken)
            if (adm == null) {
                writer.write("FULL:")
                writer.newLine()
                writer.flush()
                s.close()
                return
            }
            val id = adm.id
            val token = adm.token
            val isRejoin = adm.isRejoin

            val c = ClientConn(id, name, s, writer)
            conn = c
            val old = clients.put(id, c)
            if (old != null) {
                try { old.socket.close() } catch (e: Exception) { }
            }
            send(c, "WELCOME:$id$SEP$token")
            if (isRejoin) post { listener.onClientRejoined(id) } else post { listener.onClientJoined(id, name) }

            while (true) {
                val line = reader.readLine() ?: break
                if (line.startsWith("INTENT:")) {
                    val intent = json.decodeFromString(ClientIntent.serializer(), line.removePrefix("INTENT:"))
                    post { listener.onIntent(id, intent) }
                }
            }
        } catch (e: Exception) {
            // اتصال قطع شد
        } finally {
            val c = conn
            if (c != null && clients.remove(c.id, c)) {
                post { listener.onClientLeft(c.id) }
            }
            try { s.close() } catch (e: Exception) { }
        }
    }

    private fun admit(rejoinId: String?, rejoinToken: String?): Admission? {
        // اتصال دوباره فقط وقتی بازی شروع شده و شناسه + توکن درست باشد
        val isRejoin = rejoinId != null && rejoinToken != null && !acceptingJoins &&
            tokens[rejoinId] == rejoinToken
        if (!isRejoin && (!acceptingJoins || clients.size >= MAX_CLIENTS)) return null
        if (isRejoin) return Admission(rejoinId!!, rejoinToken!!, true)
        val id = "P${idCounter.incrementAndGet()}"
        val token = UUID.randomUUID().toString().replace("-", "").take(12)
        tokens[id] = token
        return Admission(id, token, false)
    }

    // ------------------------------------------------- وب (مرورگر / آیفون)

    private fun startHttpServer() {
        pool.execute {
            var bound: ServerSocket? = null
            for (p in intArrayOf(8080, 8081, 8082, 8888)) {
                try {
                    val t = ServerSocket()
                    t.reuseAddress = true
                    t.bind(InetSocketAddress(p))
                    bound = t
                    break
                } catch (e: Exception) {
                }
            }
            val server = bound
            if (server == null) {
                post { listener.onError("سرور وب راه‌اندازی نشد (پورت‌ها اشغال‌اند)") }
                return@execute
            }
            httpServer = server
            httpPort = server.localPort
            val port = server.localPort
            post { listener.onWebReady(port) }
            try {
                while (hostRunning) {
                    val s = server.accept()
                    pool.execute { handleHttp(s) }
                }
            } catch (e: Exception) {
                // سرور بسته شد
            }
        }
    }

    private fun parseQuery(raw: String): Map<String, String> {
        val map = HashMap<String, String>()
        if (raw.isEmpty()) return map
        for (pair in raw.split('&')) {
            val k = pair.substringBefore('=')
            val v = pair.substringAfter('=', "")
            try {
                map[URLDecoder.decode(k, "UTF-8")] = URLDecoder.decode(v, "UTF-8")
            } catch (e: Exception) {
            }
        }
        return map
    }

    private fun respond(out: OutputStream, code: Int, type: String, body: ByteArray, cache: String = "no-cache") {
        val status = when (code) {
            200 -> "OK"
            400 -> "Bad Request"
            403 -> "Forbidden"
            404 -> "Not Found"
            else -> "OK"
        }
        val head = "HTTP/1.1 $code $status\r\nContent-Type: $type\r\nContent-Length: ${body.size}\r\n" +
            "Cache-Control: $cache\r\nConnection: close\r\n\r\n"
        out.write(head.toByteArray(Charsets.UTF_8))
        out.write(body)
        out.flush()
    }

    private fun handleHttp(s: Socket) {
        try {
            s.soTimeout = 8000
            s.tcpNoDelay = true
            val reader = BufferedReader(InputStreamReader(s.getInputStream(), Charsets.UTF_8))
            val requestLine = reader.readLine() ?: return
            val parts = requestLine.split(" ")
            if (parts.size < 2) return
            val method = parts[0]
            val target = parts[1]
            var contentLength = 0
            var range: String? = null
            while (true) {
                val h = reader.readLine() ?: break
                if (h.isEmpty()) break
                if (h.startsWith("content-length:", ignoreCase = true)) {
                    contentLength = h.substring(15).trim().toIntOrNull() ?: 0
                } else if (h.startsWith("range:", ignoreCase = true)) {
                    range = h.substring(6).trim()
                }
            }
            val path = target.substringBefore('?')
            val query = parseQuery(target.substringAfter('?', ""))
            val out = s.getOutputStream()

            when {
                method == "GET" && (path == "/" || path == "/index.html") -> {
                    val bytes = appContext.assets.open("web/index.html").use { it.readBytes() }
                    respond(out, 200, "text/html; charset=utf-8", bytes)
                }
                method == "GET" && path.startsWith("/cards/") -> {
                    val name = path.removePrefix("/cards/").removeSuffix(".png")
                    val id = if (Regex("^[a-z0-9_]+$").matches(name)) {
                        appContext.resources.getIdentifier(name, "drawable", appContext.packageName)
                    } else 0
                    if (id == 0) {
                        respond(out, 404, "text/plain", "not found".toByteArray())
                    } else {
                        val bytes = appContext.resources.openRawResource(id).use { it.readBytes() }
                        respond(out, 200, "image/png", bytes, "max-age=86400")
                    }
                }
                method == "GET" && path == "/bg_music.mp3" -> serveMusic(out, range)
                method == "GET" && path == "/events" -> handleSse(s, query)
                method == "POST" && path == "/intent" -> {
                    val buf = CharArray(minOf(contentLength, 4096))
                    var read = 0
                    while (read < buf.size) {
                        val n = reader.read(buf, read, buf.size - read)
                        if (n < 0) break
                        read += n
                    }
                    val code = handleWebIntent(query, String(buf, 0, read))
                    respond(out, code, "text/plain", "ok".toByteArray())
                }
                else -> respond(out, 404, "text/plain", "not found".toByteArray())
            }
        } catch (e: Exception) {
            // اتصال مرورگر قطع شد
        } finally {
            try { s.close() } catch (e: Exception) { }
        }
    }

    /** Safari برای پخش صدا حتماً درخواست بازه‌ای (Range) می‌فرستد. */
    private fun serveMusic(out: OutputStream, range: String?) {
        val data = musicBytes
        var start = 0
        var end = data.size - 1
        var partial = false
        if (range != null && range.startsWith("bytes=")) {
            val spec = range.removePrefix("bytes=").substringBefore(',')
            val a = spec.substringBefore('-')
            val b = spec.substringAfter('-', "")
            if (a.isNotEmpty()) {
                start = a.toIntOrNull() ?: 0
                if (b.isNotEmpty()) end = b.toIntOrNull() ?: end
            } else if (b.isNotEmpty()) {
                start = maxOf(0, data.size - (b.toIntOrNull() ?: 0))
            }
            start = start.coerceIn(0, data.size - 1)
            end = end.coerceIn(start, data.size - 1)
            partial = true
        }
        val len = end - start + 1
        val head = StringBuilder()
        head.append(if (partial) "HTTP/1.1 206 Partial Content\r\n" else "HTTP/1.1 200 OK\r\n")
        head.append("Content-Type: audio/mpeg\r\nAccept-Ranges: bytes\r\nContent-Length: $len\r\n")
        if (partial) head.append("Content-Range: bytes $start-$end/${data.size}\r\n")
        head.append("Connection: close\r\n\r\n")
        out.write(head.toString().toByteArray(Charsets.UTF_8))
        out.write(data, start, len)
        out.flush()
    }

    private fun handleSse(s: Socket, query: Map<String, String>) {
        val out = s.getOutputStream()
        val name = clean(query["name"] ?: "بازیکن")
        val adm = admit(
            query["id"]?.takeIf { it.isNotEmpty() },
            query["token"]?.takeIf { it.isNotEmpty() }
        )
        if (adm == null) {
            respond(out, 403, "text/plain", "FULL".toByteArray())
            return
        }
        val head = "HTTP/1.1 200 OK\r\nContent-Type: text/event-stream; charset=utf-8\r\n" +
            "Cache-Control: no-cache\r\nConnection: keep-alive\r\nX-Accel-Buffering: no\r\n\r\n"
        out.write(head.toByteArray(Charsets.UTF_8))
        out.flush()

        val writer = BufferedWriter(OutputStreamWriter(out, Charsets.UTF_8))
        val c = ClientConn(adm.id, name, s, writer, isWeb = true)
        try {
            val old = clients.put(adm.id, c)
            if (old != null) {
                try { old.socket.close() } catch (e: Exception) { }
            }
            send(c, "event: welcome\ndata: {\"id\":\"${adm.id}\",\"token\":\"${adm.token}\"}\n")
            if (adm.isRejoin) post { listener.onClientRejoined(adm.id) } else post { listener.onClientJoined(adm.id, name) }

            // فقط منتظر بسته شدن اتصال می‌مانیم
            s.soTimeout = 0
            val input = s.getInputStream()
            while (input.read() != -1) {
                // داده‌ای انتظار نمی‌رود
            }
        } catch (e: Exception) {
            // مرورگر رفت
        } finally {
            if (clients.remove(c.id, c)) {
                post { listener.onClientLeft(c.id) }
            }
        }
    }

    private fun handleWebIntent(query: Map<String, String>, body: String): Int {
        val id = query["id"] ?: return 403
        val token = query["token"] ?: return 403
        if (tokens[id] != token || !clients.containsKey(id)) return 403
        val intent = parseWebIntent(body) ?: return 400
        post { listener.onIntent(id, intent) }
        return 200
    }

    private fun parseWebIntent(body: String): ClientIntent? {
        return try {
            val o = webJson.parseToJsonElement(body).jsonObject
            fun str(k: String): String? = o[k]?.jsonPrimitive?.content
            when (str("t")) {
                "play" -> ClientIntent.PlayCard(str("cardId") ?: return null)
                "draw" -> ClientIntent.DrawCard
                "pass" -> ClientIntent.PassTurn
                "eight" -> ClientIntent.PassEightBonus
                "suit" -> ClientIntent.SelectSuit(Suit.valueOf(str("suit") ?: return null))
                "give" -> ClientIntent.GiveCardToPlayer(str("cardId") ?: return null, str("target") ?: return null)
                "tak" -> ClientIntent.DeclareTakKard
                "catch" -> ClientIntent.CatchTakKard
                else -> null
            }
        } catch (e: Exception) {
            null
        }
    }

    /** برای اتصال وب، خط‌های رویداد SSE (بدون خط خالی آخر) فرستاده می‌شود؛ newLine خط خالی پایانی را می‌سازد. */
    private fun send(conn: ClientConn, line: String) {
        sender.execute {
            try {
                synchronized(conn.writer) {
                    conn.writer.write(line)
                    conn.writer.newLine()
                    conn.writer.flush()
                }
            } catch (e: Exception) {
                try { conn.socket.close() } catch (e2: Exception) { }
            }
        }
    }

    private fun broadcast(line: String) {
        clients.values.forEach { send(it, line) }
    }

    fun broadcastState(state: GameState) {
        if (clients.isEmpty()) return
        clients.values.forEach { c ->
            val masked = state.maskedFor(c.id)
            if (c.isWeb) {
                send(c, "event: state\ndata: " + webJson.encodeToString(GameState.serializer(), masked) + "\n")
            } else {
                send(c, "STATE:" + json.encodeToString(GameState.serializer(), masked))
            }
        }
    }

    fun broadcastLobby(names: List<String>) {
        if (clients.isEmpty()) return
        val webPayload = buildJsonObject { put("names", JsonArray(names.map { JsonPrimitive(it) })) }.toString()
        clients.values.forEach { c ->
            if (c.isWeb) send(c, "event: lobby\ndata: $webPayload\n")
            else send(c, "LOBBY:" + names.joinToString(SEP.toString()))
        }
    }

    fun stopHost() {
        hostRunning = false
        try { serverSocket?.close() } catch (e: Exception) { }
        serverSocket = null
        try { discoveryResponder?.close() } catch (e: Exception) { }
        discoveryResponder = null
        try { httpServer?.close() } catch (e: Exception) { }
        httpServer = null
        httpPort = 0
        clients.values.forEach { try { it.socket.close() } catch (e: Exception) { } }
        clients.clear()
        tokens.clear()
    }

    // ---------------------------------------------------------------- client

    fun connect(ip: String, name: String, rejoinId: String? = null, rejoinToken: String? = null) {
        disconnect()
        val token = Any()
        clientToken = token
        pool.execute {
            var socket: Socket? = null
            var joined = false
            try {
                val wifi = wifiNetwork()
                val s: Socket = if (wifi != null) wifi.socketFactory.createSocket() else Socket()
                socket = s
                s.tcpNoDelay = true
                s.connect(InetSocketAddress(ip, TCP_PORT), 4000)

                val reader = BufferedReader(InputStreamReader(s.getInputStream(), Charsets.UTF_8))
                val writer = BufferedWriter(OutputStreamWriter(s.getOutputStream(), Charsets.UTF_8))
                val rejoinPart = if (rejoinId != null && rejoinToken != null) "$SEP$rejoinId$SEP$rejoinToken" else ""
                writer.write("HELLO:" + clean(name) + rejoinPart)
                writer.newLine()
                writer.flush()

                s.soTimeout = 5000
                val first = reader.readLine()

                if (first == null) throw IOException("میزبان پاسخ نداد")
                if (first.startsWith("FULL")) {
                    if (clientToken === token) post { listener.onError("میز پر است یا بازی از قبل شروع شده.") }
                    return@execute
                }
                if (!first.startsWith("WELCOME:")) throw IOException("پاسخ نامعتبر")
                if (clientToken !== token) return@execute

                // از اینجا به بعد باید هر چند ثانیه یک بار ضربان برسد
                s.soTimeout = CLIENT_TIMEOUT_MS

                clientSocket = s
                clientWriter = writer
                joined = true
                val parts = first.removePrefix("WELCOME:").split(SEP)
                val myId = parts[0]
                val myToken = parts.getOrNull(1) ?: ""
                post { listener.onJoined(myId, myToken) }

                while (true) {
                    val line = reader.readLine() ?: break
                    if (line.startsWith("STATE:")) {
                        val st = json.decodeFromString(GameState.serializer(), line.removePrefix("STATE:"))
                        post { listener.onState(st) }
                    } else if (line.startsWith("LOBBY:")) {
                        val names = line.removePrefix("LOBBY:").split(SEP).filter { it.isNotBlank() }
                        post { listener.onLobby(names) }
                    }
                }
                if (clientToken === token) post { listener.onDisconnectedFromHost() }
            } catch (e: Exception) {
                if (clientToken === token) {
                    if (joined) post { listener.onDisconnectedFromHost() }
                    else post { listener.onError("اتصال برقرار نشد. مطمئن شوید به هات‌اسپات میزبان وصل هستید و میزبان «ساخت میز» را زده است.") }
                }
            } finally {
                try { socket?.close() } catch (e: Exception) { }
            }
        }
    }

    fun sendIntent(intent: ClientIntent) {
        val w = clientWriter ?: return
        val line = "INTENT:" + json.encodeToString(ClientIntent.serializer(), intent)
        sender.execute {
            try {
                synchronized(w) {
                    w.write(line)
                    w.newLine()
                    w.flush()
                }
            } catch (e: Exception) {
                try { clientSocket?.close() } catch (e2: Exception) { }
            }
        }
    }

    fun disconnect() {
        clientToken = null
        try { clientSocket?.close() } catch (e: Exception) { }
        clientSocket = null
        clientWriter = null
    }

    // ------------------------------------------------------------- discovery

    fun discoverHosts(timeoutMs: Long = 3000) {
        pool.execute {
            var sock: DatagramSocket? = null
            try {
                val ds = DatagramSocket()
                sock = ds
                ds.broadcast = true
                ds.soTimeout = 400
                try { wifiNetwork()?.bindSocket(ds) } catch (e: Exception) { }

                val msg = DISCOVER_MSG.toByteArray(Charsets.UTF_8)
                val targets = mutableSetOf<InetAddress>()
                try { targets.add(InetAddress.getByName("255.255.255.255")) } catch (e: Exception) { }
                broadcastIp()?.let { try { targets.add(InetAddress.getByName(it)) } catch (e: Exception) { } }
                gatewayIp()?.let { try { targets.add(InetAddress.getByName(it)) } catch (e: Exception) { } }

                val end = System.currentTimeMillis() + timeoutMs
                var lastSend = 0L
                val buf = ByteArray(256)
                val seen = mutableSetOf<String>()
                while (System.currentTimeMillis() < end) {
                    val now = System.currentTimeMillis()
                    if (now - lastSend > 800) {
                        lastSend = now
                        for (t in targets) {
                            try { ds.send(DatagramPacket(msg, msg.size, t, UDP_PORT)) } catch (e: Exception) { }
                        }
                    }
                    try {
                        val p = DatagramPacket(buf, buf.size)
                        ds.receive(p)
                        val text = String(p.data, 0, p.length, Charsets.UTF_8)
                        if (text.startsWith(HOST_MSG)) {
                            val ip = p.address.hostAddress ?: continue
                            if (seen.add(ip)) {
                                val hostName = text.removePrefix(HOST_MSG)
                                post { listener.onHostFound(ip, hostName) }
                            }
                        }
                    } catch (e: SocketTimeoutException) {
                        // ادامه
                    }
                }
            } catch (e: Exception) {
                // نادیده
            } finally {
                try { sock?.close() } catch (e: Exception) { }
                post { listener.onDiscoveryFinished() }
            }
        }
    }

    // ---------------------------------------------------------------- helpers

    private fun intToIp(i: Int): String =
        "${i and 0xff}.${(i shr 8) and 0xff}.${(i shr 16) and 0xff}.${(i shr 24) and 0xff}"

    /** آی‌پی گوشی میزبانِ هات‌اسپات از دید کلاینت (گیت‌وی). */
    @Suppress("DEPRECATION")
    fun gatewayIp(): String? {
        return try {
            val wm = appContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager ?: return null
            val gw = wm.dhcpInfo?.gateway ?: 0
            if (gw != 0) intToIp(gw) else null
        } catch (e: Exception) {
            null
        }
    }

    @Suppress("DEPRECATION")
    private fun broadcastIp(): String? {
        return try {
            val wm = appContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager ?: return null
            val d = wm.dhcpInfo ?: return null
            if (d.netmask == 0 || d.ipAddress == 0) null
            else intToIp((d.ipAddress and d.netmask) or d.netmask.inv())
        } catch (e: Exception) {
            null
        }
    }

    /** آی‌پی‌های این گوشی (برای نمایش به دیگران وقتی میزبان هستیم). */
    fun localIpv4(): List<String> {
        val result = mutableListOf<String>()
        try {
            val ifaces = NetworkInterface.getNetworkInterfaces() ?: return result
            for (ni in Collections.list(ifaces)) {
                if (!ni.isUp || ni.isLoopback) continue
                val n = ni.name ?: ""
                if (n.startsWith("rmnet") || n.startsWith("ccmni") || n.startsWith("tun") ||
                    n.startsWith("v4-") || n.startsWith("dummy")
                ) continue
                for (addr in Collections.list(ni.inetAddresses)) {
                    if (addr is Inet4Address && !addr.isLoopbackAddress) {
                        val ip = addr.hostAddress
                        if (ip != null) result.add(ip)
                    }
                }
            }
        } catch (e: Exception) {
        }
        return result
    }

    /** اگر گوشی اینترنت همراه هم دارد، ترافیک بازی باید حتماً از مسیر وای‌فای برود. */
    @Suppress("DEPRECATION")
    private fun wifiNetwork(): Network? {
        return try {
            val cm = appContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            cm.allNetworks.firstOrNull { n ->
                cm.getNetworkCapabilities(n)?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
            }
        } catch (e: Exception) {
            null
        }
    }

    fun stopAll() {
        stopHost()
        disconnect()
    }

    fun shutdown() {
        stopAll()
        pool.shutdownNow()
        sender.shutdownNow()
    }
}
