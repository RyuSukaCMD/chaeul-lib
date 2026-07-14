import { card } from "../../lib/ui.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { getMoney, transferMoney } from "../../lib/rpg.js"

export default {
    command: ["pay", "transfer", "kirimuang"],

    category: "RPG",

    description: "Kirim uang ke pemain lain (tag/reply)",

    async run({ sock, m, args }) {
        const me = await resolvePn(sock, m, m.sender)
        const raw = m.mentionedJid?.[0] || m.quoted?.sender
        const target = await resolvePn(sock, m, raw)
        const amount = parseInt(
            args.find((a) => /^\d+$/.test(a)),
            10
        )

        if (!target || isNaN(amount) || amount <= 0) {
            return m.reply(
                card("PAY", [`Tag/reply user & jumlah.`, `Contoh: ${global.prefix}pay @user 500`], {
                    emoji: "💸"
                })
            )
        }
        if (target === me)
            return m.reply(card("PAY", "Tidak bisa kirim ke diri sendiri. 😅", { emoji: "💸" }))
        if (getMoney(me) < amount)
            return m.reply(
                card("PAY", `Uang kamu tidak cukup (butuh $${amount}).`, { emoji: "💸" })
            )

        transferMoney(me, target, amount)
        await m.react("💸")
        return m.reply(
            card(
                "TRANSFER BERHASIL",
                [
                    `💸 ${tag(me)} → ${tag(target)}`,
                    `💰 $${amount.toLocaleString("id-ID")}`,
                    ``,
                    `Saldo kamu: $${getMoney(me).toLocaleString("id-ID")}`
                ],
                { emoji: "💸" }
            ),
            { mentions: [me, target] }
        )
    }
}
