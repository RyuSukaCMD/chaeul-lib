import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { getPlayer, getMoney, addMoney, removeItem, addItem, isFav } from "../../lib/rpg.js"
import { MUTATIONS, fishDisplay } from "../../lib/fish.js"
import { getFishById } from "../../lib/island.js"

const MUT_MAP = Object.fromEntries(MUTATIONS.map((mt) => [mt.id, mt]))

// Sesi trade: id -> { a, b, chat, offer:{a:{money,fish:{key:qty}}, b:{...}},
//                     ready:{a,b}, started, done }
const trades = new Map()
const newId = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`

function findTradeOf(jid) {
    for (const [id, t] of trades) {
        if (!t.done && (t.a === jid || t.b === jid)) return [id, t]
    }
    return [null, null]
}

function side(t, jid) {
    return t.a === jid ? "a" : "b"
}

function offerLines(t, jid, label) {
    const o = t.offer[side(t, jid)]
    const lines = [`${label}:`]
    if (o.money) lines.push(`  💰 $${o.money.toLocaleString("id-ID")}`)
    const fishKeys = Object.keys(o.fish)
    if (fishKeys.length) {
        for (const k of fishKeys) {
            const f = getFishById(k.split("#")[0])
            const mid = k.split("#")[1]
            if (f) lines.push(`  ${fishDisplay(f, mid ? MUT_MAP[mid] : null)} ×${o.fish[k]}`)
        }
    }
    if (!o.money && !fishKeys.length) lines.push(`  (kosong)`)
    return lines
}

async function renderTrade(sock, m, id) {
    const t = trades.get(id)
    if (!t) return
    const body = card(
        "TRADE",
        [
            `${tag(t.a)} 🔁 ${tag(t.b)}`,
            ``,
            ...offerLines(t, t.a, `📦 ${tag(t.a)}`),
            ``,
            ...offerLines(t, t.b, `📦 ${tag(t.b)}`),
            ``,
            `Status: ${t.ready.a ? "✅" : "◻️"} ${tag(t.a)}  |  ${t.ready.b ? "✅" : "◻️"} ${tag(t.b)}`,
            ``,
            `Tambah: ${global.prefix}trade add <idIkan> [jml]`,
            `Uang: ${global.prefix}trade money <jumlah>`,
            `Kedua pihak tekan DONE untuk konfirmasi.`
        ],
        { emoji: "🔁" }
    )
    return Button.menu({
        sock,
        m,
        body,
        footer: "© Chaeul RPG",
        mentions: [t.a, t.b],
        buttons: [
            { type: "quick", text: "✅ Done", id: `trade_done:${id}` },
            { type: "quick", text: "❌ Cancel", id: `trade_cancel:${id}` }
        ]
    })
}

function executeTrade(t) {
    const oa = t.offer.a
    const ob = t.offer.b
    // Pindahkan uang
    if (oa.money) {
        addMoney(t.a, -oa.money)
        addMoney(t.b, oa.money)
    }
    if (ob.money) {
        addMoney(t.b, -ob.money)
        addMoney(t.a, ob.money)
    }
    // Pindahkan ikan
    for (const [k, q] of Object.entries(oa.fish)) {
        removeItem(t.a, k, q)
        addItem(t.b, k, q)
    }
    for (const [k, q] of Object.entries(ob.fish)) {
        removeItem(t.b, k, q)
        addItem(t.a, k, q)
    }
}

export default {
    command: [
        "trade",
        /^trade_accept:.+$/,
        /^trade_decline:.+$/,
        /^trade_done:.+$/,
        /^trade_cancel:.+$/
    ],

    category: "RPG",

    description: "Trading ikan + uang antar pemain (interaktif)",

    async run({ sock, m, command, args }) {
        const me = await resolvePn(sock, m, m.sender)

        // ── Accept/Decline undangan trade ──
        if (command.startsWith("trade_accept:") || command.startsWith("trade_decline:")) {
            const id = command.split(":")[1]
            const t = trades.get(id)
            if (!t) return m.reply(card("TRADE", "Undangan sudah kedaluwarsa.", { emoji: "🔁" }))
            const clicker = await resolvePn(sock, m, m.sender)
            if (clicker !== t.b && m.sender !== t.b) return

            if (command.startsWith("trade_decline:")) {
                trades.delete(id)
                return m.reply(card("TRADE", `${tag(t.b)} menolak trade.`, { emoji: "🔁" }), {
                    mentions: [t.b]
                })
            }
            t.started = true
            return renderTrade(sock, m, id)
        }

        // ── Cancel ──
        if (command.startsWith("trade_cancel:")) {
            const id = command.split(":")[1]
            const t = trades.get(id)
            if (!t) return
            const clicker = await resolvePn(sock, m, m.sender)
            if (clicker !== t.a && clicker !== t.b && m.sender !== t.a && m.sender !== t.b) return
            trades.delete(id)
            return m.reply(card("TRADE", "Trade dibatalkan. ❌", { emoji: "🔁" }))
        }

        // ── Done (konfirmasi) ──
        if (command.startsWith("trade_done:")) {
            const id = command.split(":")[1]
            const t = trades.get(id)
            if (!t || t.done) return
            const clicker = await resolvePn(sock, m, m.sender)
            const who =
                clicker === t.a || m.sender === t.a
                    ? "a"
                    : clicker === t.b || m.sender === t.b
                      ? "b"
                      : null
            if (!who) return
            t.ready[who] = true

            if (t.ready.a && t.ready.b) {
                // Validasi kepemilikan sebelum eksekusi
                for (const p of ["a", "b"]) {
                    const jid = t[p]
                    const o = t.offer[p]
                    if (o.money && getMoney(jid) < o.money) {
                        trades.delete(id)
                        return m.reply(
                            card("TRADE GAGAL", `${tag(jid)} uang tidak cukup.`, { emoji: "🔁" }),
                            { mentions: [jid] }
                        )
                    }
                    const pl = getPlayer(jid)
                    for (const [k, q] of Object.entries(o.fish)) {
                        if ((pl.inventory[k] || 0) < q) {
                            trades.delete(id)
                            return m.reply(
                                card("TRADE GAGAL", `${tag(jid)} ikan tidak cukup.`, {
                                    emoji: "🔁"
                                }),
                                { mentions: [jid] }
                            )
                        }
                    }
                }
                executeTrade(t)
                t.done = true
                trades.delete(id)
                return m.reply(
                    card(
                        "TRADE SELESAI",
                        [`✅ Barang telah ditukar!`, `${tag(t.a)} 🔁 ${tag(t.b)}`],
                        {
                            emoji: "🎉"
                        }
                    ),
                    { mentions: [t.a, t.b] }
                )
            }
            return renderTrade(sock, m, id)
        }

        // ── Subcommand: add / money (saat trade berlangsung) ──
        const sub = args[0]?.toLowerCase()
        if (sub === "add" || sub === "money") {
            const [id, t] = findTradeOf(me)
            if (!t || !t.started)
                return m.reply(card("TRADE", "Kamu tidak sedang trading.", { emoji: "🔁" }))
            const s = side(t, me)
            // reset ready saat offer berubah
            t.ready.a = false
            t.ready.b = false

            if (sub === "money") {
                const amt = parseInt(args[1], 10)
                if (isNaN(amt) || amt < 0)
                    return m.reply(card("TRADE", "Jumlah uang tidak valid.", { emoji: "🔁" }))
                if (getMoney(me) < amt)
                    return m.reply(card("TRADE", "Uang kamu tidak cukup.", { emoji: "🔁" }))
                t.offer[s].money = amt
            } else {
                const fishKey = args.find((a) => /^[a-z]+_\d+(#\w+)?$/i.test(a))
                const q =
                    parseInt(
                        args.find((a, i) => i > 1 && /^\d+$/.test(a)),
                        10
                    ) || 1
                if (!fishKey) return m.reply(card("TRADE", "Sebutkan id ikan.", { emoji: "🔁" }))
                const base = fishKey.split("#")[0]
                if (!getFishById(base))
                    return m.reply(card("TRADE", `Ikan "${base}" tidak dikenal.`, { emoji: "🔁" }))
                if (isFav(me, base))
                    return m.reply(
                        card("TRADE", "Ikan favorit ⭐ tidak bisa di-trade.", { emoji: "🔁" })
                    )
                const have = getPlayer(me).inventory[fishKey] || 0
                if (have < q)
                    return m.reply(
                        card("TRADE", `Ikan tidak cukup (punya ${have}).`, { emoji: "🔁" })
                    )
                t.offer[s].fish[fishKey] = (t.offer[s].fish[fishKey] || 0) + q
            }
            return renderTrade(sock, m, id)
        }

        // ── Mulai trade: undang target ──
        const raw = m.mentionedJid?.[0] || m.quoted?.sender
        const target = await resolvePn(sock, m, raw)
        if (!target) {
            return m.reply(
                card(
                    "TRADE",
                    [
                        `Tag/reply user untuk trading.`,
                        `${global.prefix}trade @user`,
                        ``,
                        `Setelah diterima:`,
                        `${global.prefix}trade add <idIkan> [jml]`,
                        `${global.prefix}trade money <jumlah>`
                    ],
                    { emoji: "🔁" }
                )
            )
        }
        if (target === me)
            return m.reply(
                card("TRADE", "Tidak bisa trade dengan diri sendiri. 😅", { emoji: "🔁" })
            )
        const [existing] = findTradeOf(me)
        if (existing) return m.reply(card("TRADE", "Kamu sudah dalam sesi trade.", { emoji: "🔁" }))

        const id = newId()
        trades.set(id, {
            a: me,
            b: target,
            chat: m.chat,
            offer: { a: { money: 0, fish: {} }, b: { money: 0, fish: {} } },
            ready: { a: false, b: false },
            started: false,
            done: false
        })
        const t = setTimeout(() => trades.delete(id), 5 * 60 * 1000)
        if (t.unref) t.unref()

        return Button.menu({
            sock,
            m,
            body: card(
                "UNDANGAN TRADE",
                [`${tag(me)} mengajak ${tag(target)} trading!`, ``, `${tag(target)}, terima?`],
                { emoji: "🔁" }
            ),
            footer: "© Chaeul RPG",
            mentions: [me, target],
            buttons: [
                { type: "quick", text: "✅ Terima", id: `trade_accept:${id}` },
                { type: "quick", text: "❌ Tolak", id: `trade_decline:${id}` }
            ]
        })
    }
}
