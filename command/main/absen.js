import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import {
    doAbsen,
    alreadyAbsenToday,
    getStatus,
    getAttendanceRecord,
    formatWIB,
    formatRemaining
} from "../../lib/attendance.js"

// ═══════════════════════════════════════════════════════════
//  .absen — Absen harian (konsep 100% sama dgn nopal/NexHost)
//   • Berlaku 24 jam sejak absen.
//   • Cuma boleh 1x per hari (WIB).
//   • Pakai TOMBOL: "Absen Sekarang" & "Cek Status".
// ═══════════════════════════════════════════════════════════

export default {
    command: ["absen", "attendance", /^absen_(do|status)$/],

    category: "Main",

    description: "Absen harian — server aman 24 jam (pakai tombol)",

    async run({ sock, m, command }) {
        // Identitas user = nomor WA (analog 'email' di web).
        const number = (await resolvePn(sock, m, m.sender)).replace(/[^0-9]/g, "")
        const username = m.pushName || m.name || number

        // ── Tombol: LAKUKAN ABSEN ──
        if (command === "absen_do") {
            return doAbsenFlow(m, number, username)
        }

        // ── Tombol / command: CEK STATUS ──
        if (command === "absen_status") {
            return showStatus(sock, m, number)
        }

        // ── Command utama ".absen" → tampilkan panel + tombol ──
        return showPanel(sock, m, number, username)
    }
}

// ─── Panel utama dengan tombol ───
async function showPanel(sock, m, number, username) {
    const st = getStatus(number)
    const lines = [`👤 ${username}`, ""]

    if (st.active) {
        lines.push("✅ Kamu SUDAH absen & aman.")
        lines.push(`⏳ Berlaku sampai: ${formatWIB(st.expiresAt)}`)
        lines.push(`   Sisa waktu: ${formatRemaining(st.remainingMs)}`)
        lines.push("")
        lines.push("Absen lagi kapan saja untuk reset timer 24 jam.")
    } else {
        lines.push("❌ Kamu BELUM absen hari ini.")
        lines.push("")
        lines.push("Absen sekarang biar server/keanggotaan tetap aman 24 jam ke depan.")
    }

    const buttons = [
        { type: "quick", text: "✅ Absen Sekarang", id: "absen_do" },
        { type: "quick", text: "📊 Cek Status", id: "absen_status" }
    ]

    return Button.menu({
        sock,
        m,
        body: card("ABSEN HARIAN", lines, { emoji: "📋" }),
        footer: "© Chaeul • Absen berlaku 24 jam sejak absen",
        lock: m.sender,
        buttons
    })
}

// ─── Proses absen (port dari absen.php) ───
async function doAbsenFlow(m, number, username) {
    // Aturan: cek sudah absen hari ini (WIB).
    if (alreadyAbsenToday(number)) {
        const rec = getAttendanceRecord(number)
        await m.react("⚠️")
        return m.reply(
            card(
                "ABSEN",
                [
                    "Kamu udah absen hari ini. 😊",
                    "",
                    rec ? `⏳ Aman sampai: ${formatWIB(rec.expires_at)}` : "",
                    "Absen berikutnya bisa besok."
                ].filter(Boolean),
                { emoji: "📋" }
            )
        )
    }

    // Lakukan absen → berlaku 24 jam (identik do_absen_web).
    const expiresAt = doAbsen(number, { number, username, chat: m.chat })
    await m.react("✅")
    return m.reply(
        card(
            "ABSEN BERHASIL",
            [
                `👤 ${username}`,
                "",
                "✅ Absen berhasil!",
                `⏳ Aman sampai: ${formatWIB(expiresAt)}`,
                "",
                "Jangan lupa absen lagi sebelum 24 jam habis ya."
            ],
            { emoji: "🎉" }
        )
    )
}

// ─── Tampilkan status detail ───
async function showStatus(sock, m, number) {
    const st = getStatus(number)
    if (!st.record) {
        return m.reply(
            card("STATUS ABSEN", ["Belum ada data absen.", "", `Ketik ${global.prefix}absen untuk mulai.`], {
                emoji: "📊"
            })
        )
    }
    const lines = [
        `Absen terakhir: ${formatWIB(st.record.last_absen_ts)}`,
        `Berlaku sampai: ${formatWIB(st.expiresAt)}`,
        ""
    ]
    if (st.active) {
        lines.push(`✅ AKTIF — sisa ${formatRemaining(st.remainingMs)}`)
    } else {
        lines.push("❌ SUDAH HABIS — silakan absen lagi.")
    }
    return m.reply(card("STATUS ABSEN", lines, { emoji: "📊" }))
}
