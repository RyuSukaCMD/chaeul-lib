import { resolvePn, tag } from "../../lib/resolve.js"

import { getMarriage, removeMarriage } from "../../lib/marriage.js"
import { getPartner, removePartner } from "../../lib/partner.js"

export default {
    command: ["divorce", "cerai", "putus"],

    category: "Relationship",

    description: "Mengakhiri hubungan (nikah / pacaran)",

    // Command relationship → gratis (tidak potong token)
    free: true,

    async run({ sock, m }) {
        await m.react("💔")

        const me = await resolvePn(sock, m, m.sender)

        const marriage = getMarriage(me)
        const partner = getPartner(me)

        // Tidak punya hubungan apa pun
        if (!marriage && !partner) {
            return m.reply(
                `╭━━━〔 💔 DIVORCE 〕━━━⬣\n` +
                    `Kamu tidak sedang dalam\n` +
                    `hubungan apa pun.\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }

        if (marriage) {
            const ex = marriage.partner
            removeMarriage(me)
            return m.reply(
                `╭━━━〔 💔 DIVORCE 〕━━━⬣\n` +
                    `${tag(me)} dan ${tag(ex)}\n` +
                    `resmi bercerai. 😢\n\n` +
                    `Semoga menemukan yang\n` +
                    `lebih baik. 🕊️\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`,
                { mentions: [me, ex] }
            )
        }

        // partner (pacaran)
        const ex = partner.partner
        removePartner(me)
        return m.reply(
            `╭━━━〔 💔 PUTUS 〕━━━⬣\n` +
                `${tag(me)} dan ${tag(ex)}\n` +
                `resmi putus. 😭\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`,
            { mentions: [me, ex] }
        )
    }
}
