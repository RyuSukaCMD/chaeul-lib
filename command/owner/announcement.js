import { card } from "../../lib/ui.js"
import { fullWIB } from "../../lib/time.js"
import { listRegisteredGroups } from "../../lib/groupmanage.js"

export default {
    command: ["announcement", "announce", "bc", "broadcast"],

    owner: true,

    category: "Owner",

    description: "Broadcast pengumuman ke semua grup terdaftar",

    async run({ sock, m, text }) {
        if (!text) {
            return m.reply(
                card(
                    "ANNOUNCEMENT",
                    [
                        `Masukkan pesan pengumuman.`,
                        ``,
                        `Contoh:`,
                        `${global.prefix}announcement Halo semua!`
                    ],
                    { emoji: "📢" }
                )
            )
        }

        const groups = listRegisteredGroups()
        if (!groups.length) {
            return m.reply(card("ANNOUNCEMENT", "Belum ada grup terdaftar.", { emoji: "📢" }))
        }

        const body =
            `╭━━━━━━━━━━━━━━━━━━━⬣\n` +
            `┃  📢 *PENGUMUMAN* Chaeul\n` +
            `┃  🕒 ${fullWIB()}\n` +
            `┣━━━━━━━━━━━━━━━━━━━⬣\n` +
            `┃\n${text
                .split("\n")
                .map((l) => `┃ ${l}`)
                .join("\n")}\n┃\n` +
            `╰━━━━━━━━━━━━━━━━━━━⬣`

        await m.react("📢")

        let ok = 0
        for (const gjid of groups) {
            try {
                await sock.sendMessage(gjid, { text: body })
                ok++
                await new Promise((r) => setTimeout(r, 800)) // jeda anti-spam
            } catch {}
        }

        return m.reply(
            card("ANNOUNCEMENT", [`✅ Terkirim ke ${ok}/${groups.length} grup terdaftar.`], {
                emoji: "📢"
            })
        )
    }
}
