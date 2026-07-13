import { makeProposalCommand } from "../../lib/proposalFlow.js"
import { tag } from "../../lib/resolve.js"

import marriageStore, { isMarried, saveMarriage } from "../../lib/marriage.js"
import { hasPartner } from "../../lib/partner.js"
import { ensureAccount } from "../../lib/token.js"

export default makeProposalCommand({
    name: "marry",
    key: "marry",
    emoji: "💍",
    title: "MARRY PROPOSAL",
    verbAsk: "melamar",
    description: "Melamar user lain (nikah) dengan konfirmasi Accept/Decline",
    store: marriageStore,

    // Validasi sebelum melamar
    canPropose(proposer, target) {
        if (isMarried(proposer) || isMarried(target)) {
            return (
                `╭━━━〔 💔 MARRY 〕━━━⬣\n` +
                `Salah satu pihak sudah menikah.\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }
        // Mutually-exclusive: yang sedang pacaran tidak boleh menikah
        if (hasPartner(proposer) || hasPartner(target)) {
            return (
                `╭━━━〔 💔 MARRY 〕━━━⬣\n` +
                `Putuskan hubungan pacaran\n` +
                `dulu sebelum menikah.\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }
        return null
    },

    // Aksi ketika kedua pihak setuju
    async onAccept(proposal) {
        if (
            isMarried(proposal.proposer) ||
            isMarried(proposal.target) ||
            hasPartner(proposal.proposer) ||
            hasPartner(proposal.target)
        ) {
            return {
                blocked: true,
                text:
                    `╭━━━〔 💔 MARRY 〕━━━⬣\n` +
                    `Status salah satu pihak berubah.\n` +
                    `Lamaran dibatalkan.\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            }
        }

        saveMarriage(proposal.proposer, proposal.target)

        // Pastikan kedua pihak punya akun token (untuk pool bersama)
        ensureAccount(proposal.proposer)
        ensureAccount(proposal.target)

        return {
            text:
                `╭━━━〔 💐 MARRIED 💐 〕━━━⬣\n` +
                `Selamat! 🎉\n\n` +
                `${tag(proposal.proposer)}\n` +
                `dan\n` +
                `${tag(proposal.target)}\n\n` +
                `resmi menikah! 💑💍\n\n` +
                `Mulai sekarang token kalian\n` +
                `digabung & dipakai bersama. 💖\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`
        }
    }
})
