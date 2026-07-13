import fs from "fs"

export default function startDebug(sock) {
    sock.ev.on("group-participants.update", async (data) => {
        if (!global.debugEvent?.enabled) return

        fs.writeFileSync(
            global.debugEvent.file,

            JSON.stringify(
                data,

                null,

                4
            )
        )

        const owner = global.debugEvent.owner

        const file = global.debugEvent.file

        global.debugEvent = null

        await sock.sendMessage(
            owner,

            {
                text: `✅ Debug selesai.

File:

${file}`
            }
        )
    })
}
