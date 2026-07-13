import { getAllUsers } from "../../lib/register.js"
import { getBalance, hasAccount } from "../../lib/token.js"

export default {
    command: ["listuser", "listusers", "users"],

    owner: true,

    category: "Owner",

    description: "Menampilkan daftar user terdaftar",

    async run({ m }) {
        const users = getAllUsers()

        if (!users.length) {
            return m.reply(
                `╭━━━〔 👥 LIST USER 〕━━━⬣\n` +
                    `Belum ada user terdaftar.\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }

        let text = `╭━━━〔 👥 LIST USER 〕━━━⬣\n\n`

        let no = 1
        const mentions = []

        for (const u of users) {
            const jid = `${u.number}@s.whatsapp.net`
            mentions.push(jid)

            // Dukung skema lama (username) & baru (name/gender/age)
            const nama = u.name || u.username || "-"
            const detail = u.gender ? `${u.gender}, ${u.age || "-"} th` : u.platform || ""
            const token = hasAccount(u.number) ? `${getBalance(u.number)} 🪙` : "tanpa akun"

            text += `${no++}. ${nama}\n`
            text += `   └ @${u.number}\n`
            if (detail) text += `   └ ${detail}\n`
            text += `   └ Token: ${token}\n\n`
        }

        text += `━━━━━━━━━━━━━━━━━━\n`
        text += `📊 Total : ${users.length} user\n`
        text += `╰━━━━━━━━━━━━━━━━━━⬣`

        return m.reply(text, { mentions })
    }
}
