import { card } from "../../lib/ui.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { getPlayer, setHp, getAtk, addMoney, addXp, healFull, SHOP } from "../../lib/rpg.js"

export default {
    command: ["attack", "serang"],

    category: "RPG",

    description: "Serang user lain (berbasis HP & senjata)",

    async run({ sock, m }) {
        const me = await resolvePn(sock, m, m.sender)
        const rawTarget = m.mentionedJid?.[0] || m.quoted?.sender
        const target = await resolvePn(sock, m, rawTarget)

        if (!target) {
            return m.reply(
                card(
                    "ATTACK",
                    [
                        `Tag/reply user yang ingin diserang.`,
                        ``,
                        `Contoh: ${global.prefix}attack @user`
                    ],
                    { emoji: "⚔️" }
                )
            )
        }
        if (target === me) {
            return m.reply(card("ATTACK", `Tidak bisa menyerang diri sendiri. 😅`, { emoji: "⚔️" }))
        }

        const attacker = getPlayer(me)
        if (attacker.hp <= 0) {
            return m.reply(
                card("ATTACK", [`HP kamu 0 ❤️‍🩹`, `Heal dulu: ${global.prefix}heal`], { emoji: "⚔️" })
            )
        }

        const tp = getPlayer(target)
        const atk = getAtk(me)
        // Damage acak 80%-120% dari atk
        const dmg = Math.max(1, Math.round(atk * (0.8 + Math.random() * 0.4)))
        const newHp = Math.max(0, tp.hp - dmg)
        setHp(target, newHp)

        const weapon =
            attacker.weapon && SHOP[attacker.weapon]
                ? SHOP[attacker.weapon]
                : { emoji: "🤜", name: "Tinju" }

        // Target kalah (HP 0)
        if (newHp <= 0) {
            const loot = Math.min(tp.money, Math.floor(Math.random() * 80) + 40)
            if (loot > 0) {
                addMoney(target, -loot)
                addMoney(me, loot)
            }
            addXp(me, 30)
            healFull(target) // bangkit dgn HP penuh setelah kalah

            return m.reply(
                card(
                    "K.O! 💀",
                    [
                        `${weapon.emoji} ${tag(me)} mengalahkan ${tag(target)}!`,
                        ``,
                        `💥 Damage terakhir: ${dmg}`,
                        `💰 Loot: $${loot}`,
                        `✨ +30 XP`,
                        ``,
                        `${tag(target)} bangkit dgn HP penuh.`
                    ],
                    { emoji: "⚔️" }
                ),
                { mentions: [me, target] }
            )
        }

        return m.reply(
            card(
                "ATTACK",
                [
                    `${weapon.emoji} ${tag(me)} menyerang ${tag(target)}!`,
                    ``,
                    `💥 Damage: ${dmg}`,
                    `❤️ HP ${tag(target)}: ${newHp}/${tp.maxhp}`
                ],
                { emoji: "⚔️" }
            ),
            { mentions: [me, target] }
        )
    }
}
