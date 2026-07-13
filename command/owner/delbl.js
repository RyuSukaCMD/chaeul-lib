import { delBlacklist, isBlacklist } from "../../lib/blacklistgroup.js"

export default {
    command: ["delblacklistgroup", "delbl"],

    owner: true,

    category: "Owner",

    async run({ m }) {
        if (!m.isGroup) return m.reply("Command hanya bisa digunakan di grup.")

        if (!isBlacklist(m.chat)) return m.reply("Group ini tidak ada di blacklist.")

        delBlacklist(m.chat)

        return m.reply("✅ Group berhasil dihapus dari blacklist.")
    }
}
