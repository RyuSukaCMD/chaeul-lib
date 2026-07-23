import { card } from "../../lib/ui.js"
import {
    isUrgentOpen,
    findServerNode,
    isNodeBlacklisted,
    isNodeAllowed,
    getUrgentConfig,
    claimUUID
} from "../../lib/urgent.js"

export default {
    command: ["urgent"],

    category: "Owner",

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
                        "• Kamu akan mendapat server *identik* dengan server asli"
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
        const { getClaimedUUIDs } = await import("../../lib/urgent.js")
        const allClaimed = getClaimedUUIDs()
        const claimInfo = allClaimed[uuid.toLowerCase()]
        if (claimInfo) {
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

            // ─── Proses Clone ───
            await m.reply("⏳ Membuat server emergency...")

            const config = getUrgentConfig()
            const defaultNodeId = config.defaultNode

            if (!defaultNodeId) {
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

            // Import cloneServer di sini untuk lazy load
            const { cloneServer } = await import("../../lib/urgent.js")

            const newServer = await cloneServer(server, defaultNodeId)

            // ─── Simpan claim ───
            const newServerId = newServer.attributes?.id || newServer.id
            claimUUID(uuid, m.sender, newServerId)

            // ─── Success Message ───
            const serverName = server.attributes?.name || server.name || "Server"
            const newServerName = newServer.attributes?.name || newServer.name || `${serverName}_URGENT`

            return m.reply(
                card(
                    "✅ URGENT SUCCESS",
                    [
                        "🎉 Server berhasil di-clone!",
                        "",
                        "─────────────────",
                        "",
                        "📋 *Detail Server Lama:*",
                        `├ Name: ${serverName}`,
                        `├ UUID: ${uuid}`,
                        `├ Node: ${nodeName}`,
                        "",
                        "📋 *Detail Server Baru:*",
                        `├ Name: ${newServerName}`,
                        `├ UUID: ${newServerId}`,
                        `├ Node ID: ${defaultNodeId}`,
                        "",
                        "─────────────────",
                        "",
                        "✅ Server baru sudah dibuat dan siap digunakan!",
                        "",
                        "_Silakan cek panel untuk menghidupkan server baru._"
                    ],
                    { emoji: "🎉" }
                )
            )
        } catch (error) {
            console.error("[Urgent Error]", error)
            return m.reply(
                card(
                    "ERROR",
                    [
                        `❌ Gagal membuat emergency server.`,
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
