import { card } from "../../lib/ui.js"
import {
    getTrustedGroups,
    isTrustedGroup,
    addTrustedGroup,
    removeTrustedGroup,
    getTrustedUsers
} from "../../lib/trust.js"

const fmtDate = (ts) =>
    new Date(ts).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "short" })

async function groupName(sock, jid, fallback = "") {
    try {
        const meta = await sock.groupMetadata(jid)
        return meta?.subject || fallback || jid
    } catch {
        return fallback || jid
    }
}

export default {
    command: ["trustgroup", "untrustgroup", "grouptrustlist", "trustgrouplist"],

    owner: true,

    category: "Owner",

    description: "Izinkan user trusted memakai semua command di grup ini",

    async run({ sock, m, args, command }) {
        const cmd = String(command || "").toLowerCase()

        // ─── .grouptrustlist ───
        if (cmd === "grouptrustlist" || cmd === "trustgrouplist" || (args[0] || "").toLowerCase() === "list") {
            const groups = getTrustedGroups()
            const users = getTrustedUsers()

            const lines = []
            if (!groups.length) {
                lines.push("├ _Belum ada grup trusted._")
            } else {
                for (const g of groups) {
                    const name = g.name || (await groupName(sock, g.jid, g.jid))
                    lines.push(`├ 👥 ${name}`)
                    lines.push(`│   \`${g.jid}\` — ${g.addedAt ? fmtDate(g.addedAt) : "-"}`)
                }
            }

            return m.reply(card("TRUSTED GROUPS", [
                "👥 User trusted bisa memakai *semua command*",
                "(kecuali `reboot` & `self`) HANYA di grup ini.",
                "",
                "─────────────────",
                "",
                ...lines,
                ...(groups.length ? ["", `Total: *${groups.length}* grup trusted`] : []),
                "",
                `🔐 User trusted: *${users.length}* — lihat ${global.prefix}trustlist`,
                "",
                "─────────────────",
                "",
                "*Kelola (jalankan di dalam grup):*",
                `${global.prefix}trustgroup — jadikan grup ini trust`,
                `${global.prefix}untrustgroup — cabut trust grup ini`,
                `${global.prefix}trustgroup <jid@g.us> — pakai JID manual`
            ], { emoji: "👥" }))
        }

        // ─── Untuk trust / untrust: PERLU konteks grup ───
        // JID manual bila ada (@g.us), kalau tidak pakai grup saat ini.
        const jidArg = (args.find((a) => String(a).endsWith("@g.us")) || "").trim()
        const target = jidArg || (m.isGroup ? m.chat : null)

        if (!target) {
            return m.reply(card("TRUST GROUP", [
                "❌ Command ini harus dijalankan *di dalam grup*,",
                "atau sertakan JID grup manual.",
                "",
                `${global.prefix}${cmd}`,
                `${global.prefix}${cmd} 12036xxxxxxxx@g.us`,
                "",
                `Lihat daftar: ${global.prefix}grouptrustlist`
            ], { emoji: "👥" }))
        }

        if (!String(target).endsWith("@g.us")) {
            return m.reply(card("ERROR", [
                "❌ JID grup tidak valid.",
                "",
                `Yang kamu masukkan: ${target}`,
                "JID grup berakhiran @g.us."
            ], { emoji: "❌" }))
        }

        const removing = cmd === "untrustgroup" || ["del", "rm", "remove", "hapus"].includes((args[0] || "").toLowerCase())
        const name = m.isGroup && m.chat === target ? (m.groupName || "") : await groupName(sock, target, "")

        if (removing) {
            if (!isTrustedGroup(target)) {
                return m.reply(card("INFO", [
                    `ℹ️ Grup *${name || target}* memang tidak ada di daftar trust.`
                ], { emoji: "ℹ️" }))
            }

            removeTrustedGroup(target)
            return m.reply(card("❌ GROUP UNTRUSTED", [
                `👥 Trust untuk *${name || target}* dicabut.`,
                "",
                "User trusted TIDAK bisa lagi memakai command",
                "owner-level di grup ini (kembali jadi user biasa).",
                "",
                `👥 Sisa: *${getTrustedGroups().length}* grup trusted`,
                "",
                `_Trust lagi: ${global.prefix}trustgroup_`
            ], { emoji: "❌" }))
        }

        if (isTrustedGroup(target)) {
            return m.reply(card("INFO", [
                `ℹ️ Grup *${name || target}* *sudah* grup trusted.`,
                "",
                `Lihat daftar: ${global.prefix}grouptrustlist`
            ], { emoji: "ℹ️" }))
        }

        addTrustedGroup(target, m.sender, name || undefined)

        return m.reply(card("✅ GROUP TRUSTED", [
            `👥 *${name || target}* sekarang grup trusted.`,
            "",
            `JID: \`${target}\``,
            "",
            "Di sini user trusted bisa:",
            `• memakai *semua command* (kecuali \`reboot\` & \`self\`),`,
            "• *bypass register* & *self-only mode*,",
            "• *bypass* gate grup-belum-terdaftar.",
            "",
            "⚠️ User belum ditrust? Tambahkan dulu:",
            `${global.prefix}trust @user`,
            "",
            `_Cabut: ${global.prefix}untrustgroup_`
        ], { emoji: "✅" }))
    }
}
