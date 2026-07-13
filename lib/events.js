import { readJSON, writeJSON } from "./db.js"

// Sistem event acak. Menyimpan event aktif & daftar grup penerima broadcast.
//   { active: { id, name, endsAt } | null, groups: { "<jid>": true } }
const DB = "./database/events.json"

// ─── 5 Event dengan buff ───
export const EVENTS = [
    {
        id: "lucky",
        name: "🍀 Lucky Hour",
        desc: "Peluang ikan langka NAIK 2×!",
        effect: { luck: 2 },
        duration: 15 * 60 * 1000, // 15 menit
        emoji: "🍀"
    },
    {
        id: "golden",
        name: "🌟 Golden Hour",
        desc: "Peluang MUTATION ikan NAIK 3×!",
        effect: { mutation: 3 },
        duration: 12 * 60 * 1000,
        emoji: "🌟"
    },
    {
        id: "market",
        name: "💹 Market Boom",
        desc: "Harga jual ikan NAIK 2×!",
        effect: { money: 2 },
        duration: 20 * 60 * 1000,
        emoji: "💹"
    },
    {
        id: "frenzy",
        name: "⚡ Fishing Frenzy",
        desc: "Cooldown mancing HILANG!",
        effect: { noFishCd: true },
        duration: 10 * 60 * 1000,
        emoji: "⚡"
    },
    {
        id: "abyss",
        name: "🌊 Abyss Rising",
        desc: "Ikan Mythical+ jauh lebih sering muncul (Luck 4×)!",
        effect: { luck: 4 },
        duration: 8 * 60 * 1000,
        emoji: "🌊"
    }
]

function norm(jid = "") {
    return String(jid).replace(/[^0-9]/g, "")
}
function load() {
    return readJSON(DB, { active: null, groups: {} })
}
function save(d) {
    writeJSON(DB, d)
}

/** Daftarkan grup sebagai penerima broadcast event. */
export function registerGroup(jid) {
    if (!jid || !jid.endsWith("@g.us")) return
    const d = load()
    if (!d.groups) d.groups = {}
    if (!d.groups[jid]) {
        d.groups[jid] = true
        save(d)
    }
}

export function getGroups() {
    return Object.keys(load().groups || {})
}

/** Event yang sedang aktif (atau null bila sudah berakhir). */
export function getActiveEvent() {
    const d = load()
    if (!d.active) return null
    if (Date.now() >= d.active.endsAt) {
        d.active = null
        save(d)
        return null
    }
    const ev = EVENTS.find((e) => e.id === d.active.id)
    if (!ev) return null
    return { ...ev, endsAt: d.active.endsAt }
}

/** Mulai sebuah event (acak / spesifik). Mengembalikan event yang dimulai. */
export function startEvent(id = null) {
    const ev = id
        ? EVENTS.find((e) => e.id === id)
        : EVENTS[Math.floor(Math.random() * EVENTS.length)]
    if (!ev) return null
    const d = load()
    d.active = { id: ev.id, endsAt: Date.now() + ev.duration }
    save(d)
    return { ...ev, endsAt: d.active.endsAt }
}

export function endEvent() {
    const d = load()
    d.active = null
    save(d)
}

export default {
    EVENTS,
    registerGroup,
    getGroups,
    getActiveEvent,
    startEvent,
    endEvent
}
