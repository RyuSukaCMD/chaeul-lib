import { addBlacklist, isBlacklist } from "../../lib/blacklistgroup.js"
import { card } from "../../lib/ui.js"

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

        await m.react("✅")

        return m.reply(
            card(
                "BLACKLIST GROUP",
                [
                    "✅ Grup ditambahkan ke blacklist.",
                    "",
                    "Bot tidak akan membalas command apa pun",
                    "di grup ini (diam, tanpa pesan penolakan).",
                    "",
                    "Owner & trusted user tetap bisa memakai",
                    "command seperti biasa.",
                    "",
                    "ℹ️ Notifikasi & sistem lain tidak terpengaruh.",
                    `Atur notifikasi lewat: ${global.prefix}disable`,
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
