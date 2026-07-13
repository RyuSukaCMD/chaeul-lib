import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { getPlayer, addItem, addXp, rollFish, ITEMS, cdLeft, setCd, CONFIG } from "../../lib/rpg.js"

// Sesi minigame aktif: sessionId -> { owner, chat, order:[dir...], next, msgKey, done }
const sessions = new Map()

// Arah pancing (emoji) untuk tombol
const DIRS = ["⬆️", "⬇️", "⬅️", "➡️", "↗️", "↘️"]

function newId() {
    return `${Date.now()}${Math.floor(Math.random() * 1000)}`
}

function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

function fmtWait(ms) {
    const s = Math.ceil(ms / 1000)
    return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`
}

export default {
    command: ["fishing", "mancing", "fish", /^fish_pull:.*/],

    category: "RPG",

    description: "Memancing ikan (minigame urutan tombol)",

    async run({ sock, m, command }) {
        const me = await resolvePn(sock, m, m.sender)

        // ═══════════ Handler tombol tarik kail ═══════════
        if (command.startsWith("fish_pull:")) {
            const [, sid, slotStr] = command.split(":")
            const slot = Number(slotStr)
            const sess = sessions.get(sid)

            if (!sess || sess.done) return // sesi habis/selesai → abaikan

            // Hanya pemilik sesi
            const clicker = await resolvePn(sock, m, m.sender)
            if (clicker !== sess.owner && m.sender !== sess.owner) return

            const expected = sess.order[sess.next]

            // Urutan salah → ikan lepas
            if (slot !== expected) {
                sess.done = true
                sessions.delete(sid)
                return m.reply(
                    card("MANCING", "😩 Yah, ikannya lepas!\nSemoga beruntung lain kali!", {
                        emoji: "🎣"
                    })
                )
            }

            // Benar → lanjut
            sess.next++

            // Belum selesai → tunggu klik berikutnya (JANGAN reply)
            if (sess.next < sess.order.length) return

            // ── Semua urutan benar → dapat ikan ──
            sess.done = true
            sessions.delete(sid)

            const p = getPlayer(me)
            const luck = ITEMS[p.rodEquipped]?.luck || (p.inventory?.prorod ? 2 : 1)
            const fish = rollFish(luck)

            addItem(me, fish.id, 1)
            const { leveled } = addXp(me, 15)

            return m.reply(
                card(
                    "MANCING BERHASIL",
                    [
                        `🎉 Kamu menangkap:`,
                        `${fish.emoji} *${fish.name}* (${fish.rarity})`,
                        ``,
                        `💰 Nilai jual : $${fish.price}`,
                        `✨ +15 XP${leveled ? `  ·  🎊 NAIK LEVEL!` : ""}`,
                        ``,
                        `Jual ikan: ${global.prefix}sell`
                    ],
                    { emoji: "🎣" }
                )
            )
        }

        // ═══════════ Command utama: mulai memancing ═══════════
        // Cooldown 30 detik
        const left = cdLeft(me, "fish", CONFIG.fishCooldown)
        if (left > 0) {
            return m.reply(
                card("MANCING", `⏳ Sabar, tunggu ${fmtWait(left)} lagi sebelum memancing.`, {
                    emoji: "🎣"
                })
            )
        }
        setCd(me, "fish")

        // 1) Reply "Memancing..."
        const sent = await m.reply(
            card("MANCING", "🎣 Memancing...\nMelempar kail ke air...", { emoji: "🎣" })
        )
        const msgKey = sent?.key

        // 2) Setelah 5-10 detik → edit jadi "Kail bergerak!"
        const delay = 5000 + Math.floor(Math.random() * 5000)
        await new Promise((r) => setTimeout(r, delay))

        try {
            await sock.sendMessage(m.chat, {
                text: card("MANCING", "❗ *Kail pancing bergerak!*\nBersiap menarik...", {
                    emoji: "🎣"
                }),
                edit: msgKey
            })
        } catch {}

        // 3) Buat urutan acak 2-6 tombol
        const count = 2 + Math.floor(Math.random() * 5) // 2..6
        const sid = newId()

        // order[i] = slot yang harus diklik ke-i. Slot 0..count-1.
        // Kita acak URUTAN klik yang benar, lalu tampilkan tombol dgn nomor urutan.
        const slots = shuffle([...Array(count).keys()]) // urutan klik benar (slot demi slot)
        // Tiap slot punya arah acak
        const dirs = slots.map(() => DIRS[Math.floor(Math.random() * DIRS.length)])

        // order = daftar slot sesuai urutan klik yang benar
        const order = slots

        sessions.set(sid, { owner: me, chat: m.chat, order, next: 0, done: false })

        // Auto-expire sesi 30 detik
        const t = setTimeout(() => {
            const s = sessions.get(sid)
            if (s && !s.done) {
                sessions.delete(sid)
                sock.sendMessage(m.chat, {
                    text: card("MANCING", "⌛ Terlalu lama! Ikannya kabur. 🐟💨", { emoji: "🎣" }),
                    mentions: [me]
                }).catch(() => {})
            }
        }, 30 * 1000)
        if (t.unref) t.unref()

        // 4) Tombol: label "(urutan) (arah)". Ditampilkan dengan URUTAN ACAK
        //    supaya user harus mencari nomor 1,2,3,... sendiri.
        // Buat tombol per-slot: slot s harus diklik pada posisi order.indexOf(s)+1
        const buttons = []
        for (let s = 0; s < count; s++) {
            const clickOrder = order.indexOf(s) + 1 // nomor urutan yg tampil
            buttons.push({
                type: "quick",
                text: `${clickOrder} ${dirs[order.indexOf(s)]}`,
                id: `fish_pull:${sid}:${s}`
            })
        }
        // Acak tampilan tombol
        const shuffledButtons = shuffle(buttons)

        return Button.menu({
            sock,
            m,
            body: card(
                "TARIK KAIL!",
                [
                    `🎯 *KLIK TOMBOL SESUAI URUTAN* untuk menarik kail!`,
                    ``,
                    `Urutan: 1 → ${count}`,
                    `⏳ 30 detik!`
                ],
                { emoji: "🎣" }
            ),
            footer: "© Chaeul RPG",
            lock: me,
            buttons: shuffledButtons
        })
    }
}
