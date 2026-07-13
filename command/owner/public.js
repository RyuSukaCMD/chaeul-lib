import { card } from "../../lib/ui.js"

export default {
    name: "Public",

    command: ["public"],

    category: "Owner",

    description: "Enable public mode",

    owner: true,

    async run({ m }) {
        if (global.settings.public) {
            return m.reply(card("PUBLIC MODE", "Bot sudah dalam mode public.", { emoji: "🌐" }))
        }

        global.settings.public = true

        await m.react("🌐")

        return m.reply(card("PUBLIC MODE", "✅ Mode public diaktifkan.", { emoji: "🌐" }))
    }
}
