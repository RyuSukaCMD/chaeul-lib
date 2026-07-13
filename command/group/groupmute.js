import { card } from "../../lib/ui.js"
import { checkAdmin } from "../../lib/groupadmin.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import {
    muteUser,
    unmuteUser,
    clearMute,
    listMute,
    parseMuteTime,
    formatMuteLeft
} from "../../lib/groupmute.js"

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
    command: ["mute", "umute", "unmute", "delmute"],

    category: "Group",

    description:
        "Mute anggota grup (pesan otomatis dihapus). Support permanent & durasi. Admin only.",

    async run({ sock, m, command, args, isCreator }) {
        if (!m.isGroup) return m.reply("Command ini hanya untuk grup.")

        const { isAdmin } = await checkAdmin(sock, m, isCreator)
        if (!isAdmin) return m.reply(card("GROUP", "Khusus admin grup.", { emoji: "🔒" }))

        // ── DELMUTE: hapus semua mute di grup ──
        if (command === "delmute") {
            const n = clearMute(m.chat)
            await m.react("✅")
            return m.reply(
                card(
                    "DELMUTE",
                    n ? `✅ ${n} user di-unmute (semua).` : "Tidak ada user yang di-mute.",
                    { emoji: "🔊" }
                )
            )
        }

        // ── UMUTE / UNMUTE ──
        if (command === "umute" || command === "unmute") {
            const target = await pickTarget(sock, m, args)
            if (!target)
                return m.reply(
                    card(
                        "UNMUTE",
                        [`Tag/reply user yang mau di-unmute.`, `${global.prefix}umute @user`],
                        {
                            emoji: "🔊"
                        }
                    )
                )
            const ok = unmuteUser(m.chat, target)
            await m.react("✅")
            return m.reply(
                card(
                    "UNMUTE",
                    ok
                        ? `🔊 ${tag(target)} sudah di-unmute.`
                        : `${tag(target)} memang tidak di-mute.`,
                    { emoji: "🔊" }
                ),
                { mentions: [target] }
            )
        }

        // ── MUTE ──
        const target = await pickTarget(sock, m, args)
        if (!target) {
            // Tanpa target → tampilkan daftar mute
            const list = listMute(m.chat)
            if (!list.length) {
                return m.reply(
                    card(
                        "MUTE",
                        [
                            `Tag/reply user yang mau di-mute.`,
                            ``,
                            `Format:`,
                            `${global.prefix}mute @user           (permanen)`,
                            `${global.prefix}mute @user permanent  (permanen)`,
                            `${global.prefix}mute @user 30m Spam   (30 menit)`,
                            ``,
                            `Durasi: 30s 10m 1h 1d / permanent`
                        ],
                        { emoji: "🔇" }
                    )
                )
            }
            const mentions = list.map((x) => `${x.number}@s.whatsapp.net`)
            const lines = list.map((x) => `◦ @${x.number} • ${formatMuteLeft(x.expired)}`)
            return m.reply(card("MUTED USERS", lines, { emoji: "🔇" }), { mentions })
        }

        const num = target.split("@")[0]
        const isOwner = global.owner.some((o) => num === o || num.startsWith(o))
        if (isOwner) return m.reply(card("MUTE", "Owner tidak bisa di-mute.", { emoji: "🔇" }))

        // Argumen durasi = argumen pertama yang bukan mention/nomor
        const nonNum = args.filter((a) => !/^\d{6,}$/.test(a.replace(/\D/g, "")))
        const durArg = nonNum[0] || "permanent"
        const expired = parseMuteTime(durArg)
        if (expired === null) {
            return m.reply(
                card("MUTE", ["Format durasi salah.", "Contoh: 30s 10m 1h 1d / permanent"], {
                    emoji: "🔇"
                })
            )
        }
        const reason = nonNum.slice(1).join(" ") || "-"

        muteUser(m.chat, target, expired, reason)
        await m.react("🔇")
        return m.reply(
            card(
                "USER MUTED",
                [
                    `👤 ${tag(target)}`,
                    `⏳ Durasi : ${expired === 0 ? "Permanen" : formatMuteLeft(expired)}`,
                    `📝 Alasan : ${reason}`,
                    ``,
                    `Pesan user ini akan otomatis dihapus.`,
                    `(bot harus admin)`
                ],
                { emoji: "🔇" }
            ),
            { mentions: [target] }
        )
    }
}
