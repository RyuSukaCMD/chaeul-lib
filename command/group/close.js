import { card } from "../../lib/ui.js"
import { checkAdmin } from "../../lib/groupadmin.js"

export default {
    command: ["close", "open", "grouptutup", "groupbuka"],

    category: "Group",

    description: "Tutup/buka grup (hanya admin yang bisa kirim pesan / semua bisa)",

    async run({ sock, m, command, isCreator }) {
        if (!m.isGroup) return m.reply("Command ini hanya untuk grup.")

        const { isAdmin, isBotAdmin } = await checkAdmin(sock, m, isCreator)
        if (!isAdmin) return m.reply(card("GROUP", "Khusus admin grup.", { emoji: "🔒" }))
        if (!isBotAdmin)
            return m.reply(card("GROUP", "Bot harus jadi admin untuk ini.", { emoji: "⚠️" }))

        const close = command === "close" || command === "grouptutup"
        const mode = close ? "announcement" : "not_announcement"

        try {
            await sock.groupSettingUpdate(m.chat, mode)
            await m.react(close ? "🔒" : "🔓")
            return m.reply(
                card(
                    close ? "GRUP DITUTUP" : "GRUP DIBUKA",
                    close
                        ? ["🔒 Hanya admin yang bisa kirim pesan sekarang."]
                        : ["🔓 Semua anggota bisa kirim pesan lagi."],
                    { emoji: close ? "🔒" : "🔓" }
                )
            )
        } catch (e) {
            return m.reply(card("GROUP", "Gagal mengubah pengaturan grup.", { emoji: "⚠️" }))
        }
    }
}
