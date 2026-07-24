import Button from "../../lib/button.js"
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
    getPanelUrl,
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

const portSessions = new Map()

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
        buttons
    })
}

export default {
    command: ["urgent"],
    category: "User",
    description: "Claim server darurat (Emergency)",

    async run({ sock, m, args }) {
        if (!isUrgentOpen()) {
            return m.reply(card("URGENT SYSTEM", [
                "🔴 Sistem urgent sedang *DITUTUP*.",
                "",
                "Owner belum membuka akses urgent.",
                "",
                "_Hubungi owner untuk info lebih lanjut._"
            ], { emoji: "🔴" }))
        }

        if (hasActiveLock(m.sender)) {
            const lock = getLockInfo(m.sender)
            return m.reply(card("PORT REQUEST AKTIF", [
                "⚠️ Kamu masih punya request yang belum selesai.",
                "",
                `📋 UUID: ${lock.uuid?.substring(0, 12)}...`,
                lock.port ? `🔌 Port: ${lock.port}` : "",
                "",
                `Sisa waktu: ${Math.ceil((lock.expiresAt - Date.now()) / 60000)} menit`,
                "",
                "Ketik nomor port yang kamu inginkan:",
                "",
                "_Contoh: 25565_"
            ], { emoji: "⏳" }))
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
                "• Kamu akan mendapat server *identik* dengan server asli",
                "• Port akan dipilih setelah UUID diverifikasi"
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

        try {
            const result = await findServerNode(uuid)

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

            if (isNodeBlacklisted(nodeId)) {
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
                return m.reply(card("NODE NOT ALLOWED", [
                    `⚠️ Node *${nodeName}* (ID: ${nodeId})`,
                    "",
                    "Tidak diizinkan untuk emergency clone.",
                    "",
                    "_Hubungi owner._"
                ], { emoji: "⚠️" }))
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

            createLock(m.sender, uuid)

            const availablePorts = await getAvailablePortList(targetNodeId, 5)
            const autoPort = await generateAvailablePort(targetNodeId)

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

            let portOptions = ""
            for (const port of availablePorts) {
                portOptions += "├ 🔌 `" + port + "`\n"
            }

            const serverName = server.attributes?.name || server.name || "Server"

            return m.reply(card("🔌 PILIH PORT", [
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
                "_Contoh ketik: 25565_",
                "_atau ketik: auto_",
                "",
                "⚠️ Port akan di-lock selama 5 menit."
            ], { emoji: "🔌" }))
        } catch (error) {
            console.error("[Urgent Error]", error)
            releaseLock(m.sender)
            return m.reply(card("ERROR", [
                `❌ Gagal mencari server.`,
                "",
                `*Error:* ${error.message}`,
                "",
                "_Coba lagi atau hubungi owner._"
            ], { emoji: "❌" }))
        }
    }
}

export async function handlePortInput(sock, m, input) {
    const sender = m.sender
    const session = portSessions.get(sender)
    if (!session) return null

    const inputPort = String(input).trim().toLowerCase()

    if (inputPort === "auto" || inputPort === "acak" || inputPort === "random") {
        const { uuid, server, nodeName, targetNodeId } = session

        await m.reply("⏳ Membuat server dengan port auto...")

        try {
            const { cloneServer } = await import("../../lib/urgent.js")

            const autoPort = await generateAvailablePort(targetNodeId)
            if (!autoPort) {
                releaseLock(sender)
                portSessions.delete(sender)
                return m.reply(card("ERROR", ["❌ Tidak ada port tersedia."], { emoji: "❌" }))
            }

            updateLockPort(sender, autoPort)

            const newServer = await cloneServer(server, targetNodeId, autoPort)
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

            releaseLock(sender)
            portSessions.delete(sender)

            const newServerName = newServer.attributes?.name || newServer.name || serverName + "_URGENT"

            return await sendCloneSuccess(sock, m, {
                uuid,
                serverName,
                nodeName,
                newServerName,
                newServerId,
                port: autoPort
            })
        } catch (error) {
            releaseLock(sender)
            portSessions.delete(sender)
            console.error("[Urgent Port Auto Error]", error)
            return m.reply(card("ERROR", ["❌ Gagal: " + error.message], { emoji: "❌" }))
        }
    }

    const port = parseInt(inputPort)

    if (isNaN(port) || port < 1 || port > 65535) {
        return m.reply(card("ERROR", [
            "❌ Port tidak valid.",
            "",
            "Port harus angka antara 1-65535.",
            "_Contoh: 25565_"
        ], { emoji: "❌" }))
    }

    const { uuid, server, nodeName, targetNodeId } = session

    const lockStatus = isPortLocked(port, sender)
    if (lockStatus.locked) {
        return m.reply(card("PORT TAKEN", [
            `❌ Port *${port}* sedang diproses user lain.`,
            "",
            "Silakan pilih port lain atau ketik *auto* untuk port acak.",
            "",
            "_Contoh ketik: 25565_",
            "_atau ketik: auto_"
        ], { emoji: "🔌" }))
    }

    const available = await isPortAvailable(targetNodeId, port)
    if (!available) {
        const newAvailable = await getAvailablePortList(targetNodeId, 5)
        let options = ""
        for (const p of newAvailable) {
            options += "├ 🔌 `" + p + "`\n"
        }

        return m.reply(card("PORT TAKEN", [
            `❌ Port *${port}* sudah digunakan atau tidak tersedia.`,
            "",
            "Port yang tersedia:",
            options,
            "├ 🔄 *auto* (port acak)",
            "",
            "Pilih port lain atau ketik *auto*."
        ], { emoji: "🔌" }))
    }

    await m.reply("⏳ Membuat server dengan port yang dipilih...")

    try {
        const { cloneServer } = await import("../../lib/urgent.js")

        updateLockPort(sender, port)

        const newServer = await cloneServer(server, targetNodeId, port)
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

        releaseLock(sender)
        portSessions.delete(sender)

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
        releaseLock(sender)
        portSessions.delete(sender)
        console.error("[Urgent Clone Error]", error)

        if (error.message.includes("Port")) {
            return m.reply(card("PORT ERROR", [
                "❌ " + error.message,
                "",
                "Silakan coba dengan port lain atau ketik *auto*."
            ], { emoji: "❌" }))
        }

        return m.reply(card("ERROR", ["❌ Gagal: " + error.message], { emoji: "❌" }))
    }
}

export function hasPortSession(sender) {
    return portSessions.has(sender)
}

export function cancelPortSession(sender) {
    const session = portSessions.get(sender)
    if (session) {
        releaseLock(sender)
        portSessions.delete(sender)
        return true
    }
    return false
}
