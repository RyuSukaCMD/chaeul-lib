import { readJSON, writeJSON } from "./db.js"

// Manajemen grup:
//   {
//     "<groupJid>": {
//        registered: true,
//        disabled: { "<command>": true },   // command yg dimatikan
//        adminOnly: { "<command>": true }    // command yg khusus admin
//     }
//   }
const DB = "./database/groupmanage.json"

function load() {
    return readJSON(DB, {})
}
function save(d) {
    writeJSON(DB, d)
}
function ensure(db, jid) {
    if (!db[jid]) db[jid] = { registered: false, disabled: {}, adminOnly: {} }
    if (!db[jid].disabled) db[jid].disabled = {}
    if (!db[jid].adminOnly) db[jid].adminOnly = {}
    return db[jid]
}

// ─── Registrasi grup ───
export function isGroupRegistered(jid) {
    return !!load()[jid]?.registered
}
export function registerGroupCmd(jid) {
    const db = load()
    ensure(db, jid).registered = true
    save(db)
}
export function unregisterGroupCmd(jid) {
    const db = load()
    ensure(db, jid).registered = false
    save(db)
}
export function listRegisteredGroups() {
    const db = load()
    return Object.keys(db).filter((jid) => db[jid]?.registered)
}

// ─── Disable / Enable command ───
// Kunci khusus "__all__" pada disabled = SEMUA command dimatikan.
// (Command group-management di-whitelist di handler agar grup tetap bisa recover.)
export const ALL_KEY = "__all__"

export function isAllDisabled(jid) {
    return !!load()[jid]?.disabled?.[ALL_KEY]
}
export function disableAll(jid) {
    const db = load()
    ensure(db, jid).disabled[ALL_KEY] = true
    save(db)
}
export function enableAll(jid) {
    const db = load()
    const g = ensure(db, jid)
    delete g.disabled[ALL_KEY]
    save(db)
}

export function isDisabled(jid, command) {
    return !!load()[jid]?.disabled?.[command]
}
export function disableCommand(jid, command, adminOnly = false) {
    const db = load()
    const g = ensure(db, jid)
    if (adminOnly) {
        // Whitelist admin: command hanya bisa dipakai admin (tidak dimatikan total)
        g.adminOnly[command] = true
        delete g.disabled[command]
    } else {
        g.disabled[command] = true
        delete g.adminOnly[command]
    }
    save(db)
}
export function enableCommand(jid, command) {
    const db = load()
    const g = ensure(db, jid)
    delete g.disabled[command]
    delete g.adminOnly[command]
    save(db)
}
export function isAdminOnly(jid, command) {
    return !!load()[jid]?.adminOnly?.[command]
}
export function listDisabled(jid) {
    const db = load()
    const g = db[jid]
    if (!g) return { disabled: [], adminOnly: [], all: false }
    const disabled = Object.keys(g.disabled || {})
    return {
        disabled: disabled.filter((c) => c !== ALL_KEY),
        adminOnly: Object.keys(g.adminOnly || {}),
        all: !!g.disabled?.[ALL_KEY]
    }
}

export default {
    isGroupRegistered,
    registerGroupCmd,
    unregisterGroupCmd,
    listRegisteredGroups,
    isDisabled,
    disableCommand,
    enableCommand,
    isAdminOnly,
    listDisabled,
    ALL_KEY,
    isAllDisabled,
    disableAll,
    enableAll
}
