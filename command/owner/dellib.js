import fs from "fs"

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
                `Contoh:

${global.prefix}dellib button.js`
            )

        const file = args[0].endsWith(".js") ? args[0] : `${args[0]}.js`

        const target = `./lib/${file}`

        const backupDir = "./libbackup"

        if (!fs.existsSync(target)) return m.reply("❌ Library tidak ditemukan.")

        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir)

        fs.renameSync(
            target,

            `${backupDir}/${wib()}_${file}`
        )

        return m.reply(
            `✅ Library berhasil dihapus.

📁 ${file}

Backup:

libbackup/${wib()}_${file}`
        )
    }
}
