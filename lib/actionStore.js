// Store proposal sementara (in-memory) untuk aksi ringan seperti kiss/hug
// yang tidak perlu disimpan permanen ke database.

const PROPOSAL_TTL = 60 * 1000

/** Membuat sebuah store aksi terpisah (punya namespace sendiri). */
export function createActionStore() {
    const proposals = new Map()

    function cleanup() {
        const now = Date.now()
        for (const [id, p] of proposals) {
            if (now >= p.expiresAt) proposals.delete(id)
        }
    }

    return {
        createProposal({ proposer, target, chat = "" }) {
            cleanup()
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
            return proposal
        },

        getProposal(id) {
            const p = proposals.get(id)
            if (!p) return null
            if (Date.now() >= p.expiresAt) {
                proposals.delete(id)
                return null
            }
            return p
        },

        updateProposal(id, patch = {}) {
            const p = proposals.get(id)
            if (!p) return null
            const next = { ...p, ...patch, expiresAt: Date.now() + PROPOSAL_TTL }
            proposals.set(id, next)
            return next
        },

        deleteProposal(id) {
            proposals.delete(id)
        },

        getActiveProposalOf(jid) {
            cleanup()
            for (const p of proposals.values()) {
                if (p.proposer === jid || p.target === jid) return p
            }
            return null
        }
    }
}

export default { createActionStore }
