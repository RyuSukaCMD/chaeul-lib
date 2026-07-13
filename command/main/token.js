import { resolvePn, tag } from "../../lib/resolve.js"
import { hasAccount, getBalance, getMate } from "../../lib/token.js"
import { getMarriage } from "../../lib/marriage.js"
import { getPartner } from "../../lib/partner.js"

export default {
    command: ["token", "tokens", "saldo"],

    category: "Main",

    description: "Cek sisa token",

    // Cek token gratis (tidak potong token)
    free: true,

    async run({ sock, m }) {
        const me = await resolvePn(sock, m, m.sender)

        if (!hasAccount(me)) {
            return m.reply(
                `╭━━━〔 🪙 TOKEN 〕━━━⬣\n` +
                    `Kamu belum memiliki akun.\n\n` +
                    `Daftar dulu: ${global.prefix}register\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }

        const mate = getMate(me)
        const marriage = getMarriage(me)
        const partner = getPartner(me)

        let relText = "Single 🍃"
        if (marriage) relText = `💍 Menikah dengan ${tag(marriage.partner)}`
        else if (partner) relText = `💕 Pacaran dengan ${tag(partner.partner)}`

        const mentions = [me]
        if (mate) mentions.push(marriage?.partner || partner?.partner)

        return m.reply(
            `╭━━━〔 🪙 TOKEN 〕━━━⬣\n` +
                `👤 ${tag(me)}\n\n` +
                `Status : ${relText}\n\n` +
                `${mate ? "🪙 Token Bersama : " : "🪙 Token : "}${getBalance(me)}\n\n` +
                `${mate ? "(digabung dengan pasangan)\n" : ""}` +
                `Setiap command = 1 token.\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`,
            { mentions }
        )
    }
}
