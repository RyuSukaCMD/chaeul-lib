import { card, status } from "../../lib/ui.js"
import { flipSettingToggle } from "../../lib/settings.js"

export default {
    command: ["blockpc", "blockprivate"],

    owner: true,

    category: "Owner",

    description: "Toggle block private chat (chat PC → peringatan + auto block)",

    async run({ m }) {
        const on = flipSettingToggle("blockpc")

        await m.react(on ? "✅" : "❌")

        return m.reply(
            card(
                "BLOCK PRIVATE CHAT",
                [
                    status("Block Private Chat", on),
                    on
                        ? "Siapa pun yang chat private (non-owner) akan diperingatkan lalu DIBLOCK."
                        : "Chat private kembali diizinkan."
                ],
                { emoji: "🚷" }
            )
        )
    }
}
