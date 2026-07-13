import { card } from "../lib/ui.js"

export default {
    command: ["hidetag", "ht"],

    category: "Owner",

    owner: true,

    description: "Mention semua member (tersembunyi)",

    async run({ sock, m, text }) {
        if (!m.isGroup) {
            return m.reply(card("HIDETAG", "Command hanya bisa dipakai di grup.", { emoji: "📢" }))
        }

        if (!text) {
            return m.reply(
                card(
                    "HIDETAG",
                    ["Masukkan pesan.", "", `Contoh:`, `${global.prefix}hidetag Halo semua!`],
                    {
                        emoji: "📢"
                    }
                )
            )
        }

        const metadata = await sock.groupMetadata(m.chat)
        const mentions = metadata.participants.map((v) => v.id)

        await sock.sendMessage(m.chat, { text, mentions }, { quoted: m })
    }
}
