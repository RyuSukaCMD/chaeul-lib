import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import {
    getPlayer,
    getAtk,
    getDef,
    setHp,
    addMoney,
    addXp,
    useEnergy,
    cdLeft,
    setCd,
    maxHp,
    CONFIG
} from "../../lib/rpg.js"

// Daftar monster (hp, atk, reward)
const MONSTERS = [
    { name: "Goblin", hp: 40, atk: 10, money: [40, 90], xp: 12, emoji: "👺" },
    { name: "Serigala", hp: 60, atk: 16, money: [70, 140], xp: 18, emoji: "🐺" },
    { name: "Orc", hp: 90, atk: 24, money: [120, 220], xp: 28, emoji: "👹" },
    { name: "Golem", hp: 140, atk: 30, money: [200, 350], xp: 40, emoji: "🗿" },
    { name: "Naga", hp: 220, atk: 45, money: [400, 700], xp: 70, emoji: "🐉" }
]

const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
const fmtWait = (ms) => {
    const s = Math.ceil(ms / 1000)
    return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`
}

export default {
    command: ["hunt", "berburu"],

    category: "RPG",

    description: "Berburu monster (butuh energy)",

    async run({ sock, m }) {
        const me = await resolvePn(sock, m, m.sender)
        const p = getPlayer(me)

        const left = cdLeft(me, "hunt", CONFIG.huntCooldown)
        if (left > 0) {
            return m.reply(
                card("HUNT", `⏳ Kamu masih lelah. Tunggu ${fmtWait(left)} lagi.`, { emoji: "⚔️" })
            )
        }
        if (p.hp <= 0) {
            return m.reply(
                card("HUNT", [`❤️‍🩹 HP kamu 0!`, `Heal dulu: ${global.prefix}heal`], { emoji: "⚔️" })
            )
        }
        if (!useEnergy(me, 3)) {
            return m.reply(
                card("HUNT", [`⚡ Energy tidak cukup (butuh 3).`, `Cek: ${global.prefix}rpg`], {
                    emoji: "⚔️"
                })
            )
        }
        setCd(me, "hunt")

        const mob =
            MONSTERS[Math.min(MONSTERS.length - 1, Math.floor(Math.random() * (p.level + 2)))] ||
            MONSTERS[0]

        // Simulasi pertarungan sederhana bergiliran
        let myHp = p.hp
        let mobHp = mob.hp
        const myAtk = getAtk(p)
        const myDef = getDef(p)

        while (myHp > 0 && mobHp > 0) {
            mobHp -= rand(Math.floor(myAtk * 0.8), myAtk)
            if (mobHp <= 0) break
            myHp -= Math.max(1, rand(Math.floor(mob.atk * 0.7), mob.atk) - myDef)
        }

        // Menang
        if (myHp > 0) {
            const gold = rand(mob.money[0], mob.money[1])
            addMoney(me, gold)
            const { leveled } = addXp(me, mob.xp)
            setHp(me, myHp)

            return m.reply(
                card(
                    "HUNT — MENANG",
                    [
                        `${mob.emoji} Kamu mengalahkan *${mob.name}*!`,
                        ``,
                        `💰 +$${gold}`,
                        `✨ +${mob.xp} XP${leveled ? "  ·  🎊 NAIK LEVEL!" : ""}`,
                        `❤️ HP tersisa: ${myHp}/${maxHp(p)}`
                    ],
                    { emoji: "⚔️" }
                )
            )
        }

        // Kalah
        setHp(me, 0)
        return m.reply(
            card(
                "HUNT — KALAH",
                [
                    `${mob.emoji} *${mob.name}* terlalu kuat! 💀`,
                    ``,
                    `Kamu pingsan dengan HP 0.`,
                    `Heal: ${global.prefix}heal`
                ],
                { emoji: "⚔️" }
            )
        )
    }
}
