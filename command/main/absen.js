import axios from "axios"
import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { formatWIB, formatRemaining } from "../../lib/attendance.js"

// ═══════════════════════════════════════════════════════════
//  .absen — Absen harian NexHost via WEB (port 100% dari nopal)
//
//  Alur dibuat sama seperti PHP nopal/absen.php:
//   1. Bot kirim nomor WA user ke PHP library web (/includes/wa_absen.php).
//   2. Website cari user berdasarkan users.json -> wa_number.
//   3. Website cek server confirmed dari server_requests.json.
//   4. Website cek already absen hari ini (WIB).
//   5. Website menjalankan do_absen_web() dan menulis data/attendance.json.
//
//  Jadi sumber data absensi TETAP website, bukan database lokal bot.
// ═══════════════════════════════════════════════════════════

export default {
    command: ["absen", "attendance", /^absen_(do|status)$/],

    category: "Main",

    description: "Absen harian hosting — request langsung ke web NexHost",

    // Absensi wajib gratis: jangan potong token user.
    free: true,

    async run({ sock, m, command }) {
        const number = (await resolvePn(sock, m, m.sender)).replace(/[^0-9]/g, "")
        const username = m.pushName || m.name || number

        if (command === "absen_do") return doAbsenFlow(m, number, username)
        if (command === "absen_status") return showStatus(m, number)

        return showPanel(sock, m, number, username)
    }
}

function webConfig() {
    let base = (
        global.absenWeb?.portalUrl ||
        global.absenWeb?.apiUrl ||
        global.absenWeb?.baseUrl ||
        global.license?.apiUrl ||
        process.env.PORTAL_URL ||
        process.env.NEXHOST_WEB_URL ||
        process.env.CHAEUL_WEB_URL ||
        ""
    ).replace(/\/+$/, "")

    const apiPort = global.absenWeb?.apiPort || process.env.API_PORT || ""
    // Kalau PORTAL_URL belum menyertakan port dan API_PORT memang dipakai untuk web API,
    // bot tetap support format env lama: PORTAL_URL=http://127.0.0.1 + API_PORT=xxxx.
    if (base && apiPort && /^https?:\/\/[^/:]+$/i.test(base)) base = `${base}:${apiPort}`

    const endpoint =
        global.absenWeb?.endpoint ||
        process.env.API_PATH ||
        process.env.ABSEN_API_PATH ||
        "/includes/wa_absen.php"

    const secret =
        global.absenWeb?.secret ||
        process.env.API_SECRET ||
        process.env.WA_BOT_API_SECRET ||
        process.env.NEXHOST_WA_BOT_SECRET ||
        ""

    return { base, endpoint: endpoint.startsWith("/") ? endpoint : `/${endpoint}`, secret }
}

async function callWebAbsen(action, phone) {
    const { base, endpoint, secret } = webConfig()
    if (!base || !secret) {
        return {
            success: false,
            code: "bot_config_missing",
            error:
                "Konfigurasi absen web belum lengkap. Set PORTAL_URL dan API_SECRET di .env bot."
        }
    }

    try {
        const { data } = await axios.post(
            `${base}${endpoint}`,
            { secret, action, phone },
            { timeout: 20000, headers: { "Content-Type": "application/json" } }
        )
        return data || { success: false, error: "Response web kosong." }
    } catch (e) {
        const data = e?.response?.data
        if (data && typeof data === "object") return data
        return {
            success: false,
            code: "web_unreachable",
            error: "Gagal menghubungi web absen: " + (e?.message || "unknown error")
        }
    }
}

function ms(sec) {
    return Number(sec || 0) * 1000
}

function statusFromWeb(res) {
    const record = res?.record || null
    const nowSec = Number(res?.now || Math.floor(Date.now() / 1000))
    const expSec = Number(record?.expires_at || res?.expires_at || 0)
    const remainingMs = Math.max(0, (expSec - nowSec) * 1000)
    return {
        record,
        active: !!record && remainingMs > 0,
        expiresAtMs: ms(expSec),
        lastAbsenMs: ms(record?.last_absen_ts),
        remainingMs
    }
}

