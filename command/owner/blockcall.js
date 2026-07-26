import { card, status } from "../../lib/ui.js"
import { flipSettingToggle } from "../../lib/settings.js"

export default {
    command: ["blockcall", "anticall"],

    owner: true,

    category: "Owner",

    description: "Toggle block call (panggilan masuk ditolak + penelepon diblock)",

    async run({ m }) {
        const on = flipSettingToggle("blockcall")

        await m.react(on ? "✅" : "❌")

        return m.reply(
            card(
                "BLOCK CALL",
                [
                    status("Block Call", on),
                    on
                        ? "Panggilan masuk akan DITOLAK otomatis & penelepon diblock."
                        : "Panggilan masuk kembali dibiarkan (tidak ditolak)."
                ],
                { emoji: "📵" }
            )
        )
    }
}
