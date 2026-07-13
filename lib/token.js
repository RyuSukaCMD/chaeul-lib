import { readJSON, writeJSON } from "./db.js"
import { getMarriage } from "./marriage.js"
import { getPartner } from "./partner.js"

// ─── Database File ───
const TOKEN_DB = "./database/token.json"

// Jumlah token starter setelah registrasi
export const STARTER_TOKEN = 30

// ─── JSON Loader / Saver ───
function load() {
    return readJSON(TOKEN_DB, {})
}

function save(data) {
    writeJSON(TOKEN_DB, data)
}

/** Normalisasi JID/nomor menjadi digit saja (kunci database). */
export function normalize(jid = "") {
    return String(jid).replace(/[^0-9]/g, "")
}

// ─── Account ───

/** Membuat akun token bila belum ada, beserta token starter. */
export function ensureAccount(jid) {
    const key = normalize(jid)
    if (!key) return null

    const db = load()
    if (!db[key]) {
        db[key] = { balance: STARTER_TOKEN, createdAt: Date.now() }
        save(db)
    }
    return db[key]
}

/** Mengecek apakah user sudah punya akun token. */
export function hasAccount(jid) {
    return !!load()[normalize(jid)]
}

// ─── Pasangan (Pool Bersama) ───

/**
 * Mengambil pasangan aktif seseorang (nikah ATAU pacar).
 * Mengembalikan JID/nomor pasangan, atau null bila single.
 * Karena marry & partner mutually-exclusive, hanya salah satu yang aktif.
 */
export function getMate(jid) {
    const key = normalize(jid)

    const spouse = getMarriage(key) || getMarriage(jid)
    if (spouse?.partner) return normalize(spouse.partner)

    const lover = getPartner(key) || getPartner(jid)
    if (lover?.partner) return normalize(lover.partner)

    return null
}

// ─── Saldo ───

/**
 * Total saldo yang bisa dipakai user.
 * - Single  : saldo pribadi.
 * - Berpasangan : gabungan saldo dirinya + pasangan (pool bersama).
 */
export function getBalance(jid) {
    const db = load()
    const key = normalize(jid)

    let total = db[key]?.balance || 0

    const mate = getMate(jid)
    if (mate && mate !== key) {
        total += db[mate]?.balance || 0
    }

    return total
}

/** Menambah token ke saldo pribadi seseorang. */
export function addToken(jid, amount) {
    const db = load()
    const key = normalize(jid)

    if (!db[key]) db[key] = { balance: 0, createdAt: Date.now() }
    db[key].balance += amount

    save(db)
    return db[key].balance
}

/**
 * Memotong sejumlah token.
 * - Single  : potong dari saldo pribadi.
 * - Berpasangan : potong dari pool bersama (dirinya dulu, sisanya dari pasangan).
 * Mengembalikan true bila berhasil, false bila saldo tidak cukup.
 */
export function deductToken(jid, amount = 1) {
    const db = load()
    const key = normalize(jid)
    const mate = getMate(jid)

    // Kumpulan akun yang menjadi sumber pemotongan (pool)
    const accounts = [key]
    if (mate && mate !== key) accounts.push(mate)

    // Total saldo pool
    let total = accounts.reduce((sum, k) => sum + (db[k]?.balance || 0), 0)
    if (total < amount) return false

    // Potong: habiskan saldo akun pertama dulu, baru berikutnya
    let remaining = amount
    for (const k of accounts) {
        if (remaining <= 0) break
        if (!db[k]) continue

        const take = Math.min(db[k].balance, remaining)
        db[k].balance -= take
        remaining -= take
    }

    save(db)
    return true
}

/** Mengambil seluruh data (untuk keperluan admin). */
export function getAll() {
    return load()
}

/** Menetapkan saldo token seseorang ke nilai tertentu (admin). */
export function setToken(jid, amount) {
    const db = load()
    const key = normalize(jid)
    if (!key) return null

    const value = Math.max(0, Math.floor(Number(amount) || 0))

    if (!db[key]) db[key] = { balance: value, createdAt: Date.now() }
    else db[key].balance = value

    save(db)
    return db[key].balance
}

/** Menghapus akun token seseorang (admin). */
export function delToken(jid) {
    const db = load()
    const key = normalize(jid)

    if (!db[key]) return false
    delete db[key]

    save(db)
    return true
}

export default {
    STARTER_TOKEN,
    normalize,
    ensureAccount,
    hasAccount,
    getMate,
    getBalance,
    addToken,
    deductToken,
    getAll,
    setToken,
    delToken
}
