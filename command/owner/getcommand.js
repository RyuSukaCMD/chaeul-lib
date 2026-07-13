import fs from "fs"
import path from "path"

export default {
    command: ["getcommand", "getcmd"],

    owner: true,

    category: "Owner",

    description: "Get Command Source",

    async run({ m, text }) {
        if (!text)
            return m.reply(
                `Contoh:

${global.prefix}getcommand owner/listcommand.js`
            )

        const root = path.resolve("./command")

        const file = path.resolve(
            root,

            text.trim()
        )

        if (!file.startsWith(root)) return m.reply("Path tidak valid.")

        if (!fs.existsSync(file)) return m.reply("File tidak ditemukan.")

        if (
            fs
                .statSync(file)

                .isDirectory()
        )
            return m.reply("Target harus berupa file.")

        const code = fs.readFileSync(
            file,

            "utf8"
        )

        return m.reply(
            `╭━━━〔 📄 COMMAND SOURCE 〕━━━⬣

📁 ${text}

\`\`\`javascript
${code}
\`\`\`

╰━━━━━━━━━━━━━━━━━━⬣`
        )
    }
}
