import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import {
    isUrgentOpen,
    findServerNode,
    isNodeBlacklisted,
    isNodeAllowed,
    getUrgentConfig,
    getUrgentMode,
    getClaimedUUIDs,
    claimUUID,
    getIpAlias,
    getIpAddress,
    getPanelUrl,
    hasActiveLock,
    getLockInfo,
    createLock,
    updateLockPort,
    releaseLock,
    isPortLocked,
    getAvailablePortList,
    isPortAvailable,
    generateAvailablePort,
    cloneServer,
    setUrgentSession,
    findUrgentSession,
    deleteUrgentSession,
    hasUrgentSession,
    isPltcConfigured,
    getServerResources
} from "../../lib/urgent.js"

// ─── Helpers ───
const LOCK_RX = /​#lock=\d+$/
const cleanBody = (m) => String(m.body || "").replace(LOCK_RX, "").trim()

// ─── Pesan sukses clone: kartu + tombol copy address & buka panel ───
async function sendCloneSuccess(sock, m, { uuid, serverName, nodeName, newServerName, newServerId, port }) {
    const ipAlias = getIpAlias()
    const ipAddress = getIpAddress()
    const connectString = `${ipAlias}:${port}`
    const panelUrl = getPanelUrl()

    const buttons = [{ type: "copy", text: "📋 Copy Address", code: connectString }]
    if (panelUrl) buttons.push({ type: "url", text: "🌐 Buka Panel", url: panelUrl })

    return Button.menu({
        sock,
        m,
        body: card("✅ URGENT SUCCESS", [
            "🎉 Server berhasil di-clone!",
            "",
            "─────────────────",
            "",
            "📋 *Server Lama:*",
            `├ Name: ${serverName}`,
            `├ UUID: ${String(uuid).substring(0, 12)}...`,
            `├ Node: ${nodeName}`,
            "",
            "📋 *Server Baru:*",
            `├ Name: ${newServerName}`,
            `├ UUID: ${newServerId}`,
            "",
            "🌐 *Connection:*",
            `├ 🔌 Port: ${port}`,
            `├ 🌐 Alias: ${ipAlias}`,
            `├ 📍 IP: ${ipAddress}`,
            "",
            "─────────────────",
            "",
            `✅ Connect: \`${connectString}\``,
            "",
            "Server baru sudah dibuat dan siap digunakan!"
        ], { emoji: "🎉" }),
        footer: "© Chaeul",
        lock: m.sender,
        buttons
    })
}

// ─── Eksekusi clone dari sesi yang valid ───
async function doClone(sock, m, session, port) {
    const { uuid, server, nodeName, targetNodeId } = session

    updateLockPort(m.sender, port)

    try {
        const newServer = await cloneServer(server, targetNodeId, port)
        const newServerId = newServer.attributes?.id || newServer.id
        const serverName = server.attributes?.name || server.name || "Server"

        const ipAlias = getIpAlias()
        const ipAddress = getIpAddress()

        claimUUID(uuid, m.sender, newServerId, {
            port,
            ipAlias,
            ipAddress,
            targetNode: String(targetNodeId),
            originalNode: nodeName,
            serverName
        })

        releaseLock(m.sender)
        deleteUrgentSession(m.sender)

        const newServerName = newServer.attributes?.name || newServer.name || serverName + "_URGENT"

        return await sendCloneSuccess(sock, m, {
            uuid,
            serverName,
            nodeName,
            newServerName,
            newServerId,
            port
        })
    } catch (error) {
        releaseLock(m.sender)
        deleteUrgentSession(m.sender)
        console.error("[Urgent Clone Error]", error)
        return m.reply(card("ERROR", [`❌ Gagal: ${error.message}`], { emoji: "❌" }))
    }
}

