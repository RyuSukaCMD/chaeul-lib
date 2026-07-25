import { readJSON, writeJSON } from "./db.js"

// ─── TRUST SYSTEM ───
// Owner bisa memberi akses "trusted" ke user tertentu (.trust): user tsb
// bisa memakai SELURUH command (owner-level) KECUALI reboot & self, TAPI
// hanya di grup yang di-trust (.trustgroup). Di luar grup trust, user
// kembali jadi user biasa.
// Trusted access juga melewati: wajib register, self-mode, dan gate
// grup-belum-terdaftar — semuanya hanya di dalam grup yang di-trust.

const DB = "./database/trust.json"

// Command yang TETAP terkunci untuk user trusted (owner asli saja).
const TRUST_BLOCKED = new Set(["reboot", "self"])

function db() {
    const data = readJSON(DB, { users: {}, groups: {} })
    if (!data.users || typeof data.users !== "object") data.users = {}
    if (!data.groups || typeof data.groups !== "object") data.groups = {}
    return data
}

function save(data) {
    writeJSON(DB, data)
}

/** Normalisasi JID/nomor apapun → digit nomor murni (62xxx). */
export function normalizeNum(jidOrNum) {
    return String(jidOrNum || "")
        .split("@")[0]
        .split(":")[0]
        .replace(/\D/g, "")
}

// ─── User trusted ───
export function getTrustedUsers() {
    return Object.values(db().users)
}

export function isTrustedUser(numOrJid) {
    const num = normalizeNum(numOrJid)
    return !!num && !!db().users[num]
}

export function addTrustedUser(numOrJid, by = null, note = "") {
    const num = normalizeNum(numOrJid)
    if (!num) return null
    const data = db()
    const already = !!data.users[num]
    data.users[num] = {
        num,
        jid: `${num}@s.whatsapp.net`,
        note: String(note || ""),
        addedBy: by || null,
        addedAt: already ? data.users[num].addedAt : Date.now()
    }
    save(data)
    return { user: data.users[num], already }
}

export function removeTrustedUser(numOrJid) {
    const num = normalizeNum(numOrJid)
    const data = db()
    if (!data.users[num]) return false
    delete data.users[num]
    save(data)
    return true
}

// ─── Grup trusted ───
export function getTrustedGroups() {
    return Object.values(db().groups)
}

export function isTrustedGroup(jid) {
    return !!jid && !!db().groups[String(jid)]
}

export function addTrustedGroup(jid, by = null, name = "") {
    const key = String(jid || "")
    if (!key || !key.endsWith("@g.us")) return null
    const data = db()
    const already = !!data.groups[key]
    data.groups[key] = {
        jid: key,
        name: name || data.groups[key]?.name || "",
        addedBy: by || null,
        addedAt: already ? data.groups[key].addedAt : Date.now()
    }
    save(data)
    return { group: data.groups[key], already }
}

export function removeTrustedGroup(jid) {
    const key = String(jid || "")
    const data = db()
    if (!data.groups[key]) return false
    delete data.groups[key]
    save(data)
    return true
}

/** Update nama grup tersimpan (dipanggil saat berinteraksi di grup tsb). */
export function touchTrustedGroupName(jid, name) {
    const data = db()
    const key = String(jid || "")
    if (!data.groups[key] || !name) return
    data.groups[key].name = name
    save(data)
}

// ─── Command yang diblokir untuk user trusted ───
export function isTrustBlockedCommand(command, plugin) {
    const cmd = String(command || "").toLowerCase()
    if (TRUST_BLOCKED.has(cmd)) return true
    const cmds = plugin?.command
    if (Array.isArray(cmds)) {
        return cmds.some(
            (c) => typeof c === "string" && TRUST_BLOCKED.has(c.toLowerCase())
        )
    }
    return false
}

/**
 * Apakah pesan ini memiliki akses trusted?
 * Syarat: pesan dari GRUP yang di-trust DAN pengirimnya user trusted.
 */
export function isTrustedAccess({ isGroup, chat, sender }) {
    return !!(isGroup && isTrustedGroup(chat) && isTrustedUser(sender))
}

export default {
    normalizeNum,
    getTrustedUsers,
    isTrustedUser,
    addTrustedUser,
    removeTrustedUser,
    getTrustedGroups,
    isTrustedGroup,
    addTrustedGroup,
    removeTrustedGroup,
    touchTrustedGroupName,
    isTrustBlockedCommand,
    isTrustedAccess,
    TRUST_BLOCKED
}
