import { smallcaps as sc } from "../../lib/font.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { addPremium, delPremium, getPremiumList } from "../../lib/premium.js"

// Ambil target dari mention / reply / nomor pada argumen
async function pickTarget(sock, m, args) {
    let raw = m.mentionedJid?.[0] || m.quoted?.sender
    if (!raw) {
        const num = args.find((a) => /^\d{6,}$/.test(a.replace(/\D/g, "")))
        if (num) raw = num.replace(/\D/g, "") + "@s.whatsapp.net"
    }
    return raw ? await resolvePn(sock, m, raw) : null
}

export default {
    command: ["addpremium", "delpremium", "premiumlist", "listpremium"],

    owner: true,

    category: "Owner",

    description: "Kelola user premium (bypass antilink + token tak terbatas)",

    async run({ sock, m, command, args }) {
        // ── LIST ──
        if (command === "premiumlist" || command === "listpremium") {
            const list = getPremiumList()
            if (!list.length) {
                return m.reply(
                    `╭─ 💎 ${sc("PREMIUM LIST")} ─⬣\n│\n│ ${sc("Belum ada user premium")}.\n│\n╰──────────────⬣`
                )
            }

            const mentions = list.map((n) => `${n}@s.whatsapp.net`)
            let text = `╭─ 💎 ${sc("PREMIUM LIST")} ─⬣\n│\n`
            list.forEach((n, i) => {
                text += `│ ${i + 1}. @${n}\n`
            })
            text += `│\n│ ${sc("Total")} : ${list.length}\n╰──────────────⬣`

            return m.reply(text, { mentions })
        }

        // ── ADD / DEL ──
        const target = await pickTarget(sock, m, args)
        if (!target) {
            return m.reply(
                `╭─ 💎 ${sc("PREMIUM")} ─⬣\n` +
                    `│\n` +
                    `│ ${sc("Tag/reply/nomor user")}.\n` +
                    `│\n` +
                    `│ ${sc("Contoh")}:\n` +
                    `│ ${global.prefix}${command} @user\n` +
                    `│ ${global.prefix}${command} 628xxx\n` +
                    `╰──────────────⬣`
            )
        }

        if (command === "addpremium") {
            addPremium(target)
            return m.reply(
                `╭─ 💎 ${sc("ADD PREMIUM")} ─⬣\n│\n│ ✅ ${tag(target)} ${sc("kini premium")}!\n│ ♾️ ${sc("Token tak terbatas + bypass antilink")}\n│\n╰──────────────⬣`,
                { mentions: [target] }
            )
        }

        // delpremium
        const ok = delPremium(target)
        return m.reply(
            ok
                ? `╭─ 💎 ${sc("DEL PREMIUM")} ─⬣\n│\n│ ✅ ${tag(target)} ${sc("bukan premium lagi")}.\n│\n╰──────────────⬣`
                : `╭─ 💎 ${sc("DEL PREMIUM")} ─⬣\n│\n│ ${tag(target)} ${sc("bukan user premium")}.\n│\n╰──────────────⬣`,
            { mentions: [target] }
        )
    }
}
