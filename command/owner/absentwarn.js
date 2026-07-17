import { card } from "../../lib/ui.js"
import {
    isAbsenWarnGroup,
    addAbsenWarnGroup,
    delAbsenWarnGroup,
    listAbsenWarnGroups
} from "../../lib/absenwarn.js"

// ═══════════════════════════════════════════════════════════
//  .absentwarn — kelola whitelist grup pengingat absen.
//   .absentwarn on     → aktifkan di grup ini
//   .absentwarn off    → matikan di grup ini
//   .absentwarn        → toggle (on/off) di grup ini
//   .absentwarn list   → daftar semua grup whitelist
//
//  Grup whitelist akan otomatis di-TAG oleh bot untuk mengingatkan
//  anggota yang absennya hampir/sudah habis (digabung bila berdekatan).
// ═══════════════════════════════════════════════════════════

export default {
    command: ["absentwarn", "absenwarn", "warnabsen"],

    owner: true,

    category: "Owner",

    description: "Whitelist grup untuk pengingat absen (tag otomatis)",

    async run({ sock, m, args }) {
        const sub = (args[0] || "").toLowerCase()

        // Daftar semua grup whitelist
        if (sub === "list") {
            const groups = listAbsenWarnGroups()
            if (!groups.length) {
                return m.reply(
                    card("ABSEN WARN", ["Belum ada grup whitelist.", "", `Aktifkan: ${global.prefix}absentwarn on`], {
                        emoji: "⏰"
                    })
                )
            }
            const lines = [`Total: ${groups.length} grup`, ""]
            for (const g of groups) {
                let name = g
                try {
                    const meta = await sock.groupMetadata(g)
                    name = meta?.subject || g
                } catch {}
                lines.push(`• ${name}`)
                lines.push(`  ${g}`)
            }
            return m.reply(card("ABSEN WARN — LIST", lines, { emoji: "⏰" }))
        }

        // Aksi berikut khusus di grup
        if (!m.isGroup) {
            return m.reply(
                card("ABSEN WARN", "Command ini dipakai di dalam grup (atau pakai 'list').", {
                    emoji: "⏰"
                })
            )
        }

        const currentlyOn = isAbsenWarnGroup(m.chat)

        // Tentukan aksi: on/off eksplisit, atau toggle bila kosong.
        let turnOn
        if (sub === "on" || sub === "aktif" || sub === "enable") turnOn = true
        else if (sub === "off" || sub === "mati" || sub === "disable") turnOn = false
        else turnOn = !currentlyOn // toggle

        if (turnOn) {
            if (currentlyOn) {
                return m.reply(card("ABSEN WARN", "Grup ini SUDAH aktif untuk pengingat absen. ✅", { emoji: "⏰" }))
            }
            addAbsenWarnGroup(m.chat)
            await m.react("✅")
            return m.reply(
                card(
                    "ABSEN WARN AKTIF",
                    [
                        "✅ Grup ini masuk whitelist pengingat absen.",
                        "",
                        "Bot akan otomatis men-TAG anggota yang absennya",
                        "hampir/sudah habis (digabung bila berdekatan).",
                        "",
                        `Matikan: ${global.prefix}absentwarn off`
                    ],
                    { emoji: "⏰" }
                )
            )
        } else {
            if (!currentlyOn) {
                return m.reply(card("ABSEN WARN", "Grup ini memang belum aktif.", { emoji: "⏰" }))
            }
            delAbsenWarnGroup(m.chat)
            await m.react("✅")
            return m.reply(
                card("ABSEN WARN NONAKTIF", ["❌ Pengingat absen dimatikan untuk grup ini."], {
                    emoji: "⏰"
                })
            )
        }
    }
}
