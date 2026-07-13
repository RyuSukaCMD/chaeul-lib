import fs from "fs"
import path from "path"

import { createSession } from "../../lib/addcommand.js"

export default {
    command: ["addcommand", "addcmd"],

    owner: true,

    category: "Owner",

    description: "Add Command",

    async run({ m, text }) {
        if (!text)
            return m.reply(
                `Contoh:

.addcommand owner/ping.js`
            )

        if (!text.endsWith(".js")) return m.reply("File harus berekstensi .js")

        const file = path.join(
            "./command",

            text
        )

        const dir = path.dirname(file)

        fs.mkdirSync(
            dir,

            {
                recursive: true
            }
        )

        if (fs.existsSync(file)) return m.reply("❌ Command sudah ada.")

        createSession(
            m.sender,

            file
        )

        return m.reply(
            `╭━━━〔 📄 ADD COMMAND 〕━━━⬣

📁 File

${text}

Silakan kirim source code.

⏰ Timeout
5 Menit

╰━━━━━━━━━━━━━━━━━━⬣`
        )
    }
}
