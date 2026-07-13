import fs from "fs"
import path from "path"

import Loader from "../../lib/loader.js"

export default {
    command: ["delcommand", "delcmd", "rmcommand"],

    owner: true,

    category: "Owner",

    description: "Delete Command",

    async run({ m, text }) {
        if (!text)
            return m.reply(
                `Contoh:

.delcommand owner/ping.js`
            )

        const file = path.join(
            "./command",

            text
        )

        if (!fs.existsSync(file)) return m.reply("❌ Command tidak ditemukan.")

        try {
            fs.unlinkSync(file)

            Loader.plugins.delete(file)

            return m.reply(
                `╭━━━〔 🗑️ DELETE COMMAND 〕━━━⬣

✅ Command berhasil dihapus.

📁 Folder

${path.dirname(text)}

📄 File

${path.basename(text)}

╰━━━━━━━━━━━━━━━━━━⬣`
            )
        } catch (e) {
            console.error(e)

            return m.reply(String(e))
        }
    }
}
