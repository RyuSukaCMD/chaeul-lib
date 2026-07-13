import { card, status } from "../../lib/ui.js"

export default {
    command: ["autovoice"],

    category: "Owner",

    description: "Toggle Auto Recording",

    owner: true,

    async run({ m }) {
        global.settings.autovoice = !global.settings.autovoice
        if (global.settings.autovoice) global.settings.autotyping = false

        await m.react(global.settings.autovoice ? "✅" : "❌")

        return m.reply(
            card("AUTO VOICE", status("Auto Voice", global.settings.autovoice), { emoji: "🎙️" })
        )
    }
}
