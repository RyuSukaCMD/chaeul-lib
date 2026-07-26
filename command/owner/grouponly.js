import { card, status } from "../../lib/ui.js"
import { flipSettingToggle } from "../../lib/settings.js"

export default {
    command: ["grouponly"],

    owner: true,

    category: "Owner",

    description: "Toggle mode group only (bot hanya merespon di grup)",

    async run({ m }) {
        const on = flipSettingToggle("grouponly")

        await m.react(on ? "✅" : "❌")

        return m.reply(
            card(
                "GROUP ONLY",
                [
                    status("Group Only", on),
                    on
                        ? "Bot kini HANYA merespon di grup. Chat private diabaikan."
                        : "Bot kembali merespon grup & private chat."
                ],
                { emoji: "👥" }
            )
        )
    }
}
