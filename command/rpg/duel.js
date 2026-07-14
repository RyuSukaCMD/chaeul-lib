import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { getMoney, transferMoney, addXp } from "../../lib/rpg.js"

// Duel ADIL: mini-game reaksi. Level & equipment TIDAK berpengaruh.
// Alur: challenger tantang → target Accept → keduanya lihat tombol acak,
// yang klik tombol BENAR paling cepat menang.
const challenges = new Map() // id -> { challenger, target, bet, chat }
const games = new Map() // id -> { players:Set, bet, answer, clicked, done }

const newId = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`
const EMOJIS = ["🍎", "🍌", "🍇", "🍊", "🍓", "🥝", "🍑", "🍍"]

export default {
    command: ["duel", /^duel_accept:.*/, /^duel_decline:.*/, /^duel_hit:.*/],

    category: "RPG",

    description: "Duel taruhan money — mini-game reaksi (adil, tanpa pengaruh level/equipment)",

    async run({ sock, m, command, args }) {
        const me = await resolvePn(sock, m, m.sender)

        // ── Klik jawaban duel (reaksi tercepat) ──
        if (command.startsWith("duel_hit:")) {
            const [, id, choice] = command.split(":")
            const g = games.get(id)
            if (!g || g.done) return
            const clicker = await resolvePn(sock, m, m.sender)
            if (!g.players.has(clicker) && !g.players.has(m.sender)) return

            const who = g.players.has(clicker) ? clicker : m.sender

            // Klik tombol SALAH → langsung kalah
            if (Number(choice) !== g.answer) {
                g.done = true
                games.delete(id)
                const winner = [...g.players].find((p) => p !== who)
                transferMoney(who, winner, g.bet)
                addXp(winner, 25)
                return m.reply(
                    card(
                        "HASIL DUEL",
                        [
                            `${tag(who)} salah tombol! ❌`,
                            ``,
                            `🏆 Pemenang: ${tag(winner)}`,
                            `💰 +$${g.bet} • ✨ +25 XP`
                        ],
                        { emoji: "⚔️" }
                    ),
                    { mentions: [who, winner] }
                )
            }

            // Klik BENAR pertama → menang
            g.done = true
            games.delete(id)
            const loser = [...g.players].find((p) => p !== who)
            transferMoney(loser, who, g.bet)
            addXp(who, 25)
            return m.reply(
                card(
                    "HASIL DUEL",
                    [
                        `⚡ ${tag(who)} paling cepat & tepat!`,
                        ``,
                        `🏆 Pemenang: ${tag(who)}`,
                        `💸 ${tag(loser)} kehilangan $${g.bet}`,
                        `✨ +25 XP`
                    ],
                    { emoji: "⚔️" }
                ),
                { mentions: [who, loser] }
            )
        }

        // ── Accept / Decline ──
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

            // Mulai mini-game: pilih emoji target + tombol acak
            const pool = [...EMOJIS].sort(() => Math.random() - 0.5).slice(0, 4)
            const answer = Math.floor(Math.random() * pool.length)
            const targetEmoji = pool[answer]

            games.set(id, {
                players: new Set([ch.challenger, ch.target]),
                bet: ch.bet,
                answer,
                done: false
            })

            const t = setTimeout(() => {
                if (games.has(id)) games.delete(id)
            }, 30000)
            if (t.unref) t.unref()

            return Button.menu({
                sock,
                m,
                body: card(
                    "DUEL DIMULAI!",
                    [
                        `⚔️ ${tag(ch.challenger)} 🆚 ${tag(ch.target)}`,
                        `💰 Taruhan: $${ch.bet}`,
                        ``,
                        `🎯 Klik tombol *${targetEmoji}* PALING CEPAT!`,
                        `Salah tombol = kalah. Siapa cepat dia menang!`
                    ],
                    { emoji: "⚡" }
                ),
                footer: "© Chaeul RPG",
                mentions: [ch.challenger, ch.target],
                buttons: pool.map((e, i) => ({
                    type: "quick",
                    text: e,
                    id: `duel_hit:${id}:${i}`
                }))
            })
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
                card("DUEL", [`Tag pemain & taruhan.`, `Contoh: ${global.prefix}duel @user 100`], {
                    emoji: "⚔️"
                })
            )
        }
        if (target === me)
            return m.reply(card("DUEL", "Tidak bisa duel dengan diri sendiri. 😅", { emoji: "⚔️" }))
        if (getMoney(me) < bet)
            return m.reply(card("DUEL", `Money kamu tidak cukup (butuh $${bet}).`, { emoji: "⚔️" }))
        if (getMoney(target) < bet)
            return m.reply(
                card("DUEL", `${tag(target)} tidak punya cukup money.`, { emoji: "⚔️" }),
                {
                    mentions: [target]
                }
            )

        const id = newId()
        challenges.set(id, { challenger: me, target, bet, chat: m.chat })
        const t = setTimeout(() => challenges.delete(id), 60000)
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
                    `🎮 Mini-game reaksi — ADIL, murni skill!`,
                    ``,
                    `${tag(target)}, terima? ⏳ 1 menit.`
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
