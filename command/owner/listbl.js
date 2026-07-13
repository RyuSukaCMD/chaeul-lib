import { getBlacklist } from "../../lib/blacklistgroup.js"

export default {
    command: ["listbl", "listblacklist", "listblgroup"],

    owner: true,

    category: "Owner",

    description: "List Blacklist Group",

    async run({
        sock,

        m
    }) {
        const list = getBlacklist()

        if (!list.length) return m.reply("Tidak ada group yang diblacklist.")

        let text = `╭━━━〔 🚫 BLACKLIST GROUP 〕━━━⬣

`

        let no = 1

        for (const jid of list) {
            let name = "Unknown Group"

            try {
                const meta = await sock.groupMetadata(jid)

                name = meta.subject
            } catch {}

            text += `${no++}. ${name}

🆔 ${jid}

`
        }

        text += `━━━━━━━━━━━━━━━━━━

📊 Total
${list.length} Group

╰━━━━━━━━━━━━━━━━━━⬣`

        return m.reply(text)
    }
}
