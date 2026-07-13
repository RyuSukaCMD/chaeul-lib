import { smallcaps as sc } from "../../lib/font.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import {
    addPremium,
    delPremium,
    getPremiumList,
    parseDuration,
    formatExpiry
} from "../../lib/premium.js"

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

    description: "Kelola premium: FULL (bypass antilink) / BASIC (kena antilink), durasi/permanen",

    async run({ sock, m, command, args }) {
        // ── LIST ──
        if (command === "premiumlist" || command === "listpremium") {
            const list = getPremiumList()
            if (!list.length) {
                return m.reply(
                    `╭─ 💎 ${sc("PREMIUM LIST")} ─⬣\n│\n│ ${sc("Belum ada user premium")}.\n│\n╰──────────────⬣`
                )
            }

            const mentions = list.map((x) => `${x.number}@s.whatsapp.net`)
            let text = `╭─ 💎 ${sc("PREMIUM LIST")} ─⬣\n│\n`
            list.forEach((x, i) => {
                const badge = x.type === "full" ? "👑 FULL" : "🔰 BASIC"
                text += `│ ${i + 1}. @${x.number}\n│    ${badge} • ${formatExpiry(x.expired)}\n`
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
                    `│ ${sc("Format")}:\n` +
                    `│ ${global.prefix}addpremium @user [tipe] [durasi]\n` +
                    `│\n` +
                    `│ tipe   : full / basic\n` +
                    `│ durasi : 7d 12h 30m / perm\n` +
                    `│\n` +
                    `│ ${sc("Contoh")}:\n` +
                    `│ ${global.prefix}addpremium @user full 30d\n` +
                    `│ ${global.prefix}addpremium @user basic 7d\n` +
                    `│ ${global.prefix}addpremium @user full perm\n` +
                    `╰──────────────⬣`
            )
        }

        if (command === "addpremium") {
            // Kumpulkan flag tipe & durasi dari args (selain nomor mention)
            const flags = args
                .filter((a) => !/^\d{6,}$/.test(a.replace(/\D/g, "")))
                .map((a) => a.toLowerCase())

            let type = "full"
            let durArg = null
            for (const f of flags) {
                if (f === "full" || f === "basic") type = f
                else if (/^(\d+(s|m|h|d)|perm|permanent)$/i.test(f)) durArg = f
            }

            const expired = parseDuration(durArg || "perm")
            if (expired === null) {
                return m.reply(`Format durasi salah.\nContoh: 30d, 12h, 30m, perm`)
            }

            addPremium(target, { type, expired })

            const badge = type === "full" ? "👑 FULL" : "🔰 BASIC"
            const perk =
                type === "full"
                    ? "♾️ Token tak terbatas + bypass antilink"
                    : "♾️ Token tak terbatas (antilink tetap aktif)"

            return m.reply(
                `╭─ 💎 ${sc("ADD PREMIUM")} ─⬣\n` +
                    `│\n` +
                    `│ ✅ ${tag(target)}\n` +
                    `│ Tipe    : ${badge}\n` +
                    `│ Berlaku : ${formatExpiry(expired)}\n` +
                    `│ ${perk}\n` +
                    `│\n╰──────────────⬣`,
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
