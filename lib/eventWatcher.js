import { EVENTS, startEvent, getGroups } from "./events.js"
import { getAllUsers } from "./register.js"
import { fullWIB } from "./time.js"
import Logger from "./logger.js"

// Menjadwalkan 1-3 event acak per hari di waktu berbeda, lalu broadcast
// ke grup yang punya minimal 1 user terdaftar (kecuali chat owner).

let timers = []

function clearTimers() {
    for (const t of timers) clearTimeout(t)
    timers = []
}

/** Kumpulan nomor terdaftar (untuk cek grup yg punya member terdaftar). */
function registeredNumbers() {
    return new Set(getAllUsers().map((u) => String(u.number)))
}

async function broadcastEvent(sock, ev) {
    const regNums = registeredNumbers()
    if (!regNums.size) return

    const ownerNums = new Set((global.owner || []).map((o) => String(o).replace(/[^0-9]/g, "")))

    const text =
        `╭━━━━━━━━━━━━━━━━━━━⬣\n` +
        `┃  🎉 *EVENT DIMULAI!*\n` +
        `┃  🕒 ${fullWIB()}\n` +
        `┣━━━━━━━━━━━━━━━━━━━⬣\n` +
        `┃ ${ev.emoji} *${ev.name}*\n` +
        `┃ ${ev.desc}\n` +
        `┃\n` +
        `┃ ⏳ Berlangsung ${Math.round(ev.duration / 60000)} menit!\n` +
        `┃ 🎣 Buruan ketik ${global.prefix}mancing!\n` +
        `╰━━━━━━━━━━━━━━━━━━━⬣`

    let sentCount = 0
    for (const gjid of getGroups()) {
        try {
            const meta = await sock.groupMetadata(gjid)
            // Grup harus punya minimal 1 member terdaftar yang BUKAN owner
            const hasRegisteredMember = meta.participants.some((p) => {
                const num = String(p.phoneNumber || p.id).replace(/[^0-9]/g, "")
                return regNums.has(num) && !ownerNums.has(num)
            })
            if (!hasRegisteredMember) continue

            await sock.sendMessage(gjid, { text })
            sentCount++
            await new Promise((r) => setTimeout(r, 800)) // jeda antar-grup (anti spam/ban)
        } catch {}
    }
    Logger.info?.(`Event "${ev.name}" broadcast ke ${sentCount} grup.`)
}

/** Jadwalkan event untuk hari ini (1-3 event di jam acak 07:00-23:00 WIB). */
function scheduleToday(sock) {
    clearTimers()

    const count = 1 + Math.floor(Math.random() * 3) // 1..3
    const now = new Date()

    // Rentang jam kemunculan (07:00 - 23:00 waktu lokal server; WIB bila TZ set)
    const usedHours = new Set()
    for (let i = 0; i < count; i++) {
        let hour
        do {
            hour = 7 + Math.floor(Math.random() * 16) // 7..22
        } while (usedHours.has(hour))
        usedHours.add(hour)

        const minute = Math.floor(Math.random() * 60)
        const when = new Date()
        when.setHours(hour, minute, 0, 0)

        const delay = when.getTime() - now.getTime()
        if (delay <= 0) continue // sudah lewat hari ini

        const t = setTimeout(async () => {
            const ev = startEvent()
            if (ev) await broadcastEvent(sock, ev)
        }, delay)
        if (t.unref) t.unref()
        timers.push(t)
    }

    // Jadwal ulang tiap tengah malam (reset harian)
    const midnight = new Date()
    midnight.setHours(24, 0, 30, 0)
    const midDelay = midnight.getTime() - now.getTime()
    const mt = setTimeout(() => scheduleToday(sock), midDelay)
    if (mt.unref) mt.unref()
    timers.push(mt)

    Logger.info?.(`Terjadwal ${count} event hari ini.`)
}

export default function startEventWatcher(sock) {
    scheduleToday(sock)
}
