import { card, status } from "../../lib/ui.js"

export default {
    command: ["autotyping"],

    category: "Owner",

    description: "Toggle Auto Typing",

    owner: true,

    async run({ m }) {
        global.settings.autotyping = !global.settings.autotyping
        if (global.settings.autotyping) global.settings.autovoice = false

        await m.react(global.settings.autotyping ? "✅" : "❌")

        return m.reply(
            card("AUTO TYPING", status("Auto Typing", global.settings.autotyping), { emoji: "⌨️" })
        )
    }
}