export default {
    command: [
        "urgent",
        /^urgent_confirm$/,
        /^urgent_cancel$/,
        /^urgent_port:.+$/
    ],
    category: "User",
    description: "Claim server darurat (Emergency)",

    async run({ sock, m, args }) {
        // ─── Router klik button (lock suffix sudah di-strip handler) ───
        const action = cleanBody(m)

        if (action === "urgent_confirm") return await handleConfirm(sock, m)
        if (action === "urgent_cancel") return await handleCancel(sock, m)
        if (action.startsWith("urgent_port:")) {
            return await handlePortButton(sock, m, action.slice("urgent_port:".length))
        }

        // ─── Sistem ditutup ───
        if (!isUrgentOpen()) {
            return m.reply(card("URGENT SYSTEM", [
                "🔴 Sistem urgent sedang *DITUTUP*.",
                "",
                "Owner belum membuka akses urgent.",
                "",
                "_Hubungi owner untuk info lebih lanjut._"
            ], { emoji: "🔴" }))
        }

        // ─── Request aktif (masih dalam sesi) ───
        if (hasActiveLock(m.sender)) {
            const pending = findUrgentSession(m.sender)
            if (pending && pending.step === "port") {
                const lock = getLockInfo(m.sender)
                return m.reply(card("PORT REQUEST AKTIF", [
                    "⚠️ Kamu masih punya request yang belum selesai.",
                    "",
                    `📋 UUID: ${lock?.uuid?.substring(0, 12) || pending.uuid?.substring(0, 12)}...`,
                    lock?.port ? `🔌 Port: ${lock.port}` : "",
                    "",
                    `Sisa waktu: ${Math.max(1, Math.ceil(((lock?.expiresAt || Date.now()) - Date.now()) / 60000))} menit`,
                    "",
                    "Ketik nomor port yang kamu inginkan,",
                    "atau ketik *batal* untuk membatalkan.",
                    "",
                    "_Contoh: 25565_"
                ], { emoji: "⏳" }))
            }

            // Lock yatim (sesi hilang, mis. bot restart / konfirmasi belum selesai) → lepas
            releaseLock(m.sender)
            deleteUrgentSession(m.sender)
        }

        if (!args[0]) {
            return m.reply(card("URGENT CLAIM", [
                "📋 *Cara penggunaan:*",
                "",
                global.prefix + "urgent <server_uuid>",
                "",
                "📝 *Contoh:*",
                global.prefix + "urgent abc123-def456",
                "",
                "─────────────────",
                "",
                "⚠️ *Perhatian:*",
                "• Server harus dari node yang *TIDAK* diblacklist",
                "• Satu UUID hanya bisa di-claim *sekali*",
                "• Kamu akan diminta *konfirmasi* dulu, lalu pilih port",
                "• Kamu akan mendapat server *identik* dengan server asli"
            ], { emoji: "🚨" }))
        }

        const uuid = args[0].trim()
        if (uuid.length < 8) {
            return m.reply(card("ERROR", ["❌ UUID terlalu pendek. Pastikan UUID benar."], { emoji: "❌" }))
        }

        const allClaimed = getClaimedUUIDs()
        if (allClaimed[uuid.toLowerCase()]) {
            const claimInfo = allClaimed[uuid.toLowerCase()]
            return m.reply(card("ALREADY CLAIMED", [
                "⚠️ UUID ini sudah pernah di-claim.",
                "",
                `📅 Tanggal claim: ${new Date(claimInfo.claimedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`,
                "",
                "_Setiap UUID hanya bisa di-claim sekali._"
            ], { emoji: "⚠️" }))
        }

        await m.reply("🔍 Mencari server...")

        let result
        try {
            result = await findServerNode(uuid)
        } catch (error) {
            console.error("[Urgent Error]", error)
            return m.reply(card("ERROR", [
                `❌ Gagal mencari server.`,
                "",
                `*Error:* ${error.message}`,
                "",
                "_Coba lagi atau hubungi owner._"
            ], { emoji: "❌" }))
        }

        if (!result) {
            return m.reply(card("SERVER NOT FOUND", [
                `❌ Server dengan UUID *${uuid}* tidak ditemukan.`,
                "",
                "Pastikan UUID yang kamu masukkan benar.",
                "",
                "_Tip: UUID ada di detail server di panel._"
            ], { emoji: "🔍" }))
        }

        const { node, server } = result
        const nodeId = String(node.id)
        const nodeName = node.name
        const mode = getUrgentMode()

        // Mode blacklist: laporkan node yang di-blacklist secara spesifik
        if (mode === "blacklist" && isNodeBlacklisted(nodeId)) {
            return m.reply(card("NODE BLACKLISTED", [
                `⚠️ Server ini berada di node *${nodeName}* (ID: ${nodeId})`,
                "",
                "🛑 Node tersebut sedang *DITUTUP/DIMATIKAN*.",
                "",
                "Kamu tidak bisa claim server dari node ini.",
                "",
                "_Hubungi owner untuk info lebih lanjut._"
            ], { emoji: "🛑" }))
        }

        if (!isNodeAllowed(nodeId)) {
            const lines =
                mode === "whitelist"
                    ? [
                          `⚠️ Server ini berada di node *${nodeName}* (ID: ${nodeId})`,
                          "",
                          "🚫 Node tersebut *tidak ada di whitelist* urgent.",
                          "Hanya server dari node whitelist yang bisa di-claim.",
                          "",
                          "_Hubungi owner untuk info lebih lanjut._"
                      ]
                    : [
                          `⚠️ Node *${nodeName}* (ID: ${nodeId})`,
                          "",
                          "Tidak diizinkan untuk emergency clone.",
                          "",
                          "_Hubungi owner._"
                      ]
            return m.reply(card(
                mode === "whitelist" ? "NODE NOT WHITELISTED" : "NODE NOT ALLOWED",
                lines,
                { emoji: "🚫" }
            ))
        }

        const config = getUrgentConfig()
        const targetNodeId = config.defaultNode

        if (!targetNodeId) {
            return m.reply(card("CONFIG ERROR", [
                "⚠️ Default node untuk urgent belum diset.",
                "",
                "_Owner perlu set dengan .nodeto_"
            ], { emoji: "⚠️" }))
        }

        const serverName = server.attributes?.name || server.name || "Server"
        const limits = server.limits || server.attributes?.limits || {}

        // ─── Live stats via PLTC (Client API) bila tersedia ───
        const liveLines = []
        if (isPltcConfigured()) {
            try {
                const identifier =
                    server.identifier ||
                    server.attributes?.identifier ||
                    String(uuid).slice(0, 8)
                const stats = await getServerResources(identifier)
                const state = stats?.current_state || "unknown"
                const dot = state === "running" ? "🟢" : state === "offline" ? "🔴" : "🟡"
                const ramMB = Math.round((stats?.resources?.memory_bytes || 0) / 1048576)
                liveLines.push(`├ Live: ${dot} ${state} • RAM ${ramMB} MB`)
            } catch {
                liveLines.push(`├ Live: ⚪ _(PLTC tidak bisa membaca server ini)_`)
            }
        }

        // ─── Simpan sesi tahap KONFIRMASI + tampilkan tombol konfirmasi (locked) ───
        setUrgentSession(m.sender, {
            step: "confirm",
            uuid,
            server,
            node,
            nodeId,
            nodeName,
            targetNodeId
        })

        return Button.menu({
            sock,
            m,
            body: card("KONFIRMASI SERVER", [
                "✅ Server ditemukan!",
                "",
                "─────────────────",
                "",
                "📋 *Detail Server:*",
                `├ Name: ${serverName}`,
                `├ UUID: ${uuid.substring(0, 12)}...`,
                `├ Node asal: ${nodeName} (ID: ${nodeId})`,
                `├ Node target: #${targetNodeId}`,
                `├ Spec: 🧠 ${limits.memory ?? 0} MB • 💿 ${limits.disk ?? 0} MB • ⚙️ ${limits.cpu ?? 0}%`,
                ...liveLines,
                "",
                "─────────────────",
                "",
                "⚠️ Server akan di-*CLONE identik* ke node target.",
                "Pastikan ini benar server kamu.",
                "",
                "─────────────────",
                "",
                "*Cara konfirmasi:*",
                "• Tekan tombol *✅ Ya, Clone Server*, ATAU",
                "• Balas *ya* untuk lanjut, *batal* untuk batal,",
                "• Atau langsung ketik nomor port (mis. 25565).",
                "",
                "_Sesi berakhir otomatis dalam 5 menit._"
            ], { emoji: "🛡️" }),
            footer: "© Chaeul",
            lock: m.sender,
            buttons: [
                { type: "quick", text: "✅ Ya, Clone Server", id: "urgent_confirm" },
                { type: "quick", text: "❌ Batalkan", id: "urgent_cancel" }
            ]
        })
    }
}

