import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { getPlayer, getMoney, transferMoney, addXp, getAtk } from "../../lib/rpg.js"

const challenges = new Map()
const newId = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`

export default {
    command: ["duel", /^duel_accept:.*/, /^duel_decline:.*/],

    category: "RPG",

    description: "Tantang pemain duel taruhan money (butuh Accept)",

    async run({ sock, m, command, args }) {
        const me = await resolvePn(sock, m, m.sender)

        // ── Handler tombol ──
        if (command.startsWith("duel_accept:") || command.startsWith("duel_decline:")) {
            const isAccept = command.startsWith("duel_accept:")
            const id = command.split(":")[1]
            const ch = challenges.get(id)
            if (!ch) return m.reply(card("DUEL", "Tantangan sudah kedaluwarsa.", { emoji: "⚔️" }))

            const clicker = await resolvePn(sock, m, m.sender)
            if (clicker !== ch.target && m.sender !== ch.target) return

            if (!isAccept) {
                challenges.delete(id)
                return m.reply(
                    card("DUEL DITOLAK", `🏳️ ${tag(ch.target)} menolak duel.`, { emoji: "⚔️" }),
                    { mentions: [ch.target] }
                )
            }

            challenges.delete(id)
            if (getMoney(ch.challenger) < ch.bet || getMoney(ch.target) < ch.bet) {
                return m.reply(
                    card("DUEL BATAL", "Salah satu pihak tidak punya cukup money.", { emoji: "⚔️" })
                )
            }

            // Pemenang: bobot dari ATK + level + acak
            const cp = getPlayer(ch.challenger)
            const tp = getPlayer(ch.target)
            const cw = getAtk(cp) + cp.level * 3 + Math.random() * 20
            const tw = getAtk(tp) + tp.level * 3 + Math.random() * 20
            const winner = cw >= tw ? ch.challenger : ch.target
            const loser = winner === ch.challenger ? ch.target : ch.challenger

            transferMoney(loser, winner, ch.bet)
            addXp(winner, 30)

            return m.reply(
                card(
                    "HASIL DUEL",
                    [
                        `⚔️ ${tag(ch.challenger)} 🆚 ${tag(ch.target)}`,
                        `💰 Taruhan: $${ch.bet}`,
                        ``,
                        `🏆 Pemenang: ${tag(winner)}`,
                        `💸 ${tag(loser)} kehilangan $${ch.bet}`,
                        `✨ ${tag(winner)} +30 XP`
                    ],
                    { emoji: "⚔️" }
                ),
                { mentions: [ch.challenger, ch.target, winner, loser] }
            )
        }

        // ── Command utama ──
        const rawTarget = m.mentionedJid?.[0] || m.quoted?.sender
        const target = await resolvePn(sock, m, rawTarget)
        const bet = parseInt(
            args.find((a) => /^\d+$/.test(a)),
            10
        )

        if (!target || isNaN(bet) || bet <= 0) {
            return m.reply(
                card(
                    "DUEL",
                    [`Tag pemain & taruhan.`, ``, `Contoh: ${global.prefix}duel @user 100`],
                    { emoji: "⚔️" }
                )
            )
        }
        if (target === me)
            return m.reply(card("DUEL", "Tidak bisa duel dengan diri sendiri. 😅", { emoji: "⚔️" }))
        if (getMoney(me) < bet)
            return m.reply(card("DUEL", `Money kamu tidak cukup (butuh $${bet}).`, { emoji: "⚔️" }))
        if (getMoney(target) < bet)
            return m.reply(
                card("DUEL", `${tag(target)} tidak punya cukup money.`, { emoji: "⚔️" }),
                { mentions: [target] }
            )

        const id = newId()
        challenges.set(id, { challenger: me, target, bet, chat: m.chat })

        const t = setTimeout(async () => {
            if (challenges.has(id)) {
                challenges.delete(id)
                try {
                    await sock.sendMessage(m.chat, {
                        text: card(
                            "⌛ DUEL EXPIRED",
                            `${tag(me)}, tantangan duel ke ${tag(target)} kedaluwarsa.`,
                            { emoji: "⚔️" }
                        ),
                        mentions: [me, target]
                    })
                } catch {}
            }
        }, 60 * 1000)
        if (t.unref) t.unref()

        return Button.menu({
            sock,
            m,
            body: card(
                "TANTANGAN DUEL",
                [
                    `${tag(me)} menantang ${tag(target)} duel!`,
                    ``,
                    `💰 Taruhan: $${bet}`,
                    ``,
                    `${tag(target)}, terima?`,
                    `⏳ Berlaku 1 menit.`
                ],
                { emoji: "⚔️" }
            ),
            footer: "© Chaeul RPG",
            mentions: [me, target],
            buttons: [
                { type: "quick", text: "⚔️ Terima", id: `duel_accept:${id}` },
                { type: "quick", text: "🏳️ Tolak", id: `duel_decline:${id}` }
            ]
        })
    }
}
