import fs from "fs"

export default {
    command: ["listlib"],

    owner: true,

    category: "Owner",

    description: "List Library",

    async run({ m }) {
        if (!fs.existsSync("./lib")) return m.reply("❌ Folder lib tidak ditemukan.")

        const files = fs
            .readdirSync("./lib")

            .filter((file) => file.endsWith(".js"))

            .sort()

        if (!files.length) return m.reply("❌ Tidak ada library.")

        let text = `╭━━━〔 📚 LIBRARY LIST 〕━━━⬣

Total
${files.length}

`

        for (const file of files) {
            const stat = fs.statSync(`./lib/${file}`)

            const size = (stat.size / 1024).toFixed(2)

            text += `• ${file}
  ${size} KB

`
        }

        text += "╰━━━━━━━━━━━━━━━━━━⬣"

        return m.reply(text)
    }
}