// ═══════════════════════════════════════════════════════════════
// BUTTON: Konfirmasi server → lanjut pilih port
// ═══════════════════════════════════════════════════════════════

// Lanjut ke tahap pilih port (dipakai button confirm & konfirmasi via teks).
// Mengembalikan true bila berhasil, false bila tidak ada port tersedia.
async function advanceToPortStage(sock, m, session) {
    // Lock hanya dibuat sekali (bila belum ada)
    if (!hasActiveLock(m.sender)) {
        createLock(m.sender, session.uuid)
    }

    const availablePorts = await getAvailablePortList(session.targetNodeId, 10)
    const autoPort = await generateAvailablePort(session.targetNodeId)

    if (!availablePorts.length || !autoPort) {
        releaseLock(m.sender)
        deleteUrgentSession(m.sender)
        await m.reply(card("ERROR", [
            "❌ Tidak ada port tersedia di node target.",
            "",
            "_Semua allocation sudah dipakai. Hubungi owner._"
        ], { emoji: "❌" }))
        return false
    }

    setUrgentSession(m.sender, { ...session, step: "port", availablePorts })

    const serverName = session.server.attributes?.name || session.server.name || "Server"

    // Port sebagai pilihan list (rapi) + tombol auto & batal.
    // Nomor port JUGA ditulis sebagai teks — jadi tetap bisa dipakai
    // walau tombol interactive tidak tampil di WhatsApp user.
    const rows = availablePorts.map((port) => ({
        title: `🔌 ${port}`,
        description: "Klik untuk memakai port ini",
        id: `urgent_port:${port}`
    }))

    await Button.menu({
        sock,
        m,
        body: card("PILIH PORT", [
            `📋 Server: *${serverName}*`,
            `🎯 Node target: #${session.targetNodeId}`,
            "",
            "🔌 *Port tersedia:*",
            ...availablePorts.slice(0, 10).map((p) => `├ \`${p}\``),
            "",
            "─────────────────",
            "",
            "*Cara memilih:*",
            "• Klik port pada daftar / tombol di bawah, ATAU",
            "• Ketik nomor port manual (mis. 25565), ATAU",
            `• Ketik *auto* untuk port acak (${autoPort})`,
            "",
            "_Ketik batal untuk membatalkan._"
        ], { emoji: "🔌" }),
        footer: "© Chaeul",
        lock: m.sender,
        buttons: [
            { type: "quick", text: "🔄 Port Acak", id: "urgent_port:auto" },
            { type: "quick", text: "❌ Batalkan", id: "urgent_cancel" }
        ],
        sections: rows.length ? [{ title: "✦ PORT TERSEDIA", rows }] : []
    })
    return true
}

