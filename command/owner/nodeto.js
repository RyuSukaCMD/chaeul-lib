import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import {
    setDefaultNode,
    clearDefaultNode,
    getUrgentConfig
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
                    // getNodes() mengembalikan array yang sudah di-unwrap
                    const nodes = await getNodes()
                    const node = nodes.find(
                        (n) => String(n.id ?? n.attributes?.id) === String(currentNode)
                    )
                    const name = node ? (node.name ?? node.attributes?.name) : null
                    currentName = name ? `${name} (ID: ${currentNode})` : `ID: ${currentNode}`
                } catch {}
            }

            return await Button.menu({
                sock,
                m,
                body: card(
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
                ),
                footer: "© Chaeul",
                lock: m.sender,
                buttons: [{ type: "quick", text: "📋 Daftar Node", id: "nodestatus_list" }]
            })
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
            const node = nodes.find((n) => String(n.id ?? n.attributes?.id) === String(nodeId))
            if (node) {
                nodeExists = true
                nodeName = node.name ?? node.attributes?.name ?? ""
            }
        } catch (error) {
            console.warn("[NodeTo] Gagal validasi node:", error.message)
        }

        if (!nodeExists) {
            return await Button.menu({
                sock,
                m,
                body: card(
                    "NODE NOT FOUND",
                    [
                        `❌ Node dengan ID *${nodeId}* tidak ditemukan.`,
                        "",
                        "_Cek daftar node lewat tombol di bawah._"
                    ],
                    { emoji: "❌" }
                ),
                footer: "© Chaeul",
                lock: m.sender,
                buttons: [{ type: "quick", text: "📋 Daftar Node", id: "nodestatus_list" }]
            })
        }

        // Set default node
        setDefaultNode(nodeId)

        return await Button.menu({
            sock,
            m,
            body: card(
                "✅ NODE SET",
                [
                    `🖥️ Node target berhasil diset:`,
                    `*${nodeName}* (ID: ${nodeId})`,
                    "",
                    "Server emergency akan dibuat di node ini."
                ],
                { emoji: "🖥️" }
            ),
            footer: "© Chaeul",
            lock: m.sender,
            buttons: [
                { type: "quick", text: "🖥️ Cek Node", id: `nodestatus_detail:${nodeId}` },
                { type: "quick", text: "📋 Daftar Node", id: "nodestatus_list" }
            ]
        })
    }
}
