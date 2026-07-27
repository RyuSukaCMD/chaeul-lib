import { card } from "../../lib/ui.js"
import Button from "../../lib/button.js"
import {
    FIELD_COUNT,
    parseBulkInput,
    isPanelReady,
    getPanelCredentials,
    provisionEntry
} from "../../lib/bulkserver.js"
import {
    setBulkSession,
    getBulkSession,
    clearBulkSession
} from "../../lib/bulkserverSession.js"

const LOCK_RX = /\u200b#lock=\d+$/
const clean = (m) => String(m.body || "").replace(LOCK_RX, "").trim()

const fmtMb = (mb) => (mb === 0 ? "Unlimited" : mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`)

// ─── Kartu instruksi format input ───
function instructionCard(prefix) {
    return card(
        "BULK CREATE SERVER",
        [
            "Kirim data akun yang ingin dibuat.",
            "Bot akan membuat *user dulu*, lalu *server*-nya.",
            "",
            "━━━━━━━━━━━━━━━━━",
            "📋 *FORMAT* — 8 baris per akun:",
            "",
            "```",
            "username",
            "password",
            "namaserver",
            "memory",
            "disk",
            "id nest",
            "id egg",
            "id node",
            "```",
            "",
            "Pisahkan tiap akun dengan *baris kosong*.",
            "",
            "━━━━━━━━━━━━━━━━━",
            "💡 *CONTOH* (2 akun sekaligus):",
            "",
            "```",
            "nexa",
            "nexa12345",
            "Nexa Server",
            "2gb",
            "10gb",
            "5",
            "15",
            "1",
            "",
            "rara",
            "rara12345",
            "Rara Server",
            "1024",
            "5120",
            "5",
            "15",
            "2",
            "```",
            "",
            "━━━━━━━━━━━━━━━━━",
            "ℹ️ *Catatan*",
            "• memory & disk: `2gb` / `2048` / `0` (unlimited)",
            "• docker image, startup & seluruh variabel",
            "  diambil OTOMATIS dari egg — pasti terisi",
            "• port/allocation dipilih otomatis, dibuat",
            "  bila node belum punya yang kosong",
            "• username sudah ada → user lama dipakai ulang",
            "",
            `Ketik *batal* untuk membatalkan.`,
            `Sesi hangus otomatis dalam 10 menit.`
        ],
        { emoji: "🚀", footer: `${prefix}bulkserver` }
    )
}

// ─── Kartu pratinjau sebelum eksekusi ───
function previewCard(entries, errors, prefix) {
    const lines = [
        `📦 *${entries.length} akun* siap diproses.`,
        "",
        "━━━━━━━━━━━━━━━━━"
    ]

    entries.forEach((e) => {
        lines.push(
            `*${e.no}. ${e.username}*`,
            `├ 🖥️ Server : ${e.name}`,
            `├ 🧠 Memory : ${fmtMb(e.memory)}`,
            `├ 💾 Disk   : ${fmtMb(e.disk)}`,
            `╰ 🥚 Nest ${e.nest} · Egg ${e.egg} · Node ${e.node}`,
            ""
        )
    })

    if (errors.length) {
        lines.push("━━━━━━━━━━━━━━━━━", "⚠️ *Dilewati (format salah):*")
        errors.forEach((err) => lines.push(`• ${err}`))
        lines.push("")
    }

    lines.push(
        "━━━━━━━━━━━━━━━━━",
        "Urutan proses: *buat user → buat server*.",
        "",
        "Tekan *Proses* untuk mulai,",
        "atau ketik *batal* untuk membatalkan."
    )

    return card("KONFIRMASI BULK SERVER", lines, { emoji: "📋", footer: `${prefix}bulkserver` })
}

