import { readJSON, writeJSON } from "./db.js"

// ─── Database Files ───
const PROPOSAL_DB = "./database/partner_proposals.json"
const PARTNER_DB = "./database/partner.json"

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

export function createProposal({ proposer, target, chat = "" }) {
    const db = load(PROPOSAL_DB)

    const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`

    const proposal = {
        id,
        proposer,
        target,
        chat,
        // Alur: pengusul dulu, baru target.
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

export function updateProposal(id, patch = {}) {
    const db = load(PROPOSAL_DB)
    if (!db[id]) return null

    db[id] = {
        ...db[id],
        ...patch,
        expiresAt: Date.now() + PROPOSAL_TTL
    }

    save(PROPOSAL_DB, db)
    return db[id]
}

export function deleteProposal(id) {
    const db = load(PROPOSAL_DB)
    delete db[id]
    save(PROPOSAL_DB, db)
}

export function getActiveProposalOf(jid) {
    const db = load(PROPOSAL_DB)

    for (const id of Object.keys(db)) {
        const p = db[id]
        if (Date.now() >= p.expiresAt) continue
        if (p.proposer === jid || p.target === jid) return p
    }

    return null
}

// ─── Partner (Pacaran) Management ───

/** Menyimpan hubungan pacaran (dua arah). */
export function savePartner(a, b) {
    const db = load(PARTNER_DB)
    const time = Date.now()

    // Kunci = digit; value.partner = JID lengkap (untuk tag).
    db[norm(a)] = { partner: b, since: time }
    db[norm(b)] = { partner: a, since: time }

    save(PARTNER_DB, db)
    return db[norm(a)]
}

/** Mengambil data pacar seseorang, atau null. */
export function getPartner(jid) {
    return load(PARTNER_DB)[norm(jid)] || null
}

/** Mengecek apakah seseorang sedang pacaran. */
export function hasPartner(jid) {
    return !!getPartner(jid)
}

/** Menghapus (putus) hubungan pacaran kedua pihak. */
export function removePartner(jid) {
    const db = load(PARTNER_DB)
    const data = db[norm(jid)]

    if (data?.partner) delete db[norm(data.partner)]
    delete db[norm(jid)]

    save(PARTNER_DB, db)
}

export default {
    PROPOSAL_TTL,
    createProposal,
    getProposal,
    updateProposal,
    deleteProposal,
    getActiveProposalOf,
    savePartner,
    getPartner,
    hasPartner,
    removePartner
}
