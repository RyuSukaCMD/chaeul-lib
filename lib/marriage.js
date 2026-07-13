import { readJSON, writeJSON } from "./db.js"

// ─── Database Files ───
const PROPOSAL_DB = "./database/proposals.json"
const MARRIED_DB = "./database/married.json"

// Waktu expired proposal (1 menit tanpa interaksi)
export const PROPOSAL_TTL = 60 * 1000

// ─── Generic JSON Loader / Saver ───
function load(file) {
    return readJSON(file, {})
}

function save(file, data) {
    writeJSON(file, data)
}

/** Normalisasi kunci ke digit saja agar konsisten dgn token/register. */
function norm(jid = "") {
    return String(jid).replace(/[^0-9]/g, "")
}

// ─── Proposal Management ───

/**
 * Membuat proposal baru dan menyimpannya di database.
 * @param {object} data
 * @param {string} data.proposer - JID pengusul
 * @param {string} data.target - JID target
 * @param {string} [data.chat] - JID chat tempat lamaran dibuat
 * @returns {object} proposal yang tersimpan (termasuk id)
 */
export function createProposal({ proposer, target, chat = "" }) {
    const db = load(PROPOSAL_DB)

    const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`

    const proposal = {
        id,
        proposer,
        target,
        chat,
        // Tahapan alur: pengusul dulu, baru target.
        // stage "proposer" = menunggu konfirmasi pengusul
        // stage "target"   = menunggu jawaban target
        stage: "proposer",
        proposerAccepted: false,
        targetAccepted: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + PROPOSAL_TTL
    }

    db[id] = proposal
    save(PROPOSAL_DB, db)

    return proposal
}

/**
 * Mengambil proposal berdasarkan id. Otomatis menghapus & mengembalikan
 * null jika proposal sudah kedaluwarsa (lebih dari 1 menit tanpa interaksi).
 */
export function getProposal(id) {
    const db = load(PROPOSAL_DB)
    const proposal = db[id]

    if (!proposal) return null

    if (Date.now() >= proposal.expiresAt) {
        delete db[id]
        save(PROPOSAL_DB, db)
        return null
    }

    return proposal
}

/**
 * Memperbarui field pada proposal sekaligus memperpanjang waktu expired
 * (karena ada interaksi baru dari user).
 */
export function updateProposal(id, patch = {}) {
    const db = load(PROPOSAL_DB)
    if (!db[id]) return null

    db[id] = {
        ...db[id],
        ...patch,
        // Reset timer 1 menit setiap ada interaksi
        expiresAt: Date.now() + PROPOSAL_TTL
    }

    save(PROPOSAL_DB, db)
    return db[id]
}

/** Menghapus proposal dari database. */
export function deleteProposal(id) {
    const db = load(PROPOSAL_DB)
    delete db[id]
    save(PROPOSAL_DB, db)
}

/** Membersihkan seluruh proposal yang sudah kedaluwarsa. */
export function cleanExpiredProposals() {
    const db = load(PROPOSAL_DB)
    let changed = false

    for (const id of Object.keys(db)) {
        if (Date.now() >= db[id].expiresAt) {
            delete db[id]
            changed = true
        }
    }

    if (changed) save(PROPOSAL_DB, db)
}

/** Mengecek apakah user sudah memiliki proposal aktif (sebagai pengusul/target). */
export function getActiveProposalOf(jid) {
    const db = load(PROPOSAL_DB)

    for (const id of Object.keys(db)) {
        const p = db[id]
        if (Date.now() >= p.expiresAt) continue
        if (p.proposer === jid || p.target === jid) return p
    }

    return null
}

// ─── Marriage Management ───

/**
 * Menyimpan data pernikahan ke database married.
 * Disimpan dua arah agar mudah dicari dari salah satu pihak.
 */
export function saveMarriage(a, b) {
    const db = load(MARRIED_DB)
    const time = Date.now()

    // Kunci = digit; value.partner = JID lengkap (untuk tag).
    db[norm(a)] = { partner: b, since: time }
    db[norm(b)] = { partner: a, since: time }

    save(MARRIED_DB, db)
    return db[norm(a)]
}

/** Mengambil data pernikahan seseorang, atau null jika belum menikah. */
export function getMarriage(jid) {
    return load(MARRIED_DB)[norm(jid)] || null
}

/** Mengecek apakah seseorang sudah menikah. */
export function isMarried(jid) {
    return !!getMarriage(jid)
}

/** Menghapus (menceraikan) data pernikahan kedua pihak. */
export function removeMarriage(jid) {
    const db = load(MARRIED_DB)
    const data = db[norm(jid)]

    if (data?.partner) delete db[norm(data.partner)]
    delete db[norm(jid)]

    save(MARRIED_DB, db)
}

export default {
    PROPOSAL_TTL,
    createProposal,
    getProposal,
    updateProposal,
    deleteProposal,
    cleanExpiredProposals,
    getActiveProposalOf,
    saveMarriage,
    getMarriage,
    isMarried,
    removeMarriage
}
