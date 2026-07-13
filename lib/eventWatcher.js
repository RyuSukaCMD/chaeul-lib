import { EVENTS, startEvent, getGroups, getActiveEvents } from "./events.js"
import { isGroupRegistered } from "./groupmanage.js"
import { fullWIB } from "./time.js"
import Logger from "./logger.js"

// Event otomatis: setiap 3 JAM sekali, durasi 15 menit.
// Ada chance event STACK (nyalain event kedua bersamaan).
// Broadcast ke SEMUA grup yang sudah di-registergroup.

const INTERVAL = 3 * 60 * 60 * 1000 // 3 jam
const STACK_CHANCE = 0.35 // 35% kemungkinan langsung nyalain 2 event

let timer = null

/** Broadcast pengumuman event mulai ke semua grup terdaftar. */
async function broadcastEvents(sock, evs) {
    if (!evs.length) return

    const evLines = evs.map((ev) => `┃ ${ev.emoji} *${ev.name}*\n┃    ${ev.desc}`).join("\n┃\n")
    const stackNote = evs.length > 1 ? `\n┃ 🔥 *${evs.length} EVENT SEKALIGUS!* (STACK)` : ""

    const text =
        `╭━━━━━━━━━━━━━━━━━━━⬣\n` +
        `┃  🎉 *EVENT DIMULAI!*\n` +
        `┃  🕒 ${fullWIB()}\n` +
        `┣━━━━━━━━━━━━━━━━━━━⬣\n` +
        `${evLines}${stackNote}\n` +
        `┃\n` +
        `┃ ⏳ Berlangsung 15 menit!\n` +
        `┃ 🎣 Buruan ketik ${global.prefix}mancing!\n` +
        `╰━━━━━━━━━━━━━━━━━━━⬣`

    let sentCount = 0
    for (const gjid of getGroups()) {
        try {
            if (!isGroupRegistered(gjid)) continue // hanya grup terdaftar
            await sock.sendMessage(gjid, { text })
            sentCount++
            await new Promise((r) => setTimeout(r, 800)) // jeda antar-grup (anti spam/ban)
        } catch {}
    }
    Logger.info?.(`Event broadcast ke ${sentCount} grup terdaftar.`)
}

/** Nyalakan 1 event acak (kadang 2 = stack) lalu broadcast. */
async function fireRandomEvent(sock) {
    const started = []
    const first = startEvent()
    if (first) started.push(first)

    // Chance event kedua (stack) — pilih id berbeda
    if (Math.random() < STACK_CHANCE) {
        const others = EVENTS.filter((e) => e.id !== first?.id)
        const pick = others[Math.floor(Math.random() * others.length)]
        const second = startEvent(pick.id)
        if (second) started.push(second)
    }

    await broadcastEvents(sock, started)
}

export default function startEventWatcher(sock) {
    if (timer) clearInterval(timer)
    // Jalankan tiap 3 jam. (Tidak langsung menyala saat start agar tidak spam
    // ketika bot sering restart.)
    timer = setInterval(() => {
        fireRandomEvent(sock).catch((e) => Logger.error?.(`eventWatcher → ${e.message}`))
    }, INTERVAL)
    if (timer.unref) timer.unref()
    Logger.info?.("Event watcher aktif (tiap 3 jam, durasi 15 menit, bisa stack).")
}
