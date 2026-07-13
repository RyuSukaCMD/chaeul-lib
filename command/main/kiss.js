import { makeProposalCommand, makeExpireNotifier } from "../../lib/proposalFlow.js"
import { tag } from "../../lib/resolve.js"
import { createActionStore } from "../../lib/actionStore.js"

const store = createActionStore({ onExpire: makeExpireNotifier("KISS", "💋") })

export default makeProposalCommand({
    name: "kiss",
    aliases: ["cium"],
    key: "kiss",
    emoji: "💋",
    title: "KISS",
    verbAsk: "mencium",
    description: "Mencium user lain (skip konfirmasi bila sudah menikah)",
    store,
    forcible: true,
    skipIfMarried: true,

    forceText: {
        miss: (p) => `${tag(p.proposer)} mencoba mencium\n${tag(p.target)} tapi m-le-set! 😳💨`,
        rejected: (p) =>
            `${tag(p.proposer)} mencium ${tag(p.target)},\ntapi langsung ditampar! 🤚😡`,
        accepted: (p) =>
            `${tag(p.proposer)} mencium ${tag(p.target)}\ndan dibalas dengan malu-malu~ 😘💕`
    },

    async onAccept(proposal) {
        return {
            text:
                `╭━━━〔 💋 KISS 〕━━━⬣\n` +
                `${tag(proposal.proposer)} mencium\n` +
                `${tag(proposal.target)} 😘💋\n\n` +
                `So sweet~ 💕\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`
        }
    }
})
