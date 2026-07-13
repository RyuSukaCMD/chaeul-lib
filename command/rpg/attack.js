import { card } from "../../lib/ui.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { getPlayer, setHp, getAtk, getDef, addMoney, addXp, maxHp, ITEMS } from "../../lib/rpg.js"

const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a

export default {
    command: ["attack", "serang"],

    category: "RPG",

    description: "Serang pemain lain (HP, senjata & armor)",

    async run({ sock, m }) {
        const me = await resolvePn(sock, m, m.sender)
        const rawTarget = m.mentionedJid?.[0] || m.quoted?.sender
        const target = await resolvePn(sock, m, rawTarget)

        if (!target) {
            return m.reply(
                card(
                    "SERANG",
                    [
                        `Tag/reply pemain yang ingin diserang.`,
                        ``,
                        `Contoh: ${global.prefix}attack @user`
                    ],
                    { emoji: "⚔️" }
                )
            )
        }
        if (target === me)
            return m.reply(card("SERANG", "Tidak bisa menyerang diri sendiri. 😅", { emoji: "⚔️" }))

        const attacker = getPlayer(me)
        if (attacker.hp <= 0)
            return m.reply(
                card("SERANG", [`❤️‍🩹 HP kamu 0!`, `Heal dulu: ${global.prefix}heal`], {
                    emoji: "⚔️"
                })
            )

        const tp = getPlayer(target)
        const dmg = Math.max(
            1,
            rand(Math.floor(getAtk(attacker) * 0.8), getAtk(attacker)) - getDef(tp)
        )
        const newHp = Math.max(0, tp.hp - dmg)
        setHp(target, newHp)

        const w = ITEMS[attacker.weapon] || { emoji: "🤜", name: "Tinju" }

        if (newHp <= 0) {
            const loot = Math.min(tp.money, rand(50, 120))
            if (loot > 0) {
                addMoney(target, -loot)
                addMoney(me, loot)
            }
            addXp(me, 25)
            setHp(target, maxHp(tp)) // bangkit HP penuh

            return m.reply(
                card(
                    "K.O! 💀",
                    [
                        `${w.emoji} ${tag(me)} mengalahkan ${tag(target)}!`,
                        ``,
                        `💥 Damage: ${dmg}`,
                        `💰 Loot: $${loot}`,
                        `✨ +25 XP`,
                        ``,
                        `${tag(target)} bangkit dengan HP penuh.`
                    ],
                    { emoji: "⚔️" }
                ),
                { mentions: [me, target] }
            )
        }

        return m.reply(
            card(
                "SERANG",
                [
                    `${w.emoji} ${tag(me)} menyerang ${tag(target)}!`,
                    ``,
                    `💥 Damage: ${dmg}`,
                    `❤️ HP ${tag(target)}: ${newHp}/${maxHp(tp)}`
                ],
                { emoji: "⚔️" }
            ),
            { mentions: [me, target] }
        )
    }
}
