import { card } from "../../lib/ui.js"
import {
    setDefaultNode,
    clearDefaultNode,
    getUrgentConfig,
    isNodeBlacklisted
} from "../../lib/urgent.js"
import { getNodes } from "../../lib/pterodactyl.js"

export default {
    command: ["nodeto"],

    owner: true,

    category: "Owner",

    description: "Set node default untuk server urgent",

    async run({ sock, m, args }) {
        const config = getUrgentConfig()

        // ─── Tampilkan help ───
        if (!args[0]) {
            const currentNode = config.defaultNode
            let currentName = "_Belum diset_"

            if (currentNode) {
                try {
                    const nodes = await getNodes()
                    const nodeList = nodes?.data || nodes || []
                    const node = nodeList.find((n) => String(n.id) === String(currentNode))
                    if (node) currentName = `${node.name} (ID: ${currentNode})`
                    else currentName = `ID: ${currentNode}`
                } catch {}
            }

            return m.reply(
                card(
                    "NODE TARGET",
                    [
                        `📍 Node saat ini: *${currentName}*`,
                        "",
                        "─────────────────",
                        "",
                        `${global.prefix}nodeto <node_id>  - Set node target`,
                        `${global.prefix}nodeto clear      - Hapus node target`,
                        "",
                        "─────────────────",
                        "",
                        "📝 Node ini akan digunakan sebagai target",
                        "   untuk membuat server emergency."
                    ],
                    { emoji: "🖥️" }
                )
            )
        }

        // ─── Clear node ───
        if (args[0] === "clear" || args[0] === "reset" || args[0] === "remove") {
            clearDefaultNode()
            return m.reply(
                card("✅ CLEARED", ["🗑️ Node target berhasil dihapus."], { emoji: "🗑️" })
            )
        }

        // ─── Set node ───
        const nodeId = args[0].trim()

        if (!nodeId || isNaN(Number(nodeId))) {
            return m.reply(
                card("ERROR", ["❌ Node ID harus angka.", "", `Contoh: ${global.prefix}nodeto 1`], {
                    emoji: "❌"
                })
            )
        }

        // Validasi: cek apakah node ada
        let nodeExists = false
        let nodeName = ""
        try {
            const nodes = await getNodes()
            const nodeList = nodes?.data || nodes || []
            const node = nodeList.find((n) => String(n.id) === String(nodeId))
            if (node) {
                nodeExists = true
                nodeName = node.name
            }
        } catch (error) {
            console.warn("[NodeTo] Gagal validasi node:", error.message)
        }

        if (!nodeExists) {
            return m.reply(
                card(
                    "NODE NOT FOUND",
                    [
                        `❌ Node dengan ID *${nodeId}* tidak ditemukan.`,
                        "",
                        "_Gunakan .nodestatus untuk lihat daftar node._"
                    ],
                    { emoji: "❌" }
                )
            )
        }

        // Set default node
        setDefaultNode(nodeId)

        return m.reply(
            card(
                "✅ NODE SET",
                [
                    `🖥️ Node target berhasil diset: *${nodeName}* (ID: ${nodeId})`,
                    "",
                    "Server emergency akan dibuat di node ini."
                ],
                { emoji: "🖥️" }
            )
        )
    }
}
