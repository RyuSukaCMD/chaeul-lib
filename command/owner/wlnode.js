import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import {
    getWhitelistNodes,
    removeWhitelistNode,
    getUrgentMode
} from "../../lib/urgent.js"
import { sendNodePicker, applyNodePick } from "../../lib/nodepicker.js"

const LOCK_RX = /​#lock=\d+$/
const cleanBody = (m) => String(m.body || "").replace(LOCK_RX, "").trim()

export default {
    command: [
        "wlnode",
        "whitelistnode",
        /^wlnode_pick:\d+$/,
        /^wlnode_list$/
    ],

    owner: true,

    category: "Owner",

    description: "Whitelist node untuk sistem urgent",

    async run({ sock, m, args }) {
        // ─── Router klik button ───
        const body = cleanBody(m)
        if (body === "wlnode_list") {
            return await sendNodePicker({ sock, m, action: "whitelist" })
        }
        if (body.startsWith("wlnode_pick:")) {
            return await applyNodePick({ sock, m, action: "whitelist", nodeId: body.split(":")[1] })
        }

        // ─── Tanpa argumen / "list" → picker interaktif seluruh node ───
        if (!args[0] || args[0] === "list") {
            await m.reply("⏳ Mengambil daftar node dari panel...")
            try {
                return await sendNodePicker({ sock, m, action: "whitelist" })
            } catch (error) {
                return m.reply(card("ERROR", [`❌ ${error.message}`], { emoji: "❌" }))
            }
        }

        // ─── Hapus dari whitelist (ketik manual) ───
        if (args[0] === "rm" || args[0] === "remove" || args[0] === "del") {
            const nodeId = (args[1] || "").trim()

            if (!nodeId) {
                return m.reply(card("ERROR", ["❌ Sertakan node ID.", "", `Contoh: ${global.prefix}wlnode rm 1`], { emoji: "❌" }))
            }

            if (!getWhitelistNodes().includes(nodeId)) {
                return m.reply(card("INFO", [`ℹ️ Node ${nodeId} tidak ada di whitelist.`], { emoji: "ℹ️" }))
            }

            removeWhitelistNode(nodeId)

            return m.reply(card("✅ REMOVED", [`➖ Node *${nodeId}* dihapus dari whitelist.`], { emoji: "✅" }))
        }

        // ─── Tambah whitelist via ID (guard sama seperti pick) ───
        const nodeId = args[0].trim()

        if (!nodeId || isNaN(Number(nodeId))) {
            return m.reply(
                card("ERROR", ["❌ Node ID harus angka.", "", `Contoh: ${global.prefix}wlnode 1`], { emoji: "❌" })
            )
        }

        try {
            return await applyNodePick({ sock, m, action: "whitelist", nodeId })
        } catch (error) {
            return m.reply(card("ERROR", [`❌ ${error.message}`], { emoji: "❌" }))
        }
    }
}
