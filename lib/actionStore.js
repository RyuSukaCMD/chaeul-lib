// Store proposal sementara (in-memory) untuk aksi seperti kiss/hug/marry.
// Mendukung callback saat proposal KEDALUWARSA (untuk men-tag pembuatnya).

const PROPOSAL_TTL = 60 * 1000

/**
 * Membuat sebuah store aksi terpisah (punya namespace sendiri).
 * @param {object} [opt]
 * @param {function} [opt.onExpire] dipanggil (proposal) saat proposal expired
 *        tanpa terselesaikan (mis. untuk mengirim tag ke pembuat).
 */
export function createActionStore(opt = {}) {
    const proposals = new Map()
    const timers = new Map()

    function clearTimer(id) {
        const t = timers.get(id)
        if (t) clearTimeout(t)
        timers.delete(id)
    }

    function armTimer(id) {
        clearTimer(id)
        const t = setTimeout(async () => {
            const p = proposals.get(id)
            proposals.delete(id)
            timers.delete(id)
            if (p && opt.onExpire) {
                try {
                    await opt.onExpire(p)
                } catch {}
            }
        }, PROPOSAL_TTL)
        // Jangan menahan proses tetap hidup hanya karena timer ini
        if (t.unref) t.unref()
        timers.set(id, t)
    }

    return {
        // Penanda bahwa store ini punya notifikasi expiry sendiri (via onExpire)
        hasExpiryNotifier: !!opt.onExpire,

        createProposal({ proposer, target, chat = "" }) {
            const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`
            const proposal = {
                id,
                proposer,
                target,
                chat,
                stage: "proposer",
                createdAt: Date.now(),
                expiresAt: Date.now() + PROPOSAL_TTL
            }
            proposals.set(id, proposal)
            armTimer(id)
            return proposal
        },

        getProposal(id) {
            const p = proposals.get(id)
            if (!p) return null
            if (Date.now() >= p.expiresAt) {
                proposals.delete(id)
                clearTimer(id)
                return null
            }
            return p
        },

        updateProposal(id, patch = {}) {
            const p = proposals.get(id)
            if (!p) return null
            const next = { ...p, ...patch, expiresAt: Date.now() + PROPOSAL_TTL }
            proposals.set(id, next)
            armTimer(id) // reset timer karena ada interaksi
            return next
        },

        deleteProposal(id) {
            proposals.delete(id)
            clearTimer(id)
        },

        getActiveProposalOf(jid) {
            for (const p of proposals.values()) {
                if (Date.now() >= p.expiresAt) continue
                if (p.proposer === jid || p.target === jid) return p
            }
            return null
        }
    }
}

export default { createActionStore }
