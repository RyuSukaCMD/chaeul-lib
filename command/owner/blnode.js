import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import {
    getBlacklistNodes,
    removeBlacklistNode,
    getUrgentMode
} from "../../lib/urgent.js"
import { sendNodePicker, applyNodePick } from "../../lib/nodepicker.js"

const LOCK_RX = /​#lock=\d+$/
const cleanBody = (m) => String(m.body || "").replace(LOCK_RX, "").trim()

export default {
    command: [
        "blnode",
        "blacklistnode",
        /^blnode_pick:\d+$/,
        /^blnode_list$/
    ],

    owner: true,

    category: "Owner",

    description: "Blacklist node dari sistem urgent",

    async run({ sock, m, args }) {
        // ─── Router klik button ───
        const body = cleanBody(m)
        if (body === "blnode_list") {
            return await sendNodePicker({ sock, m, action: "blacklist" })
        }
        if (body.startsWith("blnode_pick:")) {
            return await applyNodePick({ sock, m, action: "blacklist", nodeId: body.split(":")[1] })
        }

        // ─── Tanpa argumen / "list" → picker interaktif seluruh node ───
        if (!args[0] || args[0] === "list") {
            await m.reply("⏳ Mengambil daftar node dari panel...")
            try {
                return await sendNodePicker({ sock, m, action: "blacklist" })
            } catch (error) {
                return m.reply(card("ERROR", [`❌ ${error.message}`], { emoji: "❌" }))
            }
        }

        // ─── Hapus dari blacklist (ketik manual) ───
        if (args[0] === "rm" || args[0] === "remove" || args[0] === "del") {
            const nodeId = (args[1] || "").trim()

            if (!nodeId) {
                return m.reply(card("ERROR", ["❌ Sertakan node ID.", "", `Contoh: ${global.prefix}blnode rm 1`], { emoji: "❌" }))
            }

            // ATURAN: dalam mode blacklist, tidak dapat unblacklist
            if (getUrgentMode() === "blacklist" && getBlacklistNodes().includes(nodeId)) {
                return m.reply(
                    card(
                        "TIDAK DAPAT UNBLACKLIST",
                        [
                            `🚫 Dalam *mode blacklist*, node tidak dapat di-unblacklist.`,
                            "",
                            `_Ubah mode dengan ${global.prefix}urgentmode whitelist bila ingin mengelola ulang._`
                        ],
                        { emoji: "🚫" }
                    )
                )
            }

            if (!getBlacklistNodes().includes(nodeId)) {
                return m.reply(card("INFO", [`ℹ️ Node ${nodeId} tidak ada di blacklist.`], { emoji: "ℹ️" }))
            }

            removeBlacklistNode(nodeId)

            return m.reply(card("✅ REMOVED", [`➖ Node *${nodeId}* dihapus dari blacklist.`], { emoji: "✅" }))
        }

        // ─── Tambah blacklist via ID (guard sama seperti pick) ───
        const nodeId = args[0].trim()

        if (!nodeId || isNaN(Number(nodeId))) {
            return m.reply(
                card("ERROR", ["❌ Node ID harus angka.", "", `Contoh: ${global.prefix}blnode 1`], { emoji: "❌" })
            )
        }

        try {
            return await applyNodePick({ sock, m, action: "blacklist", nodeId })
        } catch (error) {
            return m.reply(card("ERROR", [`❌ ${error.message}`], { emoji: "❌" }))
        }
    }
}
