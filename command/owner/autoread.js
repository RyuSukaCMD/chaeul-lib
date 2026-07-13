import { card, status } from "../../lib/ui.js"

export default {
    command: ["autoread"],

    category: "Owner",

    description: "Toggle Auto Read",

    owner: true,

    async run({ m }) {
        const on = (global.settings.autoread = !global.settings.autoread)

        await m.react(on ? "✅" : "❌")

        return m.reply(card("AUTO READ", status("Auto Read", on), { emoji: "📖" }))
    }
}