// ─── Jalankan pembuatan ───
async function execute(sock, m, entries) {
    const total = entries.length
    const results = []
    const failures = []
    const usedAllocations = new Set()

    await m.reply(
        card(
            "MEMPROSES",
            [
                `⏳ Membuat ${total} akun + server...`,
                "",
                "Urutan tiap entri:",
                "1️⃣ Buat user panel",
                "2️⃣ Ambil konfigurasi egg",
                "3️⃣ Siapkan allocation (port)",
                "4️⃣ Buat server",
                "",
                "_Mohon tunggu, jangan kirim command lain._"
            ],
            { emoji: "⚙️" }
        )
    )

    for (const entry of entries) {
        try {
            const result = await provisionEntry(entry, { usedAllocations })
            results.push(result)
            console.log(
                `[BulkServer] OK #${entry.no} ${entry.username} → server ${result.server?.id} (port ${result.allocation.port})`
            )
        } catch (error) {
            failures.push({ entry, message: error?.message || String(error) })
            console.error(`[BulkServer] GAGAL #${entry.no} ${entry.username}: ${error?.message}`)
        }

        // Jeda kecil agar panel tidak kena rate-limit.
        await new Promise((r) => setTimeout(r, 800))
    }

    const { url } = getPanelCredentials()
    const lines = [`✅ Berhasil : *${results.length}* / ${total}`]
    if (failures.length) lines.push(`❌ Gagal    : *${failures.length}*`)
    lines.push("", "━━━━━━━━━━━━━━━━━")

    for (const r of results) {
        lines.push(
            `*${r.entry.no}. ${r.entry.name}*`,
            `├ 👤 Username : ${r.entry.username}${r.userReused ? " _(user lama)_" : ""}`,
            `├ 🔑 Password : ${r.entry.password}`,
            `├ 📧 Email    : ${r.email}`,
            `├ 🆔 Server   : #${r.server?.id ?? "-"}`,
            `├ 🧠 Memory   : ${fmtMb(r.entry.memory)}`,
            `├ 💾 Disk     : ${fmtMb(r.entry.disk)}`,
            `├ 🥚 Egg      : ${r.egg.name}`,
            `├ 🔌 Port     : ${r.allocation.port}${r.allocation.created ? " _(baru)_" : ""}`,
            `╰ 🌐 Panel    : ${url || "-"}`,
            ""
        )
    }

    if (failures.length) {
        lines.push("━━━━━━━━━━━━━━━━━", "❌ *Gagal diproses:*")
        for (const f of failures) {
            lines.push(`• *${f.entry.username}* — ${f.message}`)
        }
        lines.push("")
    }

    lines.push("━━━━━━━━━━━━━━━━━", "🔐 _Bagikan kredensial hanya ke pemiliknya._")

    await m.react(results.length ? "✅" : "❌")

    return m.reply(
        card(results.length ? "BULK SERVER SELESAI" : "BULK SERVER GAGAL", lines, {
            emoji: results.length ? "🎉" : "❌"
        })
    )
}

export default {
    command: ["bulkserver", "bulkcreate", "createbulk", /^bulkserver_(run|cancel)$/],

    owner: true,

    category: "Owner",

    description: "Bulk create akun panel + server Pterodactyl (user dibuat dulu, lalu server)",

    async run({ sock, m, text }) {
        const prefix = global.prefix
        const body = clean(m)

        // ─── Tombol: batal ───
        if (body === "bulkserver_cancel") {
            clearBulkSession(m.sender)
            return m.reply(card("DIBATALKAN", ["❌ Bulk create dibatalkan."], { emoji: "🚫" }))
        }

        // ─── Tombol: proses ───
        if (body === "bulkserver_run") {
            const session = getBulkSession(m.sender)
            if (!session?.entries?.length) {
                return m.reply(
                    card("SESI HABIS", [`Sesi tidak ditemukan. Mulai lagi: ${prefix}bulkserver`], {
                        emoji: "⌛"
                    })
                )
            }
            clearBulkSession(m.sender)
            return await execute(sock, m, session.entries)
        }

        // ─── Cek konfigurasi panel ───
        if (!isPanelReady()) {
            return m.reply(
                card(
                    "PANEL BELUM DIATUR",
                    [
                        "❌ URL & API key panel belum tersedia.",
                        "",
                        `Atur dulu dengan:`,
                        `${prefix}setplta <url> <apikey>`,
                        `atau ${prefix}setpterodactyl <url> <apikey>`,
                        "",
                        "API key wajib *Read & Write* (Application API)."
                    ],
                    { emoji: "⚙️" }
                )
            )
        }

        // ─── Data dikirim langsung bersama command ───
        if (text && text.trim()) {
            return await handleInput(sock, m, text)
        }

        // ─── Buka sesi: minta data ───
        setBulkSession(m.sender, { chat: m.chat, step: "input", entries: [] })

        return Button.menu({
            sock,
            m,
            body: instructionCard(prefix),
            footer: "© Chaeul",
            lock: m.sender,
            buttons: [{ type: "quick", text: "❌ Batal", id: "bulkserver_cancel" }]
        })
    }
}

/**
 * Proses teks data (dipakai command langsung maupun input sesi).
 * Diekspor agar handler bisa menangkap balasan tanpa prefix.
 */
export async function handleInput(sock, m, text) {
    const prefix = global.prefix
    const { entries, errors } = parseBulkInput(text)

    if (!entries.length) {
        clearBulkSession(m.sender)
        return m.reply(
            card(
                "FORMAT TIDAK VALID",
                [
                    "❌ Tidak ada data yang bisa dibaca.",
                    "",
                    ...(errors.length ? ["*Detail:*", ...errors.map((e) => `• ${e}`), ""] : []),
                    `Tiap akun butuh tepat ${FIELD_COUNT} baris.`,
                    `Ulangi dengan: ${prefix}bulkserver`
                ],
                { emoji: "⚠️" }
            )
        )
    }

    setBulkSession(m.sender, { chat: m.chat, step: "confirm", entries })

    return Button.menu({
        sock,
        m,
        body: previewCard(entries, errors, prefix),
        footer: "© Chaeul",
        lock: m.sender,
        buttons: [
            { type: "quick", text: `🚀 Proses ${entries.length} Akun`, id: "bulkserver_run" },
            { type: "quick", text: "❌ Batal", id: "bulkserver_cancel" }
        ]
    })
}
