import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import {
    getPlayer,
    addItem,
    addXp,
    cdLeft,
    setCd,
    CONFIG,
    ITEMS,
    rodLuck,
    rodReel,
    recordCatch
} from "../../lib/rpg.js"
import { getActiveEvent } from "../../lib/events.js"
import {
    RARITY,
    PHASE_RARITIES,
    rollRarity,
    randomFishOf,
    rollMutation,
    fishValue,
    fishDisplay
} from "../../lib/fish.js"

// Sesi minigame: sid -> { owner, chat, fish, mutation, phases:[[slots]...],
//                         phaseIdx, next, done }
const sessions = new Map()

// Kunci per-grup: hanya 1 user boleh mancing dalam satu grup pada satu waktu.
const groupLock = new Map() // chat -> sid

function releaseLock(chat, sid) {
    if (groupLock.get(chat) === sid) groupLock.delete(chat)
}

const DIRS = ["⬆️", "⬇️", "⬅️", "➡️", "↗️", "↘️", "↕️", "↔️", "🔄", "🎯"]

const newId = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}
const fmtWait = (ms) => {
    const s = Math.ceil(ms / 1000)
    return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`
}

// Bangun 1 phase: array slot 0..n-1 dgn urutan klik acak & arah acak
function buildPhase(count) {
    const order = shuffle([...Array(count).keys()]) // urutan klik benar
    const dirs = order.map(() => DIRS[Math.floor(Math.random() * DIRS.length)])
    return { order, dirs }
}

// Kirim tombol untuk sebuah phase (urutan tampil diacak)
async function sendPhaseButtons(sock, m, sess, phaseNo, totalPhases) {
    const phase = sess.phases[sess.phaseIdx]
    const count = phase.order.length
    const owner = sess.owner

    const buttons = []
    for (let s = 0; s < count; s++) {
        const clickOrder = phase.order.indexOf(s) + 1
        buttons.push({
            type: "quick",
            text: `${clickOrder} ${phase.dirs[phase.order.indexOf(s)]}`,
            id: `fish_pull:${sess.sid}:${s}`
        })
    }

    const phaseLine = totalPhases > 1 ? `\n🌀 *Phase ${phaseNo}/${totalPhases}*` : ""

    return Button.menu({
        sock,
        m,
        body: card(
            "TARIK KAIL!",
            [
                `${tag(owner)}, 🎯 *KLIK TOMBOL SESUAI URUTAN!*${phaseLine}`,
                ``,
                `Urutan: 1 → ${count}`,
                `⏳ Cepat sebelum kabur!`
            ],
            { emoji: "🎣" }
        ),
        footer: "© Chaeul RPG",
        mentions: [owner],
        lock: owner,
        buttons: shuffle(buttons)
    })
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
            if (!sess || sess.done) return

            const clicker = await resolvePn(sock, m, m.sender)
            if (clicker !== sess.owner && m.sender !== sess.owner) return

            const phase = sess.phases[sess.phaseIdx]
            const expected = phase.order[sess.next]

            // Salah urutan → ikan lepas
            if (slot !== expected) {
                sess.done = true
                sessions.delete(sid)
                releaseLock(sess.chat, sid)
                return m.reply(
                    card("MANCING", "😩 Yah, ikannya lepas!\nSemoga beruntung lain kali!", {
                        emoji: "🎣"
                    }),
                    { mentions: [sess.owner] }
                )
            }

            sess.next++

            // Phase belum selesai → tunggu klik berikutnya (jangan reply)
            if (sess.next < phase.order.length) return

            // Phase selesai → lanjut phase berikutnya bila ada
            if (sess.phaseIdx < sess.phases.length - 1) {
                sess.phaseIdx++
                sess.next = 0
                return sendPhaseButtons(sock, m, sess, sess.phaseIdx + 1, sess.phases.length)
            }

            // ── Semua phase selesai → dapat ikan ──
            sess.done = true
            sessions.delete(sid)
            releaseLock(sess.chat, sid)

            addItem(me, sess.fish.id + (sess.mutation ? `#${sess.mutation.id}` : ""), 1)
            recordCatch(me, sess.fish.id)
            // XP: makin langka makin besar
            const xpGain = RARITY[sess.fish.rarity].weight > 1000 ? 15 : 40
            const { leveled } = addXp(me, xpGain)

            const value = fishValue(sess.fish, sess.mutation)
            const rar = RARITY[sess.fish.rarity]

            return m.reply(
                card(
                    "MANCING BERHASIL",
                    [
                        `🎉 ${tag(sess.owner)} menangkap:`,
                        `${fishDisplay(sess.fish, sess.mutation)}`,
                        ``,
                        `${rar.emoji} Rarity : ${rar.label}`,
                        sess.mutation
                            ? `${sess.mutation.emoji} Mutation : ${sess.mutation.name} (×${sess.mutation.mult})`
                            : `✧ Tanpa mutation`,
                        `💰 Nilai : $${value.toLocaleString("id-ID")}`,
                        leveled ? `\n🎊 NAIK LEVEL!` : ``,
                        ``,
                        `Jual: ${global.prefix}sell`
                    ].filter((x) => x !== ``),
                    { emoji: "🎣" }
                ),
                { mentions: [sess.owner] }
            )
        }

        // ═══════════ Command utama: mulai memancing ═══════════
        // Kunci per-grup: hanya 1 orang boleh mancing di grup pada satu waktu.
        if (m.isGroup && groupLock.has(m.chat)) {
            return m.reply(
                card(
                    "MANCING",
                    "🎣 Ada yang sedang memancing di grup ini.\nTunggu sampai selesai ya!",
                    {
                        emoji: "⏳"
                    }
                )
            )
        }

        const activeEv = getActiveEvent()
        const noCd = activeEv?.effect?.noFishCd
        const left = noCd ? 0 : cdLeft(me, "fish", CONFIG.fishCooldown)
        if (left > 0) {
            return m.reply(
                card("MANCING", `⏳ Sabar, tunggu ${fmtWait(left)} lagi.`, { emoji: "🎣" })
            )
        }
        if (!noCd) setCd(me, "fish")

        // Data pemain & rod (luck + reel speed)
        const p = getPlayer(me)
        const reel = rodReel(p) // mengurangi button & mempercepat waktu tunggu
        const ev = getActiveEvent() // event buff aktif (bila ada)

        // 1) Reply "Memancing..."
        const sent = await m.reply(
            card("MANCING", "🎣 Memancing...\nMelempar kail ke air...", { emoji: "🎣" })
        )
        const msgKey = sent?.key

        // 2) Tunggu (5-10 detik) — reel speed mempercepat (min 1.5 detik)
        const baseWait = 5000 + Math.floor(Math.random() * 5000)
        const wait = Math.max(1500, baseWait - reel * 1500)
        await new Promise((r) => setTimeout(r, wait))
        try {
            await sock.sendMessage(m.chat, {
                text: card("MANCING", "❗ *Kail pancing bergerak!*\nBersiap menarik...", {
                    emoji: "🎣"
                }),
                edit: msgKey
            })
        } catch {}

        // 3) Roll rarity → ikan, mutation, jumlah button & phase
        let luck = rodLuck(p)
        if (ev?.effect?.luck) luck *= ev.effect.luck
        const rarity = rollRarity(luck)
        const fish = randomFishOf(rarity)
        const mutation = rollMutation(ev?.effect?.mutation || 1)
        const cfg = RARITY[rarity]

        // Jumlah button per phase — dikurangi reel speed (min 1)
        const btnCount = () => Math.max(1, randInt(cfg.buttons[0], cfg.buttons[1]) - reel)

        // Phase: rarity biasa = 1 phase; mythical+ = acak dalam rentang phases
        let phaseCount = 1
        if (PHASE_RARITIES.includes(rarity) && Array.isArray(cfg.phases)) {
            phaseCount = randInt(cfg.phases[0], cfg.phases[1])
        }
        const phases = Array.from({ length: phaseCount }, () => buildPhase(btnCount()))

        const sid = newId()
        const sess = {
            sid,
            owner: me,
            chat: m.chat,
            fish,
            mutation,
            phases,
            phaseIdx: 0,
            next: 0,
            done: false
        }
        sessions.set(sid, sess)
        if (m.isGroup) groupLock.set(m.chat, sid) // kunci grup

        // Auto-expire 45 detik (lebih lama utk multi-phase)
        const t = setTimeout(() => {
            const s = sessions.get(sid)
            releaseLock(m.chat, sid)
            if (s && !s.done) {
                sessions.delete(sid)
                sock.sendMessage(m.chat, {
                    text: card("MANCING", `⌛ ${tag(me)} terlalu lama! Ikannya kabur. 🐟💨`, {
                        emoji: "🎣"
                    }),
                    mentions: [me]
                }).catch(() => {})
            }
        }, 45 * 1000)
        if (t.unref) t.unref()

        // 4) Kirim tombol phase pertama (dengan TAG user)
        return sendPhaseButtons(sock, m, sess, 1, phaseCount)
    }
}