async function handleConfirm(sock, m) {
    // Hanya pemilik sesi (command runner) yang bisa konfirmasi.
    const session = findUrgentSession(m.sender)
    if (!session || session.step !== "confirm") return null

    const ok = await advanceToPortStage(sock, m, session)
    return ok ? true : null
}

// ═══════════════════════════════════════════════════════════════
// BUTTON: Batalkan request
// ═══════════════════════════════════════════════════════════════
async function handleCancel(sock, m) {
    const session = findUrgentSession(m.sender)
    if (!session) return null

    releaseLock(m.sender)
    deleteUrgentSession(m.sender)

    return m.reply(card("DIBATALKAN", [
        "❌ Request urgent dibatalkan.",
        "",
        "_Server tidak jadi di-clone._"
    ], { emoji: "❌" }))
}

// ═══════════════════════════════════════════════════════════════
// BUTTON: Pilih port dari daftar / tombol auto
// ═══════════════════════════════════════════════════════════════
async function handlePortButton(sock, m, raw) {
    const session = findUrgentSession(m.sender)
    if (!session || session.step !== "port") return null

    const value = String(raw).trim().toLowerCase()

    if (value === "auto" || value === "acak" || value === "random") {
        const port = await generateAvailablePort(session.targetNodeId)
        if (!port) {
            releaseLock(m.sender)
            deleteUrgentSession(m.sender)
            return m.reply(card("ERROR", ["❌ Tidak ada port tersedia."], { emoji: "❌" }))
        }
        return await doClone(sock, m, session, port)
    }

    const port = parseInt(value)
    if (isNaN(port)) return null

    return await validateAndClone(sock, m, session, port)
}

// ─── Validasi port lalu clone ───
async function validateAndClone(sock, m, session, port) {
    if (port < 1 || port > 65535) {
        return m.reply(card("ERROR", [
            "❌ Port tidak valid.",
            "",
            "Port harus angka antara 1-65535.",
            "_Contoh: 25565_"
        ], { emoji: "❌" }))
    }

    const lockStatus = isPortLocked(port, m.sender)
    if (lockStatus.locked) {
        return m.reply(card("PORT TAKEN", [
            `❌ Port *${port}* sedang diproses user lain.`,
            "",
            "Silakan pilih port lain atau gunakan *Port Acak*."
        ], { emoji: "🔌" }))
    }

    const available = await isPortAvailable(session.targetNodeId, port)
    if (!available) {
        const fresh = await getAvailablePortList(session.targetNodeId, 5)
        return m.reply(card("PORT TAKEN", [
            `❌ Port *${port}* sudah digunakan atau tidak tersedia.`,
            "",
            "Port yang tersedia:",
            ...(fresh.length ? fresh.map((p) => `├ 🔌 \`${p}\``) : ["├ _(kosong — hubungi owner)_"]),
            "",
            "Pilih port lain, atau ketik *batal*."
        ], { emoji: "🔌" }))
    }

    return await doClone(sock, m, session, port)
}

