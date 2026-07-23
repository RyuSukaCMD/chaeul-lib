import { card } from "../../lib/ui.js"
import {
    whitelistNode,
    removeWhitelistNode,
    getWhitelistNodes,
    isNodeWhitelisted
} from "../../lib/urgent.js"
import { getNodes } from "../../lib/pterodactyl.js"

export default {
    command: ["wlnode", "whitelistnode"],

    owner: true,

    category: "Owner",

    description: "Whitelist node untuk sistem urgent",

    async run({ sock, m, args }) {
        // ─── Tampilkan help / list ───
        if (!args[0] || args[0] === "list") {
            const whitelist = getWhitelistNodes()
            const nodes = await getNodes().catch(() => ({ data: [] }))
            const nodeList = nodes?.data || nodes || []

            let listText = ""
            if (whitelist.length === 0) {
                listText =
                    "Tidak ada node spesifik di-whitelist.\nSemua node (kecuali yang di-blacklist) boleh."
            } else {
                for (const nodeId of whitelist) {
                    const node = nodeList.find((n) => String(n.id) === String(nodeId))
                    const name = node?.name || `Node ${nodeId}`
                    listText += `├ ✅ ${name} (ID: ${nodeId})\n`
                }
            }

            return m.reply(
                card(
                    "WHITELIST NODE",
                    [
                        "📋 Daftar node yang di-whitelist:",
                        "",
                        listText,
                        "",
                        "─────────────────",
                        "",
                        "📝 *Catatan:*",
                        "• Jika whitelist kosong, semua node boleh",
                        "• Jika ada whitelist, hanya node tsb yang boleh",
                        "",
                        `${global.prefix}wlnode <node_id>  - Whitelist node`,
                        `${global.prefix}wlnode rm <id>    - Hapus dari whitelist`
                    ],
                    { emoji: "✅" }
                )
            )
        }

        // ─── Hapus dari whitelist ───
        if (args[0] === "rm" || args[0] === "remove" || args[0] === "del") {
            if (!args[1]) {
                return m.reply(
                    card("ERROR", ["❌ Sertakan node ID.", "", `Contoh: ${global.prefix}wlnode rm 1`], {
                        emoji: "❌"
                    })
                )
            }

            const nodeId = args[1].trim()
            const whitelist = getWhitelistNodes()

            if (!isNodeWhitelisted(nodeId)) {
                return m.reply(
                    card("INFO", [`ℹ️ Node ${nodeId} tidak ada di whitelist.`], {
                        emoji: "ℹ️"
                    })
                )
            }

            removeWhitelistNode(nodeId)

            return m.reply(
                card(
                    "✅ REMOVED",
                    [`ℹ️ Node *${nodeId}* dihapus dari whitelist.`],
                    { emoji: "✅" }
                )
            )
        }

        // ─── Whitelist node ───
        const nodeId = args[0].trim()

        if (!nodeId || isNaN(Number(nodeId))) {
            return m.reply(
                card("ERROR", ["❌ Node ID harus angka.", "", `Contoh: ${global.prefix}wlnode 1`], {
                    emoji: "❌"
                })
            )
        }

        // Whitelist node
        whitelistNode(nodeId)

        // Ambil nama node jika bisa
        let nodeName = ""
        try {
            const nodes = await getNodes()
            const nodeList = nodes?.data || nodes || []
            const node = nodeList.find((n) => String(n.id) === String(nodeId))
            if (node) nodeName = ` (${node.name})`
        } catch {}

        return m.reply(
            card(
                "✅ WHITELISTED",
                [
                    `✅ Node *${nodeId}*${nodeName} berhasil di-whitelist.`,
                    "",
                    "Hanya node ini (dan yang di-whitelist lain) yang boleh digunakan untuk `.urgent`."
                ],
                { emoji: "✅" }
            )
        )
    }
}