function userLabel(res, fallback) {
    const u = res?.user || {}
    return u.username || fallback || u.wa_number || "User"
}

async function showPanel(sock, m, number, username) {
    const res = await callWebAbsen("status", number)
    const st = statusFromWeb(res)
    const name = userLabel(res, username)

    const lines = [`👤 ${name}`, ""]

    if (!res.success) {
        lines.push("❌ " + (res.error || "Gagal mengambil status absen."))
        lines.push("")
        if (res.code === "user_not_found") {
            lines.push("Pastikan nomor WhatsApp kamu sama dengan yang terdaftar di portal.")
        } else if (res.code === "no_active_server") {
            lines.push("Kamu harus punya server confirmed/aktif dulu sebelum absen.")
        } else {
            lines.push("Coba lagi beberapa saat lagi.")
        }
    } else if (st.active) {
        lines.push("✅ Kamu SUDAH absen & server aman.")
        lines.push(`⏳ Berlaku sampai: ${formatWIB(st.expiresAtMs)}`)
        lines.push(`   Sisa waktu: ${formatRemaining(st.remainingMs)}`)
        lines.push("")
        lines.push("Kamu hanya bisa absen 1x per hari (WIB), sama seperti sistem web.")
    } else {
        lines.push("❌ Kamu BELUM absen / masa absen sudah habis.")
        lines.push("")
        lines.push("Absen sekarang biar server kamu tetap aman 24 jam ke depan.")
    }

    const buttons = [
        { type: "quick", text: "✅ Absen Sekarang", id: "absen_do" },
        { type: "quick", text: "📊 Cek Status", id: "absen_status" }
    ]

    return Button.menu({
        sock,
        m,
        body: card("ABSEN HARIAN", lines, { emoji: "📋" }),
        footer: "© NexHost • Data absen tersimpan di website",
        lock: m.sender,
        buttons
    })
}

async function doAbsenFlow(m, number, username) {
    // Tombol dikunci via Button.menu({ lock: m.sender }).
    // Handler akan mengabaikan klik dari user lain sebelum sampai ke sini.
    const res = await callWebAbsen("absen", number)
    const st = statusFromWeb(res)
    const name = userLabel(res, username)

    if (!res.success) {
        await m.react(res.code === "already_absen" ? "⚠️" : "❌")
        const lines = [res.error || "Absen gagal."]

        if (res.code === "already_absen" && st.record) {
            lines.push("")
            lines.push(`⏳ Aman sampai: ${formatWIB(st.expiresAtMs)}`)
            lines.push("Absen berikutnya bisa besok.")
        }

        return m.reply(card("ABSEN", lines, { emoji: "📋" }))
    }

    await m.react("✅")
    return m.reply(
        card(
            "ABSEN BERHASIL",
            [
                `👤 ${name}`,
                "",
                "✅ Absen berhasil!",
                `⏳ Aman sampai: ${formatWIB(st.expiresAtMs || ms(res.expires_at))}`,
                "",
                "Data sudah masuk ke website NexHost. Jangan lupa absen lagi sebelum 24 jam habis ya."
            ],
            { emoji: "🎉" }
        )
    )
}

async function showStatus(m, number) {
    const res = await callWebAbsen("status", number)
    const st = statusFromWeb(res)

    if (!res.success) {
        return m.reply(card("STATUS ABSEN", [res.error || "Gagal mengambil status absen."], { emoji: "📊" }))
    }

    if (!st.record) {
        return m.reply(
            card("STATUS ABSEN", ["Belum ada data absen.", "", `Ketik ${global.prefix}absen untuk mulai.`], {
                emoji: "📊"
            })
        )
    }

    const lines = [
        `Absen terakhir: ${formatWIB(st.lastAbsenMs)}`,
        `Berlaku sampai: ${formatWIB(st.expiresAtMs)}`,
        ""
    ]

    if (st.active) lines.push(`✅ AKTIF — sisa ${formatRemaining(st.remainingMs)}`)
    else lines.push("❌ SUDAH HABIS — silakan absen lagi.")

    return m.reply(card("STATUS ABSEN", lines, { emoji: "📊" }))
}
