import { smallcaps as sc } from "../../lib/font.js"
import { setPrefix } from "../../lib/settings.js"

export default {
    command: ["prefix", "setprefix"],

    owner: true,

    category: "Owner",

    description: "Mengubah prefix bot",

    async run({ m, args }) {
        const value = (args[0] || "").trim()

        if (!value) {
            return m.reply(
                `╭─ 🔣 ${sc("PREFIX")} ─⬣\n` +
                    `│\n` +
                    `│ ${sc("Prefix sekarang")} : ${global.prefix}\n` +
                    `│\n` +
                    `│ ${sc("Ganti")}:\n` +
                    `│ ${global.prefix}prefix !\n` +
                    `╰──────────────⬣`
            )
        }

        // Batasi 1-3 karakter simbol agar aman
        if (value.length > 3) {
            return m.reply("Prefix maksimal 3 karakter.")
        }

        setPrefix(value)

        return m.reply(
            `╭─ 🔣 ${sc("PREFIX")} ─⬣\n` +
                `│\n` +
                `│ ✅ ${sc("Prefix diubah menjadi")} : ${value}\n` +
                `│ ${sc("Contoh")} : ${value}menu\n` +
                `╰──────────────⬣`
        )
    }
}
