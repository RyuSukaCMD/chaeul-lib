import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, addMoney, addEnergy, cdLeft, setCd, CONFIG } from "../../lib/rpg.js"

const fmtWait = (ms) => {
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return `${h}j ${m}m`
}

export default {
    command: ["rpgdaily", "dailyrpg"],

    category: "RPG",

    description: "Klaim hadiah harian RPG (money + energy)",

    async run({ sock, m }) {
        const me = await resolvePn(sock, m, m.sender)

        const left = cdLeft(me, "daily", CONFIG.dailyCooldown)
        if (left > 0) {
            return m.reply(
                card("DAILY RPG", `⏳ Sudah diklaim. Kembali dalam ${fmtWait(left)}.`, {
                    emoji: "🎁"
                })
            )
        }
        setCd(me, "daily")

        const money = 500
        addMoney(me, money)
        const energy = addEnergy(me, 15)

        await m.react("🎁")
        return m.reply(
            card(
                "DAILY RPG",
                [
                    `🎁 Hadiah harian diklaim!`,
                    ``,
                    `💰 +$${money}`,
                    `⚡ +15 Energy (${energy})`,
                    ``,
                    `Kembali lagi besok!`
                ],
                {
                    emoji: "🎁"
                }
            )
        )
    }
}
