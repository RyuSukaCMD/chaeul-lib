import { addBlacklist, isBlacklist } from "../../lib/blacklistgroup.js"
import { card } from "../../lib/ui.js"
import { allowSilenceTemporarily } from "../../lib/silenceGuard.js"

export default {
    command: ["blacklistgroup", "blgroup"],

    owner: true,

    category: "Owner",

    description: "Blacklist grup saat ini",

    async run({ m }) {
        if (!m.isGroup) {
            return m.reply(
                card("BLACKLIST GROUP", "Command hanya bisa dipakai di grup.", { emoji: "🚫" })
            )
        }

        if (isBlacklist(m.chat)) {
            return m.reply(card("BLACKLIST GROUP", "Grup ini sudah diblacklist.", { emoji: "🚫" }))
        }

        addBlacklist(m.chat)

        // Grup langsung mati total → izinkan konfirmasi terakhir ini lewat.
        allowSilenceTemporarily(m.chat)

        await m.react("✅")

        return m.reply(
            card(
                "BLACKLIST GROUP",
                [
                    "✅ Grup ditambahkan ke blacklist.",
                    "",
                    "Bot kini BENAR-BENAR mati di grup ini:",
                    "• tidak ada command / tombol / antilink",
                    "• tidak ada notifikasi apa pun",
                    "• tidak ada teks \"grup belum terdaftar\"",
                    "",
                    `Pulihkan dengan: ${global.prefix}delbl (owner)`,
                    "",
                    `🆔 ${m.chat}`
                ],
                { emoji: "🚫" }
            )
        )
    }
}
