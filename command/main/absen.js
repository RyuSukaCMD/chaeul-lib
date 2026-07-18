import Button from "../../lib/button.js"
import { callAbsen, absenStatus, formatWIB, remaining, serverListText, userNumber } from "../../lib/absenApi.js"

const PORTAL_URL = "https://portal.nexhostku.com"

export default {
    command: ["absen", "attendance", /^absen_(do|status):(\d+)$/],
    category: "Main",
    description: "Absen harian hosting NexHost",
    free: true,

    async run({ sock, m, command }) {
        const number = userNumber(m)
        const username = m.pushName || m.name || number

        const btn = String(command).match(/^absen_(do|status):(\d+)$/)
        if (btn) {
            const [, action, ownerNumber] = btn
            if (ownerNumber !== number) return
            if (action === "do") return doAbsenFlow(sock, m, number, username)
            return showStatus(sock, m, number, username)
        }

        return showPanel(sock, m, number, username)
    }
}

function card(title, lines, emoji = "📋") {
    if (!Array.isArray(lines)) lines = [String(lines || "")]
    return `╭━━━〔 ${emoji} ${title} 〕━━━⬣\n` + lines.join("\n") + `\n╰━━━━━━━━━━━━━━━━━━⬣`
}

function baseLines(res, number, username) {
    const st = absenStatus(res)
    return [
        `Email : ${res?.user?.email || "-"}`,
        `List Server : ${serverListText(res)}`,
        `No WA : ${res?.user?.wa_number || number}`,
        "",
        ...statusLines(res, st, number)
    ]
}

function statusLines(res, st, username = "") {
    if (!res?.success) {
        if (res?.code === "user_not_found") {
            return [
                `❌ @${username || "user"} belum terdaftar di portal NexHost.`,
                "",
                "Silakan daftar akun dulu lewat tombol di bawah, lalu request server."
            ]
        }
        if (res?.code === "no_active_server") {
            return [
                "❌ Akun kamu belum punya server aktif/confirmed.",
                "",
                "Silakan login ke portal dan request server terlebih dahulu."
            ]
        }
        return ["❌ " + (res?.error || "Gagal cek status absen."), res?.detail || ""].filter(Boolean)
    }

    if (res?.premium || res?.code === "premium_skip" || res?.user?.role === "premium") {
        return [
            "💎 Role kamu adalah *Premium*.",
            "Premium tidak wajib absen, jadi server kamu tidak masuk sistem suspend absen.",
            "",
            "Tidak perlu tekan tombol Absen Sekarang."
        ]
    }

    if (!st.record) {
        return [
            "⚠️ Kamu belum absen.",
            "Tekan tombol *Absen Sekarang* agar server tetap aktif selama 24 jam."
        ]
    }

    if (st.active) {
        return [
            "✅ Kamu sudah absen dan server masih aman.",
            `Expired : ${formatWIB(st.exp)}`,
            `Sisa : ${remaining(st.exp, st.now)}`,
            "",
            "Absen ulang hanya bisa 1x per hari (WIB)."
        ]
    }

    return [
        "⚠️ Absen kamu sudah expired.",
        `Expired : ${formatWIB(st.exp)}`,
        "Segera tekan *Absen Sekarang* agar status server kembali aman."
    ]
}

function portalButton(extra = []) {
    return [
        ...extra,
        { type: "url", text: "🌐 Buka Portal", url: PORTAL_URL }
    ]
}

async function sendPanel(sock, m, body, buttons) {
    return Button.menu({ sock, m, body, footer: "© NexHost • Absen via PHP web", buttons })
}

async function showPanel(sock, m, number, username) {
    const res = await callAbsen("status", number)
    const lines = baseLines(res, number, username)

    if (res?.code === "user_not_found" || res?.code === "no_active_server") {
        return sendPanel(sock, m, card("ABSEN HARIAN", lines), portalButton())
    }

    const st = absenStatus(res)
    const buttons = [
        { type: "quick", text: "📊 Cek Status", id: `absen_status:${number}` },
        { type: "url", text: "🌐 Portal", url: PORTAL_URL }
    ]
    // Jika sudah absen/masih aktif atau user Premium, jangan tampilkan tombol Absen Sekarang.
    if (!st.active && !(res?.premium || res?.code === "premium_skip" || res?.user?.role === "premium")) {
        buttons.unshift({ type: "quick", text: "✅ Absen Sekarang", id: `absen_do:${number}` })
    }
    return sendPanel(sock, m, card("ABSEN HARIAN", lines), buttons)
}

async function doAbsenFlow(sock, m, number, username) {
    const res = await callAbsen("absen", number)
    const st = absenStatus(res)
    const lines = baseLines(res, number, username)

    if (!res.success) {
        await m.react(res.code === "already_absen" ? "⚠️" : "❌")
        if (res?.code === "user_not_found" || res?.code === "no_active_server") {
            return sendPanel(sock, m, card("ABSEN", lines), portalButton())
        }
        return m.reply(card("ABSEN", lines))
    }

    if (res?.premium || res?.code === "premium_skip" || res?.user?.role === "premium") {
        await m.react("💎")
        return sendPanel(sock, m, card("ABSEN PREMIUM", lines, "💎"), portalButton([
            { type: "quick", text: "📊 Cek Status", id: `absen_status:${number}` }
        ]))
    }

    await m.react("✅")
    return m.reply(card("ABSEN BERHASIL", [
        `Email : ${res?.user?.email || "-"}`,
        `List Server : ${serverListText(res)}`,
        `No WA : ${res?.user?.wa_number || number}`,
        "",
        "✅ Absen berhasil dicatat ke web.",
        // Expired time ini berasal dari response PHP (top-level expires_at / record dari web).
        `Expired : ${formatWIB(st.exp)}`,
        "",
        "Jangan lupa absen lagi sebelum expired."
    ], "🎉"))
}

async function showStatus(sock, m, number, username) {
    const res = await callAbsen("status", number)
    const lines = baseLines(res, number, username)
    if (res?.code === "user_not_found" || res?.code === "no_active_server") {
        return sendPanel(sock, m, card("STATUS ABSEN", lines, "📊"), portalButton())
    }
    return m.reply(card("STATUS ABSEN", lines, "📊"))
}
