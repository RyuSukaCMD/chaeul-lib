import { card } from "../../lib/ui.js"
import {
    blacklistNode,
    getBlacklistNodes,
    isNodeBlacklisted
} from "../../lib/urgent.js"
import { getNodes } from "../../lib/pterodactyl.js"

export default {
    command: ["blnode", "blacklistnode"],

    owner: true,

    category: "Owner",

    description: "Blacklist node dari sistem urgent",

    async run({ sock, m, args }) {
        // ─── Tampilkan help ───
        if (!args[0] || args[0] === "list") {
            const blacklist = getBlacklistNodes()
            // getNodes() mengembalikan array yang sudah di-unwrap
            const nodeList = await getNodes().catch(() => [])

            let listText = ""
            if (blacklist.length === 0) {
                listText = "Tidak ada node yang di-blacklist."
            } else {
                for (const nodeId of blacklist) {
                    const node = nodeList.find((n) => String(n.id ?? n.attributes?.id) === String(nodeId))
                    const name = node?.name ?? node?.attributes?.name ?? `Node ${nodeId}`
                    listText += `├ 🛑 ${name} (ID: ${nodeId})\n`
                }
            }

            return m.reply(
                card(
                    "BLACKLIST NODE",
                    [
                        "📋 Daftar node yang diblacklist:",
                        "",
                        listText || "Tidak ada.",
                        "",
                        "─────────────────",
                        "",
                        `${global.prefix}blnode <node_id>  - Blacklist node`,
                        `${global.prefix}wlnode <node_id>  - Whitelist node`
                    ],
                    { emoji: "🛑" }
                )
            )
        }

        // ─── Blacklist node ───
        const nodeId = args[0].trim()

        if (!nodeId || isNaN(Number(nodeId))) {
            return m.reply(
                card("ERROR", ["❌ Node ID harus angka.", "", `Contoh: ${global.prefix}blnode 1`], {
                    emoji: "❌"
                })
            )
        }

        // Cek apakah sudah di-blacklist
        if (isNodeBlacklisted(nodeId)) {
            return m.reply(
                card("INFO", [`ℹ️ Node ${nodeId} sudah di-blacklist sebelumnya.`], {
                    emoji: "ℹ️"
                })
            )
        }

        // Blacklist node
        blacklistNode(nodeId)

        // Ambil nama node jika bisa
        let nodeName = ""
        try {
            const nodeList = await getNodes()
            const node = nodeList.find((n) => String(n.id ?? n.attributes?.id) === String(nodeId))
            const name = node?.name ?? node?.attributes?.name
            if (name) nodeName = ` (${name})`
        } catch {}

        return m.reply(
            card(
                "✅ BLACKLISTED",
                [
                    `🛑 Node *${nodeId}*${nodeName} berhasil di-blacklist.`,
                    "",
                    "Server dari node ini tidak bisa di-claim dengan `.urgent`."
                ],
                { emoji: "🛑" }
            )
        )
    }
}
