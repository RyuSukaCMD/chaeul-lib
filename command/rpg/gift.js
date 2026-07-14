import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { getPlayer, removeItem, addItem, isFav } from "../../lib/rpg.js"
import { listOwnedFish, pageRows } from "../../lib/fishpicker.js"

// Sesi gift: id -> { from, to, chat, picks:{key:qty}, msgKey }
const sessions = new Map()
const newId = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`

function findSession(jid) {
    for (const [id, s] of sessions) if (s.from === jid) return [id, s]
    return [null, null]
}

async function render(sock, m, id, page = 0) {
    const s = sessions.get(id)
    if (!s) return
    // Hapus pesan sebelumnya (pagination bersih)
    if (s.msgKey) {
        try {
            await sock.sendMessage(s.chat, { delete: s.msgKey })
        } catch {}
    }

    const items = listOwnedFish(s.from).filter((it) => !isFav(s.from, it.baseId))
    const { rows, page: p, totalPages } = pageRows(items, page, (it) => `gift_add:${id}:${it.key}`)

    const pickLines = Object.entries(s.picks).map(([k, q]) => {
        const it = items.find((x) => x.key === k) || { label: k }
        return `  • ${it.label} ×${q}`
    })

    const nav = []
    if (p > 0) nav.push({ type: "quick", text: "⬅️ Prev", id: `gift_page:${id}:${p - 1}` })
    if (p < totalPages - 1)
        nav.push({ type: "quick", text: "Next ➡️", id: `gift_page:${id}:${p + 1}` })
    const actions = [
        { type: "quick", text: "✅ Kirim", id: `gift_done:${id}` },
        { type: "quick", text: "❌ Batal", id: `gift_cancel:${id}` }
    ]

    const sent = await Button.menu({
        sock,
        m,
        body: card(
            "GIFT IKAN",
            [
                `🎁 ${tag(s.from)} → ${tag(s.to)}`,
                ``,
                pickLines.length ? `Dipilih:` : `Belum ada ikan dipilih.`,
                ...pickLines,
                ``,
                `📄 Hal ${p + 1}/${totalPages} • tap ikan untuk +1`,
                `Ikan favorit ⭐ tidak muncul (dilindungi).`
            ],
            { emoji: "🎁" }
        ),
        footer: "© Chaeul RPG",
        mentions: [s.from, s.to],
        lock: s.from,
        listTitle: "🎁 Pilih Ikan",
        sections: rows.length ? [{ title: `✦ IKAN (Hal ${p + 1})`, rows }] : undefined,
        buttons: [...nav, ...actions]
    })
    if (sent?.key) s.msgKey = sent.key
    s.page = p
    return sent
}

export default {
    command: [
        "gift",
        "giftfish",
        "kadoikan",
        /^gift_add:.+$/,
        /^gift_page:.+$/,
        /^gift_done:.+$/,
        /^gift_cancel:.+$/
    ],

    category: "RPG",

    description: "Beri ikan ke pemain lain (pilih lewat tombol)",

    async run({ sock, m, command }) {
        const me = await resolvePn(sock, m, m.sender)

        // ── Tambah ikan ke pilihan ──
        if (command.startsWith("gift_add:")) {
            const [, id, key] = command.split(":")
            const s = sessions.get(id)
            if (!s) return
            if ((await resolvePn(sock, m, m.sender)) !== s.from && m.sender !== s.from) return
            const have = getPlayer(s.from).inventory[key] || 0
            const cur = s.picks[key] || 0
            if (cur < have) s.picks[key] = cur + 1
            return render(sock, m, id, s.page || 0)
        }

        // ── Pindah halaman ──
        if (command.startsWith("gift_page:")) {
            const [, id, pg] = command.split(":")
            const s = sessions.get(id)
            if (!s) return
            return render(sock, m, id, Number(pg) || 0)
        }

        // ── Batal ──
        if (command.startsWith("gift_cancel:")) {
            const id = command.split(":")[1]
            sessions.delete(id)
            return m.reply(card("GIFT", "Dibatalkan. ✋", { emoji: "🎁" }))
        }

        // ── Kirim (confirm) ──
        if (command.startsWith("gift_done:")) {
            const id = command.split(":")[1]
            const s = sessions.get(id)
            if (!s) return
            const keys = Object.keys(s.picks)
            if (!keys.length) return m.reply(card("GIFT", "Belum pilih ikan.", { emoji: "🎁" }))

            // Validasi & transfer
            const lines = []
            for (const k of keys) {
                const q = s.picks[k]
                if (isFav(s.from, k.split("#")[0])) continue
                if ((getPlayer(s.from).inventory[k] || 0) < q) continue
                removeItem(s.from, k, q)
                addItem(s.to, k, q)
                const it = listOwnedFish(s.to).find((x) => x.key === k)
                lines.push(`• ${it ? it.label : k} ×${q}`)
            }
            sessions.delete(id)
            await m.react("🎁")
            return m.reply(
                card("GIFT TERKIRIM", [`🎁 ${tag(s.from)} → ${tag(s.to)}`, ``, ...lines], {
                    emoji: "🎁"
                }),
                { mentions: [s.from, s.to] }
            )
        }

        // ── Mulai gift ──
        const raw = m.mentionedJid?.[0] || m.quoted?.sender
        const target = await resolvePn(sock, m, raw)
        if (!target) {
            return m.reply(
                card("GIFT", [`Tag/reply penerima.`, `Contoh: ${global.prefix}gift @user`], {
                    emoji: "🎁"
                })
            )
        }
        if (target === me)
            return m.reply(card("GIFT", "Tidak bisa beri ke diri sendiri. 😅", { emoji: "🎁" }))

        const items = listOwnedFish(me).filter((it) => !isFav(me, it.baseId))
        if (!items.length)
            return m.reply(
                card("GIFT", [`Kamu tidak punya ikan (non-favorit).`, `Mancing dulu!`], {
                    emoji: "🎁"
                })
            )

        const [existing] = findSession(me)
        if (existing) sessions.delete(existing)

        const id = newId()
        sessions.set(id, { from: me, to: target, chat: m.chat, picks: {}, page: 0, msgKey: null })
        const t = setTimeout(() => sessions.delete(id), 5 * 60 * 1000)
        if (t.unref) t.unref()

        return render(sock, m, id, 0)
    }
}
