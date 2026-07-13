import { makeProposalCommand } from "../../lib/proposalFlow.js"
import { tag } from "../../lib/resolve.js"

import partnerStore, { hasPartner, savePartner } from "../../lib/partner.js"
import { isMarried } from "../../lib/marriage.js"
import { ensureAccount } from "../../lib/token.js"

export default makeProposalCommand({
    name: "partner",
    aliases: ["pacar", "gandeng"],
    key: "partner",
    emoji: "💕",
    title: "PARTNER REQUEST",
    verbAsk: "mengajak pacaran",
    description: "Mengajak user lain pacaran dengan konfirmasi Accept/Decline",
    store: partnerStore,

    canPropose(proposer, target) {
        if (hasPartner(proposer) || hasPartner(target)) {
            return (
                `╭━━━〔 💔 PARTNER 〕━━━⬣\n` +
                `Salah satu pihak sudah\n` +
                `punya pacar.\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }
        // Mutually-exclusive: yang sudah menikah tidak boleh pacaran
        if (isMarried(proposer) || isMarried(target)) {
            return (
                `╭━━━〔 💔 PARTNER 〕━━━⬣\n` +
                `Salah satu pihak sudah menikah.\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }
        return null
    },

    async onAccept(proposal) {
        if (
            hasPartner(proposal.proposer) ||
            hasPartner(proposal.target) ||
            isMarried(proposal.proposer) ||
            isMarried(proposal.target)
        ) {
            return {
                blocked: true,
                text:
                    `╭━━━〔 💔 PARTNER 〕━━━⬣\n` +
                    `Status salah satu pihak berubah.\n` +
                    `Permintaan dibatalkan.\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            }
        }

        savePartner(proposal.proposer, proposal.target)

        ensureAccount(proposal.proposer)
        ensureAccount(proposal.target)

        return {
            text:
                `╭━━━〔 💕 JADIAN 💕 〕━━━⬣\n` +
                `Cieee~ 🎉\n\n` +
                `${tag(proposal.proposer)}\n` +
                `dan\n` +
                `${tag(proposal.target)}\n\n` +
                `resmi pacaran! 💑💕\n\n` +
                `Token kalian sekarang\n` +
                `digabung & dipakai bersama. 💖\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`
        }
    }
})
