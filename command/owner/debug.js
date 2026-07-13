import fs from "fs"

export default {
    command: ["debug"],

    owner: true,

    category: "Owner",

    description: "Debug Event",

    async run({ m }) {
        if (!fs.existsSync("./logbot")) fs.mkdirSync("./logbot")

        const file = `./logbot/${Date.now()}.json`

        global.debugEvent = {
            enabled: true,

            owner: m.sender,

            file
        }

        return m.reply(
            `✅ Debug aktif.

Event berikutnya akan disimpan ke:

${file}`
        )
    }
}
