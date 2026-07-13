import { addBlacklist, isBlacklist } from "../../lib/blacklistgroup.js"

export default {
    command: ["blacklistgroup", "blgroup"],

    owner: true,

    category: "Owner",

    async run({ m }) {
        if (!m.isGroup) return m.reply("Command hanya bisa digunakan di grup.")

        if (isBlacklist(m.chat)) return m.reply("Group ini sudah diblacklist.")

        addBlacklist(m.chat)

        return m.reply(
            `✅ Group berhasil ditambahkan ke blacklist.

ID:
${m.chat}`
        )
    }
}
