import { smallcaps as sc } from "../../lib/font.js"
import { checkAdmin } from "../../lib/groupadmin.js"
import { toggleMode, MODE_LABEL } from "../../lib/antilink.js"

// command → mode
const MAP = {
    antilinkall: "all",
    antilinkgb: "group",
    antilinkch: "channel",
    antilinksosmed: "sosmed",
    antitagsw: "tagsw"
}

export default {
    command: Object.keys(MAP),

    category: "Group",

    description: "Toggle mode antilink tertentu",

    async run({ sock, m, command, isCreator }) {
        if (!m.isGroup) return m.reply("Command ini hanya untuk grup.")

        const { isAdmin, isBotAdmin } = await checkAdmin(sock, m, isCreator)
        if (!isAdmin) return m.reply("Khusus admin grup.")

        const mode = MAP[command]
        if (!mode) return

        const value = toggleMode(m.chat, mode)

        await m.react(value ? "✅" : "❌")

        return m.reply(
            `╭─ 🛡️ ${sc("ANTILINK")} ─⬣\n` +
                `│\n` +
                `│ ${MODE_LABEL[mode]}\n` +
                `│ ${sc("Status")} : ${value ? "✅ ON" : "❌ OFF"}\n` +
                `│\n` +
                (value && !isBotAdmin
                    ? `│ ⚠️ ${sc("Jadikan bot admin agar bisa menghapus & kick")}.\n│\n`
                    : "") +
                `╰──────────────⬣`
        )
    }
}
