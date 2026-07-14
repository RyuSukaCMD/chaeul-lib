import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { getPlayer, getMoney, addMoney, removeItem, addItem, isFav } from "../../lib/rpg.js"
import { listOwnedFish, pageRows } from "../../lib/fishpicker.js"

// Sesi: id -> { a,b,chat, offer:{a:{money,fish:{}},b:{...}}, ready:{a,b},
//              started, done, msgKey, page:{a,b} }
const trades = new Map()
const newId = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`
// Sesi input uang: jid -> tradeId (menunggu user ketik jumlah)
const awaitingMoney = new Map()

function findTradeOf(jid) {
    for (const [id, t] of trades) if (!t.done && (t.a === jid || t.b === jid)) return [id, t]
    return [null, null]
}
const sideOf = (t, jid) => (t.a === jid ? "a" : "b")

function offerText(t, jid, label) {
    const o = t.offer[sideOf(t, jid)]
    const lines = [`📦 ${label}:`]
    if (o.money) lines.push(`   💰 $${o.money.toLocaleString("id-ID")}`)
    for (const [k, q] of Object.entries(o.fish)) {
        const it = listOwnedFish(jid).find((x) => x.key === k)
        lines.push(`   ${it ? it.label : k} ×${q}`)
    }
    if (!o.money && !Object.keys(o.fish).length) lines.push(`   (kosong)`)
    return lines
}

async function renderTrade(sock, m, id, forJid = null, page = 0) {
    const t = trades.get(id)
    if (!t) return
    if (t.msgKey) {
        try {
            await sock.sendMessage(t.chat, { delete: t.msgKey })
        } catch {}
    }

    // Panel utama: ringkasan offer + tombol aksi.
    // Bila forJid diberikan, tampilkan juga daftar ikan orang itu utk dipilih.
    let sections
    let navButtons = []
    if (forJid) {
        const items = listOwnedFish(forJid).filter((it) => !isFav(forJid, it.baseId))
        const s = sideOf(t, forJid)
        const {
            rows,
            page: p,
            totalPages
        } = pageRows(items, page, (it) => `trade_add:${id}:${it.key}`)
        t.page[s] = p
        if (rows.length)
            sections = [{ title: `✦ Ikan ${tag(forJid)} (Hal ${p + 1}/${totalPages})`, rows }]
        if (p > 0) navButtons.push({ type: "quick", text: "⬅️", id: `trade_list:${id}:${p - 1}` })
        if (p < totalPages - 1)
            navButtons.push({ type: "quick", text: "➡️", id: `trade_list:${id}:${p + 1}` })
    }

    const actionButtons = [
        { type: "quick", text: "🐟 Pilih Ikanku", id: `trade_list:${id}:0` },
        { type: "quick", text: "💰 Set Uang", id: `trade_money:${id}` },
        { type: "quick", text: "✅ Done", id: `trade_done:${id}` },
        { type: "quick", text: "❌ Cancel", id: `trade_cancel:${id}` }
    ]

    const body = card(
        "TRADE",
        [
            `${tag(t.a)} 🔁 ${tag(t.b)}`,
            ``,
            ...offerText(t, t.a, tag(t.a)),
            ``,
            ...offerText(t, t.b, tag(t.b)),
            ``,
            `Ready: ${t.ready.a ? "✅" : "◻️"} ${tag(t.a)} | ${t.ready.b ? "✅" : "◻️"} ${tag(t.b)}`,
            ``,
            `Gunakan tombol di bawah. Kedua pihak tekan DONE.`
        ],
        { emoji: "🔁" }
    )

    const sent = await Button.menu({
        sock,
        m,
        body,
        footer: "© Chaeul RPG",
        mentions: [t.a, t.b],
        listTitle: forJid ? "🐟 Pilih Ikan" : undefined,
        sections,
        buttons: [...navButtons, ...actionButtons]
    })
    if (sent?.key) t.msgKey = sent.key
    return sent
}

function execute(t) {
    const move = (from, to, o) => {
        if (o.money) {
            addMoney(from, -o.money)
            addMoney(to, o.money)
        }
        for (const [k, q] of Object.entries(o.fish)) {
            removeItem(from, k, q)
            addItem(to, k, q)
        }
    }
    move(t.a, t.b, t.offer.a)
    move(t.b, t.a, t.offer.b)
}

export default {
    command: [
        "trade",
        /^trade_accept:.+$/,
        /^trade_decline:.+$/,
        /^trade_list:.+$/,
        /^trade_add:.+$/,
        /^trade_money:.+$/,
        /^trade_done:.+$/,
        /^trade_cancel:.+$/
    ],

    category: "RPG",

    description: "Trading ikan + uang antar pemain (pilih lewat tombol)",

    async run({ sock, m, command, args, text }) {
        const me = await resolvePn(sock, m, m.sender)

        // ── Input jumlah uang (ketik angka setelah tekan Set Uang) ──
        if (awaitingMoney.has(me) && /^\d+$/.test((text || "").trim())) {
            const id = awaitingMoney.get(me)
            const t = trades.get(id)
            awaitingMoney.delete(me)
            if (t && t.started) {
                const amt = parseInt(text.trim(), 10)
                if (getMoney(me) >= amt) {
                    t.offer[sideOf(t, me)].money = amt
                    t.ready.a = false
                    t.ready.b = false
                } else {
                    await m.reply(card("TRADE", "Uang tidak cukup.", { emoji: "🔁" }))
                }
                return renderTrade(sock, m, id)
            }
        }

        // ── Accept / Decline ──
        if (command.startsWith("trade_accept:") || command.startsWith("trade_decline:")) {
            const id = command.split(":")[1]
            const t = trades.get(id)
            if (!t) return m.reply(card("TRADE", "Undangan kedaluwarsa.", { emoji: "🔁" }))
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

        // ── Tampilkan daftar ikan milik penekan ──
        if (command.startsWith("trade_list:")) {
            const [, id, pg] = command.split(":")
            const t = trades.get(id)
            if (!t) return
            const who = me === t.a || me === t.b ? me : null
            if (!who) return
            return renderTrade(sock, m, id, who, Number(pg) || 0)
        }

        // ── Tambah ikan ke offer ──
        if (command.startsWith("trade_add:")) {
            const [, id, key] = command.split(":")
            const t = trades.get(id)
            if (!t) return
            const who = me === t.a || me === t.b ? me : null
            if (!who) return
            if (isFav(who, key.split("#")[0])) return
            const s = sideOf(t, who)
            const have = getPlayer(who).inventory[key] || 0
            const cur = t.offer[s].fish[key] || 0
            if (cur < have) t.offer[s].fish[key] = cur + 1
            t.ready.a = false
            t.ready.b = false
            return renderTrade(sock, m, id, who, t.page[s] || 0)
        }

        // ── Set uang: minta ketik jumlah ──
        if (command.startsWith("trade_money:")) {
            const id = command.split(":")[1]
            const t = trades.get(id)
            if (!t) return
            const who = me === t.a || me === t.b ? me : null
            if (!who) return
            awaitingMoney.set(who, id)
            return m.reply(
                card("TRADE", [`💰 Ketik jumlah uang yang mau kamu tawarkan:`, `(angka saja)`], {
                    emoji: "🔁"
                })
            )
        }

        // ── Cancel ──
        if (command.startsWith("trade_cancel:")) {
            const id = command.split(":")[1]
            const t = trades.get(id)
            if (!t) return
            trades.delete(id)
            return m.reply(card("TRADE", "Trade dibatalkan. ❌", { emoji: "🔁" }))
        }

        // ── Done ──
        if (command.startsWith("trade_done:")) {
            const id = command.split(":")[1]
            const t = trades.get(id)
            if (!t || t.done) return
            const who = me === t.a ? "a" : me === t.b ? "b" : null
            if (!who) return
            t.ready[who] = true

            if (t.ready.a && t.ready.b) {
                // Validasi kepemilikan
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
                execute(t)
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

        // ── Mulai trade ──
        const raw = m.mentionedJid?.[0] || m.quoted?.sender
        const target = await resolvePn(sock, m, raw)
        if (!target) {
            return m.reply(
                card("TRADE", [`Tag/reply user.`, `Contoh: ${global.prefix}trade @user`], {
                    emoji: "🔁"
                })
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
            page: { a: 0, b: 0 },
            started: false,
            done: false,
            msgKey: null
        })
        const t = setTimeout(() => trades.delete(id), 10 * 60 * 1000)
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
