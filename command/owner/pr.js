import { smallcaps as sc } from "../../lib/font.js"
import { setNoPrefix } from "../../lib/settings.js"

export default {
    command: ["pr", "noprefix"],

    owner: true,

    category: "Owner",

    description: "Atur apakah command wajib memakai prefix",

    async run({ m, args }) {
        const arg = (args[0] || "").toLowerCase()

        // .pr true  -> user TIDAK perlu prefix (noPrefix = true)
        // .pr false -> user WAJIB pakai prefix (noPrefix = false)
        if (arg !== "true" && arg !== "false") {
            return m.reply(
                `╭─ 🔣 ${sc("PREFIX MODE")} ─⬣\n` +
                    `│\n` +
                    `│ ${sc("Status noprefix")} : ${global.noPrefix ? "✅ ON" : "❌ OFF"}\n` +
                    `│\n` +
                    `│ ${sc("Pakai")}:\n` +
                    `│ ${global.prefix}pr true  → ${sc("tanpa prefix")}\n` +
                    `│ ${global.prefix}pr false → ${sc("wajib prefix")}\n` +
                    `╰──────────────⬣`
            )
        }

        const value = arg === "true"
        setNoPrefix(value)

        return m.reply(
            `╭─ 🔣 ${sc("PREFIX MODE")} ─⬣\n` +
                `│\n` +
                (value
                    ? `│ ✅ ${sc("Mode tanpa prefix AKTIF")}.\n` +
                      `│ ${sc("Command bisa langsung diketik")}\n` +
                      `│ ${sc("tanpa")} "${global.prefix}". ${sc("Contoh")}: menu\n`
                    : `│ ✅ ${sc("Command WAJIB pakai prefix")}.\n` +
                      `│ ${sc("Contoh")}: ${global.prefix}menu\n`) +
                `╰──────────────⬣`
        )
    }
}
