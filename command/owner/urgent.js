import { card } from "../../lib/ui.js"
import {
    isUrgentOpen,
    findServerNode,
    isNodeBlacklisted,
    isNodeAllowed,
    getUrgentConfig,
    getClaimedUUIDs,
    claimUUID,
    getIpAlias,
    getIpAddress,
    notifyPlta,
    // Port system
    hasActiveLock,
    getLockInfo,
    createLock,
    updateLockPort,
    releaseLock,
    isPortLocked,
    getAvailablePortList,
    isPortAvailable,
    generateAvailablePort
} from "../../lib/urgent.js"

// Session storage untuk port request (dalam memory)
const portSessions = new Map()

export default {
    command: ["urgent"],

    category: "User",

    description: "Claim server darurat (Emergency)",

    async run({ sock, m, args }) {
        // ─── Cek apakah urgent terbuka ───
        if (!isUrgentOpen()) {
            return m.reply(
                card(
                    "URGENT SYSTEM",
                    [
                        "🔴 Sistem urgent sedang *DITUTUP*.",
                        "",
                        "Owner belum membuka akses urgent.",
                        "",
                        "_Hubungi owner untuk info lebih lanjut._"
                    ],
                    { emoji: "🔴" }
                )
            )
        }

        // ─── Cek apakah user sudah punya lock aktif ───
        if (hasActiveLock(m.sender)) {
            const lock = getLockInfo(m.sender)
            return m.reply(
                card(
                    "PORT REQUEST AKTIF",
                    [
                        "⚠️ Kamu masih punya request yang belum selesai.",
                        "",
                        `📋 UUID: ${lock.uuid?.substring(0, 12)}...`,
                        lock.port ? `🔌 Port: ${lock.port}` : "",
                        "",
                        `Sisa waktu: ${Math.ceil((lock.expiresAt - Date.now()) / 60000)} menit`,
                        "",
                        "Ketik nomor port yang kamu inginkan:",
                        "",
                        `_Contoh: 25565_"
                    ],
                    { emoji: "⏳" }
                )
            )
        }

        // ─── Cek UUID input ───
        if (!args[0]) {
            return m.reply(
                card(
                    "URGENT CLAIM",
                    [
                        "📋 *Cara penggunaan:*",
                        "",
                        `${global.prefix}urgent <server_uuid>`,
                        "",
                        "📝 *Contoh:*",
                        `${global.prefix}urgent abc123-def456`,
                        "",
                        "─────────────────",
                        "",
                        "⚠️ *Perhatian:*",
                        "• Server harus dari node yang *TIDAK* diblacklist",
                        "• Satu UUID hanya bisa di-claim *sekali*",
                        "• Kamu akan mendapat server *identik* dengan server asli",
                        "• Port akan dipilih setelah UUID diverifikasi"
                    ],
                    { emoji: "🚨" }
                )
            )
        }

        const uuid = args[0].trim()
        if (uuid.length < 8) {
            return m.reply(
                card("ERROR", ["❌ UUID terlalu pendek. Pastikan UUID benar."], { emoji: "❌" })
            )
        }

        // ─── Cek apakah UUID sudah di-claim ───
        const allClaimed = getClaimedUUIDs()
        if (allClaimed[uuid.toLowerCase()]) {
            const claimInfo = allClaimed[uuid.toLowerCase()]
            return m.reply(
                card(
                    "ALREADY CLAIMED",
                    [
                        "⚠️ UUID ini sudah pernah di-claim.",
                        "",
                        `📅 Tanggal claim: ${new Date(claimInfo.claimedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`,
                        "",
                        "_Setiap UUID hanya bisa di-claim sekali._"
                    ],
                    { emoji: "⚠️" }
                )
            )
        }

        // ─── Loading ───
        await m.reply("🔍 Mencari server...")

        try {
            // Cari server dan node-nya
            const result = await findServerNode(uuid)

            if (!result) {
                return m.reply(
                    card(
                        "SERVER NOT FOUND",
                        [
                            `❌ Server dengan UUID *${uuid}* tidak ditemukan.`,
                            "",
                            "Pastikan UUID yang kamu masukkan benar.",
                            "",
                            "_Tip: UUID ada di detail server di panel._"
                        ],
                        { emoji: "🔍" }
                    )
                )
            }

            const { node, server } = result
            const nodeId = String(node.id)
            const nodeName = node.name

            // ─── Cek blacklist ───
            if (isNodeBlacklisted(nodeId)) {
                return m.reply(
                    card(
                        "NODE BLACKLISTED",
                        [
                            `⚠️ Server ini berada di node *${nodeName}* (ID: ${nodeId})`,
                            "",
                            "🛑 Node tersebut sedang *DITUTUP/DIMATIKAN*.",
                            "",
                            "Kamu tidak bisa claim server dari node ini.",
                            "",
                            "_Hubungi owner untuk info lebih lanjut._"
                        ],
                        { emoji: "🛑" }
                    )
                )
            }

            // ─── Cek apakah node diizinkan ───
            if (!isNodeAllowed(nodeId)) {
                return m.reply(
                    card(
                        "NODE NOT ALLOWED",
                        [
                            `⚠️ Node *${nodeName}* (ID: ${nodeId})`,
                            "",
                            "Tidak diizinkan untuk emergency clone.",
                            "",
                            "_Hubungi owner._"
                        ],
                        { emoji: "⚠️" }
                    )
                )
            }

            // ─── Cek default node untuk target ───
            const config = getUrgentConfig()
            const targetNodeId = config.defaultNode

            if (!targetNodeId) {
                return m.reply(
                    card(
                        "CONFIG ERROR",
                        [
                            "⚠️ Default node untuk urgent belum diset.",
                            "",
                            "_Owner perlu set dengan .nodeto_"
                        ],
                        { emoji: "⚠️" }
                    )
                )
            }

            // ─── Proses Port Request ───
            // Buat lock untuk user
            createLock(m.sender, uuid)

            // Ambil port yang tersedia
            const availablePorts = await getAvailablePortList(targetNodeId, 5)
            
            // Generate auto port
            const autoPort = await generateAvailablePort(targetNodeId)
            
            // Simpan session
            portSessions.set(m.sender, {
                uuid,
                server,
                node,
                nodeId,
                nodeName,
                targetNodeId,
                availablePorts,
                autoPort,
                createdAt: Date.now()
            })

            // ─── Tampilkan pilihan port ───
            let portOptions = ""
            for (const port of availablePorts) {
                portOptions += `├ 🔌 \`${port}\`\n`
            }

            const serverName = server.attributes?.name || server.name || "Server"

            return m.reply(
                card(
                    "🔌 PILIH PORT",
                    [
                        "✅ Server ditemukan!",
                        "",
                        "─────────────────",
                        "",
                        "📋 *Detail Server Lama:*",
                        `├ Name: ${serverName}`,
                        `├ UUID: ${uuid.substring(0, 12)}...`,
                        `├ Node: ${nodeName}`,
                        "",
                        "─────────────────",
                        "",
                        "🔌 *Pilih Port:*",
                        "",
                        portOptions || "",
                        "├ 🔄 *Auto* (port acak)",
                        "",
                        "─────────────────",
                        "",
                        "Ketik nomor port yang kamu inginkan.",
                        `Port auto: *${autoPort}*`,
                        "",
                        `_Contoh ketik: 25565_`,
                        `_atau ketik: auto_`,
                        "",
                        "⚠️ Port akan di-lock selama 5 menit."
                    ],
                    { emoji: "🔌" }
                )
            )
        } catch (error) {
            console.error("[Urgent Error]", error)
            releaseLock(m.sender)
            return m.reply(
                card(
                    "ERROR",
                    [
                        `❌ Gagal mencari server.`,
                        "",
                        `*Error:* ${error.message}`,
                        "",
                        "_Coba lagi atau hubungi owner._"
                    ],
                    { emoji: "❌" }
                )
            )
        }
    }
}

// ─── Port Input Handler ───
// Handle input port dari user (dipanggil dari handler.js)
// Export fungsi ini untuk dipanggil dari luar

export async function handlePortInput(sock, m, input) {
    const sender = m.sender
    
    // Cek apakah user punya session
    const session = portSessions.get(sender)
    if (!session) {
        return null // Bukan port input, biarkan handle lain
    }

    const inputPort = String(input).trim().toLowerCase()
    
    // ─── Handle "auto" ───
    if (inputPort === "auto" || inputPort === "acak" || inputPort === "random") {
        const { uuid, server, nodeName, targetNodeId } = session
        
        await m.reply("⏳ Membuat server dengan port auto...")
        
        try {
            const { cloneServer } = await import("../../lib/urgent.js")
            
            // Generate port dan lock
            const autoPort = await generateAvailablePort(targetNodeId)
            if (!autoPort) {
                releaseLock(sender)
                portSessions.delete(sender)
                return m.reply(card("ERROR", ["❌ Tidak ada port tersedia."], { emoji: "❌" }))
            }
            
            updateLockPort(sender, autoPort)
            
            // Clone server
            const newServer = await cloneServer(server, targetNodeId, autoPort)
            
            // Simpan claim dengan data lengkap
            const newServerId = newServer.attributes?.id || newServer.id
            const ipAlias = getIpAlias()
            const ipAddress = getIpAddress()
            const serverName = server.attributes?.name || server.name || "Server"
            
            claimUUID(uuid, sender, newServerId, {
                port: autoPort,
                ipAlias: ipAlias,
                ipAddress: ipAddress,
                targetNode: String(targetNodeId),
                originalNode: nodeName,
                serverName: serverName
            })
            
            // Kirim notifikasi PLTA
            notifyPlta({
                uuid: uuid,
                ownerJid: sender,
                newServerId: newServerId,
                serverName: serverName,
                port: autoPort,
                ipAlias: ipAlias,
                ipAddress: ipAddress,
                targetNode: String(targetNodeId)
            })
            
            // Release lock
            releaseLock(sender)
            portSessions.delete(sender)
            
            const newServerName = newServer.attributes?.name || newServer.name || `${serverName}_URGENT`
            
            return m.reply(
                card(
                    "✅ URGENT SUCCESS",
                    [
                        "🎉 Server berhasil di-clone!",
                        "",
                        "─────────────────",
                        "",
                        "📋 *Server Lama:*",
                        `├ Name: ${serverName}`,
                        `├ UUID: ${uuid.substring(0, 12)}...`,
                        `├ Node: ${nodeName}`,
                        "",
                        "📋 *Server Baru:*",
                        `├ Name: ${newServerName}`,
                        `├ UUID: ${newServerId}`,
                        "",
                        "🌐 *Connection:*",
                        `├ 🔌 Port: ${autoPort}`,
                        `├ 🌐 Alias: ${ipAlias}`,
                        `├ 📍 IP: ${ipAddress}`,
                        "",
                        "─────────────────",
                        "",
                        `✅ Connect: \`${ipAlias}:${autoPort}\``,
                        "",
                        "Server baru sudah dibuat dan siap digunakan!"
                    ],
                    { emoji: "🎉" }
                )
            )
        } catch (error) {
            releaseLock(sender)
            portSessions.delete(sender)
            console.error("[Urgent Port Auto Error]", error)
            return m.reply(
                card("ERROR", [`❌ Gagal: ${error.message}`], { emoji: "❌" })
            )
        }
    }
    
    // ─── Handle port number ───
    const port = parseInt(inputPort)
    
    if (isNaN(port) || port < 1 || port > 65535) {
        return m.reply(
            card("ERROR", [
                "❌ Port tidak valid.",
                "",
                "Port harus angka antara 1-65535.",
                `_Contoh: 25565_`
            ], { emoji: "❌" })
        )
    }
    
    const { uuid, server, nodeName, targetNodeId } = session
    
    // Cek apakah port sedang di-lock orang lain
    const lockStatus = isPortLocked(port, sender)
    if (lockStatus.locked) {
        return m.reply(
            card("PORT TAKEN", [
                `❌ Port *${port}* sedang diproses user lain.`,
                "",
                "Silakan pilih port lain atau ketik *auto* untuk port acak.",
                "",
                `_Contoh ketik: 25565_`,
                `_atau ketik: auto_`
            ], { emoji: "🔌" })
        )
    }
    
    // Cek apakah port tersedia di node
    const available = await isPortAvailable(targetNodeId, port)
    if (!available) {
        // Tampilkan port yang tersedia
        const newAvailable = await getAvailablePortList(targetNodeId, 5)
        let options = ""
        for (const p of newAvailable) {
            options += `├ 🔌 \`${p}\`\n`
        }
        
        return m.reply(
            card("PORT TAKEN", [
                `❌ Port *${port}* sudah digunakan atau tidak tersedia.`,
                "",
                "Port yang tersedia:",
                options,
                "├ 🔄 *auto* (port acak)",
                "",
                "Pilih port lain atau ketik *auto*."
            ], { emoji: "🔌" })
        )
    }
    
    // ─── Port valid, proses clone ───
    await m.reply("⏳ Membuat server dengan port yang dipilih...")
    
    try {
        const { cloneServer } = await import("../../lib/urgent.js")
        
        // Lock port
        updateLockPort(sender, port)
        
        // Clone server
        const newServer = await cloneServer(server, targetNodeId, port)
        
        // Simpan claim dengan data lengkap
        const newServerId = newServer.attributes?.id || newServer.id
        const ipAlias = getIpAlias()
        const ipAddress = getIpAddress()
        const serverName = server.attributes?.name || server.name || "Server"
        
        claimUUID(uuid, sender, newServerId, {
            port: port,
            ipAlias: ipAlias,
            ipAddress: ipAddress,
            targetNode: String(targetNodeId),
            originalNode: nodeName,
            serverName: serverName
        })
        
        // Kirim notifikasi PLTA
        notifyPlta({
            uuid: uuid,
            ownerJid: sender,
            newServerId: newServerId,
            serverName: serverName,
            port: port,
            ipAlias: ipAlias,
            ipAddress: ipAddress,
            targetNode: String(targetNodeId)
        })
        
        // Release lock
        releaseLock(sender)
        portSessions.delete(sender)
        
        const newServerName = newServer.attributes?.name || newServer.name || `${serverName}_URGENT`
        
        return m.reply(
            card(
                "✅ URGENT SUCCESS",
                [
                    "🎉 Server berhasil di-clone!",
                    "",
                    "─────────────────",
                    "",
                    "📋 *Server Lama:*",
                    `├ Name: ${serverName}`,
                    `├ UUID: ${uuid.substring(0, 12)}...`,
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
                    `✅ Connect: \`${ipAlias}:${port}\``,
                    "",
                    "Server baru sudah dibuat dan siap digunakan!"
                ],
                { emoji: "🎉" }
            )
        )
    } catch (error) {
        releaseLock(sender)
        portSessions.delete(sender)
        console.error("[Urgent Clone Error]", error)
        
        // Cek jika error karena port
        if (error.message.includes("Port")) {
            return m.reply(
                card("PORT ERROR", [
                    `❌ ${error.message}`,
                    "",
                    "Silakan coba dengan port lain atau ketik *auto*."
                ], { emoji: "❌" })
            )
        }
        
        return m.reply(
            card("ERROR", [`❌ Gagal: ${error.message}`], { emoji: "❌" })
        )
    }
}

// Export session checker untuk handler
export function hasPortSession(sender) {
    return portSessions.has(sender)
}

// Export cancel function
export function cancelPortSession(sender) {
    const session = portSessions.get(sender)
    if (session) {
        releaseLock(sender)
        portSessions.delete(sender)
        return true
    }
    return false
}
