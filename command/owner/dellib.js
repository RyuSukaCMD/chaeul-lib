import fs from "fs"
import { card } from "../../lib/ui.js"

function wib() {
    const d = new Date()

    const fmt = new Intl.DateTimeFormat(
        "id-ID",

        {
            timeZone: "Asia/Jakarta",

            year: "numeric",

            month: "2-digit",

            day: "2-digit",

            hour: "2-digit",

            minute: "2-digit",

            second: "2-digit",

            hour12: false
        }
    ).formatToParts(d)

    const get = (t) => fmt.find((x) => x.type === t).value

    return `${get("year")}-${get("month")}-${get("day")}_${get("hour")}-${get("minute")}-${get("second")}`
}

export default {
    command: ["dellib"],

    owner: true,

    category: "Owner",

    description: "Hapus Library",

    async run({
        m,

        args
    }) {
        if (!args[0])
            return m.reply(
                card("DEL LIB", ["Contoh:", `${global.prefix}dellib button.js`], { emoji: "📚" })
            )

        const file = args[0].endsWith(".js") ? args[0] : `${args[0]}.js`

        const target = `./lib/${file}`

        const backupDir = "./libbackup"

        if (!fs.existsSync(target))
            return m.reply(card("DEL LIB", "Library tidak ditemukan.", { emoji: "📚" }))

        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir)

        const backupName = `${wib()}_${file}`
        fs.renameSync(target, `${backupDir}/${backupName}`)

        await m.react("✅")

        return m.reply(
            card(
                "DEL LIB",
                [`✅ Library dihapus.`, `📁 ${file}`, `💾 Backup: libbackup/${backupName}`],
                {
                    emoji: "📚",
                    footer: "⚠️ lib/ di-sync dari chaeul-lib; ubah permanen di sana."
                }
            )
        )
    }
}
