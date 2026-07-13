import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { getPlayer, getMoney, transferMoney, addXp } from "../../lib/rpg.js"

// Tantangan duel sementara (in-memory). id -> { challenger, target, bet, chat }
const challenges = new Map()

function newId() {
    return `${Date.now()}${Math.floor(Math.random() * 1000)}`
}

export default {
    command: ["duel", /^duel_accept:.*/, /^duel_decline:.*/],

    category: "RPG",

    description: "Tantang user duel dgn taruhan money (butuh Accept)",

    async run({ sock, m, command, args }) {
        const me = await resolvePn(sock, m, m.sender)

        // ── Handler tombol ──
        if (command.startsWith("duel_accept:") || command.startsWith("duel_decline:")) {
            const isAccept = command.startsWith("duel_accept:")
            const id = command.split(":")[1]
            const ch = challenges.get(id)

            if (!ch) return m.reply(card("DUEL", "Tantangan sudah kedaluwarsa.", { emoji: "⚔️" }))

            // Hanya target yang boleh menjawab
            const clicker = await resolvePn(sock, m, m.sender)
            if (clicker !== ch.target && m.sender !== ch.target) return

            if (!isAccept) {
                challenges.delete(id)
                return m.reply(
                    card("DUEL DITOLAK", `${tag(ch.target)} menolak duel.`, { emoji: "⚔️" }),
                    {
                        mentions: [ch.target]
                    }
                )
            }

            challenges.delete(id)

            // Pastikan kedua pihak masih punya cukup money
            if (getMoney(ch.challenger) < ch.bet || getMoney(ch.target) < ch.bet) {
                return m.reply(
                    card("DUEL BATAL", "Salah satu pihak tidak punya cukup money.", { emoji: "⚔️" })
                )
            }

            // Adu: pemenang acak (dipengaruhi sedikit oleh level)
            const cp = getPlayer(ch.challenger)
            const tpl = getPlayer(ch.target)
            const chWeight = cp.level + Math.random() * 5
            const tgWeight = tpl.level + Math.random() * 5
            const winner = chWeight >= tgWeight ? ch.challenger : ch.target
            const loser = winner === ch.challenger ? ch.target : ch.challenger

            transferMoney(loser, winner, ch.bet)
            addXp(winner, 25)

            return m.reply(
                card(
                    "HASIL DUEL",
                    [
                        `⚔️ ${tag(ch.challenger)} 🆚 ${tag(ch.target)}`,
                        `💰 Taruhan: $${ch.bet}`,
                        ``,
                        `🏆 Pemenang: ${tag(winner)}`,
                        `💸 ${tag(loser)} kehilangan $${ch.bet}`,
                        `✨ ${tag(winner)} +25 XP`
                    ],
                    { emoji: "⚔️" }
                ),
                { mentions: [ch.challenger, ch.target, winner, loser] }
            )
        }

        // ── Command utama: .duel @user <bet> ──
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
                    [`Tag user & taruhan.`, ``, `Contoh:`, `${global.prefix}duel @user 100`],
                    { emoji: "⚔️" }
                )
            )
        }
        if (target === me) {
            return m.reply(card("DUEL", "Tidak bisa duel dengan diri sendiri. 😅", { emoji: "⚔️" }))
        }
        if (getMoney(me) < bet) {
            return m.reply(card("DUEL", `Money kamu tidak cukup (butuh $${bet}).`, { emoji: "⚔️" }))
        }
        if (getMoney(target) < bet) {
            return m.reply(
                card("DUEL", `${tag(target)} tidak punya cukup money untuk taruhan ini.`, {
                    emoji: "⚔️"
                }),
                {
                    mentions: [target]
                }
            )
        }

        const id = newId()
        challenges.set(id, { challenger: me, target, bet, chat: m.chat })

        // Auto-expire 60s + tag penantang
        const t = setTimeout(async () => {
            if (challenges.has(id)) {
                challenges.delete(id)
                try {
                    await sock.sendMessage(m.chat, {
                        text: card(
                            "⌛ DUEL EXPIRED",
                            `${tag(me)}, tantangan duel ke ${tag(target)} kedaluwarsa.`,
                            {
                                emoji: "⚔️"
                            }
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
