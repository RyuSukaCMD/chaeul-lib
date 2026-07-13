import { resolvePn, tag } from "../../lib/resolve.js"

import { getMarriage } from "../../lib/marriage.js"
import { getPartner } from "../../lib/partner.js"
import { getBalance } from "../../lib/token.js"

function since(ts) {
    const ms = Date.now() - ts
    const day = Math.floor(ms / 86400000)
    const hour = Math.floor((ms % 86400000) / 3600000)
    const min = Math.floor((ms % 3600000) / 60000)

    return (
        [day ? `${day} Hari` : "", hour ? `${hour} Jam` : "", min ? `${min} Menit` : ""]
            .filter(Boolean)
            .join(" ") || "Baru saja"
    )
}

export default {
    command: ["couple", "pasangan", "rel"],

    category: "Relationship",

    description: "Melihat status hubungan & pasangan",

    // Command relationship → gratis (tidak potong token)
    free: true,

    async run({ sock, m }) {
        await m.react("💞")

        // Boleh cek diri sendiri atau user yang di-tag
        const rawTarget = m.mentionedJid?.[0] || m.quoted?.sender
        const who = await resolvePn(sock, m, rawTarget || m.sender)

        const marriage = getMarriage(who)
        const partner = getPartner(who)

        if (!marriage && !partner) {
            return m.reply(
                `╭━━━〔 💞 COUPLE 〕━━━⬣\n` +
                    `${tag(who)} masih jomblo. 🍃\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`,
                { mentions: [who] }
            )
        }

        const rel = marriage || partner
        const statusLabel = marriage ? "💍 Menikah" : "💕 Pacaran"

        return m.reply(
            `╭━━━〔 💞 COUPLE 〕━━━⬣\n` +
                `👤 ${tag(who)}\n\n` +
                `Status : ${statusLabel}\n` +
                `Dengan : ${tag(rel.partner)}\n` +
                `Lama   : ${since(rel.since)}\n\n` +
                `🪙 Token Bersama : ${getBalance(who)}\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`,
            { mentions: [who, rel.partner] }
        )
    }
}
