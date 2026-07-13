import { resolvePn, tag } from "../../lib/resolve.js"
import { isAfk, setAfk } from "../../lib/afk.js"

export default {
    command: ["afk"],

    category: "Main",

    description: "Mengaktifkan mode AFK (Away From Keyboard)",

    // AFK gratis (tidak memotong token)
    free: true,

    async run({ sock, m, text }) {
        const me = await resolvePn(sock, m, m.sender)

        if (isAfk(me)) {
            return m.reply(
                `╭━━━〔 🌙 AFK 〕━━━⬣\n` + `Kamu sudah dalam mode AFK.\n` + `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }

        setAfk(me, text)

        await m.react("🌙")

        return m.reply(
            `╭━━━〔 🌙 AFK MODE ON 〕━━━⬣\n` +
                `┃\n` +
                `┃ 👤 ${tag(me)}\n` +
                `┃ 📝 Alasan : ${text || "Tidak ada"}\n` +
                `┃ 🕒 Sejak  : sekarang\n` +
                `┃\n` +
                `┃ Kamu akan otomatis keluar\n` +
                `┃ dari AFK saat mengirim pesan.\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`,
            { mentions: [me] }
        )
    }
}
