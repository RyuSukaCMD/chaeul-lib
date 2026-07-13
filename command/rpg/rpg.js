import { card } from "../../lib/ui.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { getPlayer, SHOP } from "../../lib/rpg.js"

export default {
    command: ["rpg", "stat", "rpgprofile"],

    category: "RPG",

    description: "Lihat statistik RPG kamu",

    async run({ sock, m }) {
        const rawTarget = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
        const who = await resolvePn(sock, m, rawTarget)
        const p = getPlayer(who)

        const weapon =
            p.weapon && SHOP[p.weapon]
                ? `${SHOP[p.weapon].emoji} ${SHOP[p.weapon].name}`
                : "🤜 Tinju"
        const hpBar = renderBar(p.hp, p.maxhp)

        return m.reply(
            card(
                "RPG PROFILE",
                [
                    `👤 ${tag(who)}`,
                    ``,
                    `❤️ HP    : ${p.hp}/${p.maxhp}`,
                    `   ${hpBar}`,
                    `📈 Level : ${p.level}  (${p.xp} XP)`,
                    `💰 Money : $${p.money}`,
                    `⚔️ Senjata: ${weapon}`
                ],
                { emoji: "🎮" }
            ),
            { mentions: [who] }
        )
    }
}

function renderBar(cur, max) {
    const total = 10
    const filled = Math.max(0, Math.min(total, Math.round((cur / max) * total)))
    return "█".repeat(filled) + "░".repeat(total - filled)
}
