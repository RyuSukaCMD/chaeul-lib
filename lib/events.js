import { readJSON, writeJSON } from "./db.js"

// Sistem event acak dengan STACKING (beberapa event bisa aktif bersamaan).
//   { active: [ { id, endsAt }, ... ], groups: { "<jid>": true } }
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
        duration: 15 * 60 * 1000,
        emoji: "🌟"
    },
    {
        id: "market",
        name: "💹 Market Boom",
        desc: "Harga jual ikan NAIK 2×!",
        effect: { money: 2 },
        duration: 15 * 60 * 1000,
        emoji: "💹"
    },
    {
        id: "frenzy",
        name: "⚡ Fishing Frenzy",
        desc: "Cooldown mancing HILANG!",
        effect: { noFishCd: true },
        duration: 15 * 60 * 1000,
        emoji: "⚡"
    },
    {
        id: "abyss",
        name: "🌊 Abyss Rising",
        desc: "Ikan Mythical+ jauh lebih sering muncul (Luck 4×)!",
        effect: { luck: 4 },
        duration: 15 * 60 * 1000,
        emoji: "🌊"
    }
]

function load() {
    const d = readJSON(DB, { active: [], groups: {} })
    // Migrasi skema lama (active: {id,endsAt} objek tunggal → array)
    if (d.active && !Array.isArray(d.active)) {
        d.active = d.active.id ? [{ id: d.active.id, endsAt: d.active.endsAt }] : []
        save(d)
    }
    if (!Array.isArray(d.active)) d.active = []
    return d
}
function save(d) {
    writeJSON(DB, d)
}

// Buang event yang sudah berakhir; kembalikan data bersih.
function clean(d) {
    const now = Date.now()
    const before = d.active.length
    d.active = d.active.filter((a) => a.endsAt > now)
    if (d.active.length !== before) save(d)
    return d
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

/** Semua event yang sedang aktif (array, mungkin kosong). */
export function getActiveEvents() {
    const d = clean(load())
    return d.active
        .map((a) => {
            const ev = EVENTS.find((e) => e.id === a.id)
            return ev ? { ...ev, endsAt: a.endsAt } : null
        })
        .filter(Boolean)
}

/**
 * Event tunggal aktif (kompatibilitas lama) — kembalikan yang PERTAMA.
 * Untuk logika buff pakai getStackedEffect().
 */
export function getActiveEvent() {
    const list = getActiveEvents()
    return list[0] || null
}

/**
 * Gabungan efek dari SEMUA event aktif (stacking).
 * luck & mutation & money dikalikan; noFishCd = true bila salah satu aktif.
 * @returns {{ luck, mutation, money, noFishCd }}
 */
export function getStackedEffect() {
    const eff = { luck: 1, mutation: 1, money: 1, noFishCd: false }
    for (const ev of getActiveEvents()) {
        if (ev.effect.luck) eff.luck *= ev.effect.luck
        if (ev.effect.mutation) eff.mutation *= ev.effect.mutation
        if (ev.effect.money) eff.money *= ev.effect.money
        if (ev.effect.noFishCd) eff.noFishCd = true
    }
    return eff
}

/**
 * Mulai sebuah event (acak / spesifik). STACK dengan event lain.
 * Bila event dengan id sama sudah aktif, perbarui waktu berakhirnya.
 */
export function startEvent(id = null) {
    const ev = id
        ? EVENTS.find((e) => e.id === id)
        : EVENTS[Math.floor(Math.random() * EVENTS.length)]
    if (!ev) return null
    const d = clean(load())
    const endsAt = Date.now() + ev.duration
    const existing = d.active.find((a) => a.id === ev.id)
    if (existing) {
        existing.endsAt = endsAt // perpanjang
    } else {
        d.active.push({ id: ev.id, endsAt })
    }
    save(d)
    return { ...ev, endsAt }
}

/** Matikan 1 event (by id) atau SEMUA event bila id null. */
export function endEvent(id = null) {
    const d = load()
    if (id) {
        d.active = d.active.filter((a) => a.id !== id)
    } else {
        d.active = []
    }
    save(d)
}

export default {
    EVENTS,
    registerGroup,
    getGroups,
    getActiveEvents,
    getActiveEvent,
    getStackedEffect,
    startEvent,
    endEvent
}
