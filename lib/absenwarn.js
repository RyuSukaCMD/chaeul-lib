import { readJSON, writeJSON } from "./db.js"

// ═══════════════════════════════════════════════════════════
//  WHITELIST GRUP PENGINGAT ABSEN
//  Grup yang di-whitelist akan menerima pesan TAG @user untuk
//  mengingatkan anggota yang absennya hampir/sudah habis.
//  Disimpan di ./database/absenwarn.json (array chat JID).
// ═══════════════════════════════════════════════════════════
const DB = "./database/absenwarn.json"

function load() {
    return readJSON(DB, [])
}
function save(data) {
    writeJSON(DB, data)
}

export function isAbsenWarnGroup(chat) {
    return load().includes(chat)
}
export function addAbsenWarnGroup(chat) {
    const db = load()
    if (!db.includes(chat)) {
        db.push(chat)
        save(db)
        return true
    }
    return false
}
export function delAbsenWarnGroup(chat) {
    const db = load()
    if (!db.includes(chat)) return false
    save(db.filter((id) => id !== chat))
    return true
}
export function listAbsenWarnGroups() {
    return load()
}

export default {
    isAbsenWarnGroup,
    addAbsenWarnGroup,
    delAbsenWarnGroup,
    listAbsenWarnGroups
}
