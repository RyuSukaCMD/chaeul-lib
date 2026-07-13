import { card } from "../../lib/ui.js"

export default {
    name: "Self",

    command: ["self"],

    category: "Owner",

    description: "Enable self mode",

    owner: true,

    async run({ m }) {
        if (!global.settings.public) {
            return m.reply(card("SELF MODE", "Bot sudah dalam mode self.", { emoji: "🔒" }))
        }

        global.settings.public = false

        await m.react("🔒")

        return m.reply(card("SELF MODE", "✅ Mode self diaktifkan.", { emoji: "🔒" }))
    }
}
