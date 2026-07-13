import fs from "fs"
import { card } from "../../lib/ui.js"

export default {
    command: ["debug"],

    owner: true,

    category: "Owner",

    description: "Debug Event (simpan event berikutnya ke file)",

    async run({ m }) {
        if (!fs.existsSync("./logbot")) fs.mkdirSync("./logbot")

        const file = `./logbot/${Date.now()}.json`

        global.debugEvent = {
            enabled: true,
            owner: m.sender,
            file
        }

        await m.react("🐛")

        return m.reply(
            card("DEBUG", ["✅ Debug aktif.", "", "Event berikutnya disimpan ke:", file], {
                emoji: "🐛"
            })
        )
    }
}
