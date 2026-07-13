import { makeProposalCommand } from "../../lib/proposalFlow.js"
import { tag } from "../../lib/resolve.js"
import { createActionStore } from "../../lib/actionStore.js"

const store = createActionStore()

export default makeProposalCommand({
    name: "hug",
    aliases: ["peluk"],
    key: "hug",
    emoji: "🤗",
    title: "HUG",
    verbAsk: "memeluk",
    description: "Memeluk user lain (butuh persetujuan / bisa Force)",
    store,
    forcible: true,

    forceText: {
        miss: (p) => `${tag(p.proposer)} mencoba memeluk\n${tag(p.target)} tapi kepelesetnya! 🤸💨`,
        rejected: (p) => `${tag(p.proposer)} memeluk ${tag(p.target)},\ntapi langsung didorong! 😤`,
        accepted: (p) => `${tag(p.proposer)} memeluk ${tag(p.target)}\ndan dibalas hangat~ 🫂💗`
    },

    async onAccept(proposal) {
        return {
            text:
                `╭━━━〔 🤗 HUG 〕━━━⬣\n` +
                `${tag(proposal.proposer)} memeluk\n` +
                `${tag(proposal.target)} 🫂💗\n\n` +
                `Hangatnya~ 🥰\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`
        }
    }
})
