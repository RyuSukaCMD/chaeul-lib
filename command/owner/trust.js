import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import {
    normalizeNum,
    getTrustedUsers,
    isTrustedUser,
    addTrustedUser,
    removeTrustedUser,
    getTrustedGroups
} from "../../lib/trust.js"

// Resolusi target lewat tiga cara:
//  1) REPLY pesan user          → m.quoted.sender (bisa @lid → resolvePn)
//  2) TAG @user                 → m.mentionedJid[0]
//  3) ketik NOMOR manual        → args[0] berdigit (62812... / +62 812-...)
async function resolveTarget(sock, m, args) {
    let jid = null

    if (m.quoted?.sender) {
        jid = m.quoted.sender
    } else if (Array.isArray(m.mentionedJid) && m.mentionedJid.length) {
        jid = m.mentionedJid[0]
    } else {
        const raw = String(args[0] || "").replace(/[^0-9]/g, "")
        if (raw.length >= 8 && raw.length <= 16) jid = `${raw}@s.whatsapp.net`
    }

    if (!jid) return null

    // @lid → nomor asli (best effort; gagal pun tetap dipakai apa adanya)
    const pn = await resolvePn(sock, m, jid).catch(() => jid)
    const num = normalizeNum(pn)
    if (!num) return null
    return { num, jid: `${num}@s.whatsapp.net` }
}

function isOwnerNum(num) {
    return global.owner.some((o) => num === o || num.startsWith(o) || `${num}@s.whatsapp.net`.startsWith(o))
}

const fmtDate = (ts) =>
    new Date(ts).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "short" })

export default {
    command: ["trust", "untrust", "trustlist"],

    owner: true,

    category: "Owner",

    description: "Beri akses semua command (kecuali reboot & self) ke user di grup trust",

    async run({ sock, m, args, command }) {
        const cmd = String(command || "").toLowerCase()
        const sub = (args[0] || "").toLowerCase()

        // ─── .trustlist / .trust list ───
        if (cmd === "trustlist" || sub === "list" || sub === "daftar") {
            const users = getTrustedUsers()
            const groups = getTrustedGroups()

            const lines = []
            if (!users.length) {
                lines.push("├ _Belum ada user trusted._")
            } else {
                for (const u of users) {
                    lines.push(`├ 👤 @${u.num} — ${u.addedAt ? fmtDate(u.addedAt) : "-"}`)
                }
            }

            const mentions = users.map((u) => u.jid)

            return m.reply(
                card("TRUSTED USERS", [
                    "🔐 User yang ditrust bisa memakai *semua command*",
                    "(kecuali `reboot` & `self`) di grup yang di-trust.",
                    "Bypass register & self-only juga aktif di grup trust.",
                    "",
                    "─────────────────",
                    "",
                    ...lines,
                    ...(users.length > 0 ? ["", `Total: *${users.length}* user trusted`] : []),
                    "",
                    `👥 Grup trusted: *${groups.length}* — lihat ${global.prefix}grouptrustlist`,
                    "",
                    "─────────────────",
                    "",
                    "*Cara menambah:*",
                    `${global.prefix}trust (reply pesan user)`,
                    `${global.prefix}trust @user`,
                    `${global.prefix}trust 62812xxxx`,
                    "",
                    `Hapus: ${global.prefix}untrust <target sama>`
                ], { emoji: "🔐" }),
                { mentions }
            )
        }

        // ─── .trust / .untrust <target> ───
        const removing = cmd === "untrust" || ["del", "rm", "remove", "hapus"].includes(sub)
        const target = await resolveTarget(sock, m, removing && cmd !== "untrust" ? args.slice(1) : args)

        if (!target) {
            return m.reply(card("TRUST USER", [
                "❌ Target tidak ditemukan.",
                "",
                "─────────────────",
                "",
                "*Tiga cara menentukan user:*",
                "1️⃣ REPLY pesan user, lalu ketik `" + global.prefix + (removing ? "untrust" : "trust") + "`",
                "2️⃣ TAG user: `" + global.prefix + (removing ? "untrust" : "trust") + " @user`",
                `3️⃣ Nomor manual: \`${global.prefix}${removing ? "untrust" : "trust"} 62812xxxx\``,
                "",
                `Lihat daftar: ${global.prefix}trustlist`
            ], { emoji: "🔐" }))
        }

        if (isOwnerNum(target.num)) {
            return m.reply(card("INFO", [
                `ℹ️ @${target.num} adalah *Owner* —`,
                "sudah punya semua akses.",
                "",
                `_Trust hanya untuk user non-owner._`
            ], { emoji: "ℹ️" }), { mentions: [target.jid] })
        }

        if (removing) {
            if (!isTrustedUser(target.num)) {
                return m.reply(card("INFO", [
                    `ℹ️ @${target.num} memang tidak ada di daftar trust.`
                ], { emoji: "ℹ️" }), { mentions: [target.jid] })
            }

            removeTrustedUser(target.num)
            return m.reply(card("❌ UNTRUSTED", [
                `Akses trust @${target.num} *dicabut*.`,
                "",
                "User ini kembali menjadi user biasa:",
                "• wajib register untuk pakai command,",
                "• ikut aturan self-mode & grup gate,",
                "• tidak bisa command owner lagi.",
                "",
                `🔐 Sisa: *${getTrustedUsers().length}* user trusted`,
                "",
                `_Trust ulang: ${global.prefix}trust <target>_`
            ], { emoji: "❌" }), { mentions: [target.jid] })
        }

        const { already } = addTrustedUser(target.num, m.sender)
        if (already) {
            return m.reply(card("INFO", [
                `ℹ️ @${target.num} *sudah* user trusted.`,
                "",
                `Lihat daftar: ${global.prefix}trustlist`
            ], { emoji: "ℹ️" }), { mentions: [target.jid] })
        }

        return m.reply(card("✅ TRUSTED", [
            `🔐 @${target.num} sekarang *user trusted*.`,
            "",
            "Di grup yang di-trust dia bisa:",
            `• memakai *semua command* (kecuali \`reboot\` & \`self\`),`,
            "• *bypass register* (tidak perlu daftar),",
            "• *bypass mode self-only*,",
            "• *bypass* gate grup-belum-terdaftar.",
            "",
            "⚠️ Akses hanya berlaku DI GRUP TRUST.",
            `Tambahkan grup: ${global.prefix}trustgroup`,
            `Lihat daftar: ${global.prefix}trustlist`,
            "",
            `_Cabut: ${global.prefix}untrust <target>_`
        ], { emoji: "✅" }), { mentions: [target.jid] })
    }
}