// ═══════════════════════════════════════════════════════════════
// TEXT INPUT: dipanggil handler.js saat user mengetik port manual.
// State diambil dari lib/urgent.js (shared antar instance modul) —
// inilah perbaikan "bot tidak melisten chat port".
// ═══════════════════════════════════════════════════════════════
export async function handlePortInput(sock, m, input) {
    // Hanya proses pemilik sesi (command runner) — user lain diabaikan.
    const session = findUrgentSession(m.sender)
    if (!session) return null

    const text = String(input).trim().toLowerCase()

    // Klik button di-route lewat run(), bukan di sini
    if (text.startsWith("urgent_")) return null

    if (text === "batal" || text === "cancel" || text === "tidak" || text === "gak" || text === "ga" || text === "no") {
        releaseLock(m.sender)
        deleteUrgentSession(m.sender)
        return m.reply(card("DIBATALKAN", [
            "❌ Request urgent dibatalkan.",
            "",
            "_Server tidak jadi di-clone._"
        ], { emoji: "❌" }))
    }

    // ─── Tahap KONFIRMASI (semua bisa via teks, tanpa butuh tombol) ───
    if (session.step === "confirm") {
        // Konfirmasi via teks: "ya", "yes", "ok", "lanjut", dst.
        const YES = ["ya", "yes", "y", "ok", "oke", "okay", "iya", "lanjut", "gas", "setuju", "confirm", "yakin", "benar"]
        if (YES.includes(text)) {
            console.log(`[Urgent] Konfirmasi via teks dari ${m.sender}`)
            return await advanceToPortStage(sock, m, session)
        }

        // Langsung ketik PORT di tahap konfirmasi = otomatis konfirmasi
        // lalu proses port tersebut (fix: user tidak tersangkut menunggu
        // tombol yang mungkin tidak tampil di WhatsApp-nya).
        if (text === "auto" || text === "acak" || text === "random") {
            console.log(`[Urgent] Konfirmasi+auto port via teks dari ${m.sender}`)
            createLock(m.sender, session.uuid)
            setUrgentSession(m.sender, { ...session, step: "port", availablePorts: [] })
            const port = await generateAvailablePort(session.targetNodeId)
            if (!port) {
                releaseLock(m.sender)
                deleteUrgentSession(m.sender)
                return m.reply(card("ERROR", ["❌ Tidak ada port tersedia."], { emoji: "❌" }))
            }
            return await doClone(sock, m, findUrgentSession(m.sender) || session, port)
        }

        const port = parseInt(text)
        if (!isNaN(port)) {
            console.log(`[Urgent] Konfirmasi+port ${port} via teks dari ${m.sender}`)
            createLock(m.sender, session.uuid)
            const moved = { ...session, step: "port", availablePorts: [] }
            setUrgentSession(m.sender, moved)
            return await validateAndClone(sock, m, moved, port)
        }

        // Chat lain di tahap konfirmasi → abaikan (jangan spam reminder)
        return null
    }

    // ─── Tahap PILIH PORT ───
    if (text === "auto" || text === "acak" || text === "random") {
        const port = await generateAvailablePort(session.targetNodeId)
        if (!port) {
            releaseLock(m.sender)
            deleteUrgentSession(m.sender)
            return m.reply(card("ERROR", ["❌ Tidak ada port tersedia."], { emoji: "❌" }))
        }
        return await doClone(sock, m, session, port)
    }

    const port = parseInt(text)
    if (isNaN(port)) return null // bukan input port → biarkan flow lain menangani

    return await validateAndClone(sock, m, session, port)
}

// API kompatibel utk lib/handler.js (state kini di lib/urgent.js)
export function hasPortSession(sender) {
    return hasUrgentSession(sender)
}

export function cancelPortSession(sender) {
    const session = findUrgentSession(sender)
    if (session) {
        releaseLock(sender)
        deleteUrgentSession(sender)
        return true
    }
    return false
}
