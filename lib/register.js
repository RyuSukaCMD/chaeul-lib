import { readJSON, writeJSON } from "./db.js"

const DB = "./database/users.json"

// Penyimpanan progres registrasi sementara (in-memory).
global.tempRegister ??= {}

function loadDB() {
    return readJSON(DB, {})
}

function saveDB(data) {
    writeJSON(DB, data)
}

/** Normalisasi ke digit saja (kunci database sama dengan token.js). */
function norm(sender) {
    return String(sender).replace(/[^0-9]/g, "")
}

// ─── Status Registrasi ───

export function isRegistered(sender) {
    return !!loadDB()[norm(sender)]
}

export function getUser(sender) {
    return loadDB()[norm(sender)] || null
}

/** Mengambil seluruh user terdaftar sebagai array { number, ...data }. */
export function getAllUsers() {
    const db = loadDB()
    return Object.entries(db).map(([number, data]) => ({ number, ...data }))
}

// ─── Multi-step Registration State Machine ───
//
// Alur:  .register  →  isi NAMA  →  pilih GENDER (button)  →  isi UMUR  →  selesai
// State disimpan di global.tempRegister[normSender].step

/** Memulai sesi registrasi (menunggu input nama). */
export function startRegister(sender) {
    const key = norm(sender)
    global.tempRegister[key] = {
        step: "name",
        data: {},
        createdAt: Date.now()
    }
    return global.tempRegister[key]
}

/** Mengambil sesi registrasi aktif (kadaluarsa 5 menit). */
export function getRegisterSession(sender) {
    const key = norm(sender)
    const s = global.tempRegister[key]
    if (!s) return null

    if (Date.now() - s.createdAt > 300000) {
        delete global.tempRegister[key]
        return null
    }
    return s
}

/** Memperbarui sesi registrasi. */
export function setRegisterSession(sender, patch) {
    const key = norm(sender)
    if (!global.tempRegister[key]) return null
    global.tempRegister[key] = { ...global.tempRegister[key], ...patch }
    return global.tempRegister[key]
}

export function clearRegisterSession(sender) {
    delete global.tempRegister[norm(sender)]
}

/** Menyimpan user baru ke database. */
export function saveUser(sender, { name, gender, age }) {
    const db = loadDB()
    const key = norm(sender)

    db[key] = {
        name,
        gender,
        age,
        registeredAt: Date.now()
    }

    saveDB(db)

    // Push real-time ke website (lazy import agar tak circular).
    import("./license.js")
        .then((m) => m.pushUser?.(key, name))
        .catch(() => {})

    return db[key]
}

export function deleteUser(sender) {
    const db = loadDB()
    delete db[norm(sender)]
    saveDB(db)
}
