import { card } from "../../lib/ui.js"
import { checkAdmin } from "../../lib/groupadmin.js"

export default {
    command: ["del", "delete", "d"],

    category: "Group",

    description: "Hapus pesan yang di-reply (butuh bot admin)",

    async run({ sock, m, isCreator }) {
        if (!m.isGroup) return m.reply("Command ini hanya untuk grup.")

        const { isAdmin, isBotAdmin } = await checkAdmin(sock, m, isCreator)
        if (!isAdmin) return m.reply(card("GROUP", "Khusus admin grup.", { emoji: "🔒" }))

        if (!m.quoted) {
            return m.reply(card("DELETE", "Reply pesan yang mau dihapus dulu.", { emoji: "🗑️" }))
        }
        if (!isBotAdmin) {
            return m.reply(
                card("DELETE", "Bot harus jadi admin untuk menghapus pesan.", { emoji: "⚠️" })
            )
        }

        const key = {
            remoteJid: m.chat,
            fromMe: false,
            id: m.quoted.id || m.quoted.key?.id,
            participant: m.quoted.sender || m.quoted.key?.participant
        }

        try {
            await sock.sendMessage(m.chat, { delete: key })
            await m.react("🗑️")
        } catch (e) {
            return m.reply(card("DELETE", "Gagal menghapus pesan.", { emoji: "⚠️" }))
        }
    }
}
