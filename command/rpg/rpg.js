import { card } from "../../lib/ui.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { getPlayer, maxHp, maxEnergy, getAtk, getDef, ITEMS } from "../../lib/rpg.js"

function bar(cur, max, len = 10) {
    const filled = Math.max(0, Math.min(len, Math.round((cur / max) * len)))
    return "█".repeat(filled) + "░".repeat(len - filled)
}

export default {
    command: ["rpg", "stat", "rpgprofile"],

    category: "RPG",

    description: "Lihat statistik RPG kamu",

    async run({ sock, m }) {
        const rawTarget = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
        const who = await resolvePn(sock, m, rawTarget)
        const p = getPlayer(who)

        const weapon = ITEMS[p.weapon]
            ? `${ITEMS[p.weapon].emoji} ${ITEMS[p.weapon].name}`
            : "🤜 Tinju"
        const armor = ITEMS[p.armor]
            ? `${ITEMS[p.armor].emoji} ${ITEMS[p.armor].name}`
            : "👕 Tidak ada"
        const mhp = maxHp(p)
        const men = maxEnergy(p)
        const xpNeed = p.level * 120

        return m.reply(
            card(
                "KARTU RPG",
                [
                    `👤 ${tag(who)}`,
                    ``,
                    `❤️ HP     ${p.hp}/${mhp}`,
                    `   ${bar(p.hp, mhp)}`,
                    `⚡ Energy ${p.energy}/${men}`,
                    `   ${bar(p.energy, men)}`,
                    `📈 Level  ${p.level}  (${p.xp}/${xpNeed} XP)`,
                    ``,
                    `⚔️ ATK    : ${getAtk(p)}`,
                    `🛡️ DEF    : ${getDef(p)}`,
                    `🗡️ Senjata: ${weapon}`,
                    `🥋 Armor  : ${armor}`,
                    ``,
                    `💰 Money  : $${p.money.toLocaleString("id-ID")}`
                ],
                { emoji: "🎮" }
            ),
            { mentions: [who] }
        )
    }
}
