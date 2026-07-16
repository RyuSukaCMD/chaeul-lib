import { card } from "../../lib/ui.js"
import { terabox, fetchBuffer } from "../../lib/downloader.js"
import {
    setTeraboxSession,
    getTeraboxSession,
    clearTeraboxSession
} from "../../lib/teraboxSession.js"

const TERA_REGEX = /(terabox|1024tera|teraboxapp|teraboxlink|4funbox|momerybox|tibibox|nephobox|terasharelink|1024terabox|freeterabox)\.[a-z]+/i

// Batas aman kirim inline (di atas ini → kirim link saja agar tak timeout/OOM).
const INLINE_MAX = 100 * 1024 * 1024 // 100 MB
// Batas jumlah file saat ".terabox all".
const ALL_MAX = 10

const EMOJI = { video: "🎬", image: "🖼️", audio: "🎵", document: "📄", archive: "🗜️", file: "📦" }

export default {
    command: ["terabox", "tb", "tbox", "terabx", "tbdl"],

    category: "Downloader",

    description: "Download dari Terabox (semua tipe file, dukung folder/multi-file)",

    async run({ sock, m, args }) {
        const first = (args[0] || "").toLowerCase()

        // ── Mode PILIH: ".terabox <nomor>" atau ".terabox all" (pakai sesi terakhir) ──
        const isPick = /^\d+$/.test(first) || first === "all" || first === "semua"
        if (isPick) {
            const sess = getTeraboxSession(m.chat)
            if (!sess) {
                return m.reply(
                    card(
                        "TERABOX",
                        [
                            "Belum ada daftar file aktif (atau sudah kedaluwarsa).",
                            "",
                            `Kirim linknya dulu: ${global.prefix}terabox <link>`
                        ],
                        { emoji: "📦" }
                    )
                )
            }

            if (first === "all" || first === "semua") {
                const kirim = sess.files.slice(0, ALL_MAX)
                await m.reply(
                    card("TERABOX", [
                        `Mengirim ${kirim.length} file${
                            sess.files.length > ALL_MAX ? ` (dari ${sess.files.length}, dibatasi ${ALL_MAX})` : ""
                        }...`
                    ], { emoji: "📦" })
                )
                for (let i = 0; i < kirim.length; i++) {
                    await sendOne(sock, m, kirim[i], i + 1, kirim.length)
                }
                return
            }

            const idx = parseInt(first, 10) - 1
            if (idx < 0 || idx >= sess.files.length) {
                return m.reply(
                    card("TERABOX", [`Nomor tidak valid. Pilih 1–${sess.files.length}.`], {
                        emoji: "📦"
                    })
                )
            }
            return sendOne(sock, m, sess.files[idx], idx + 1, sess.files.length)
        }

        // ── Mode LINK: ".terabox <link> [nomor]" ──
        const url = args.find((a) => TERA_REGEX.test(a) || /surl=/.test(a))
        if (!url) {
            return m.reply(
                card(
                    "TERABOX",
                    [
                        "Kirim link share Terabox.",
                        "",
                        `Contoh:`,
                        `${global.prefix}terabox <link>`,
                        "",
                        "Lalu pilih file:",
                        `${global.prefix}terabox <nomor>  → 1 file`,
                        `${global.prefix}terabox all      → semua file`
                    ],
                    { emoji: "📦" }
                )
            )
        }

        await m.react("⏳")
        let data
        try {
            data = await terabox(url)
        } catch (e) {
            await m.react("❌")
            return m.reply(card("TERABOX", [`Gagal: ${e.message}`], { emoji: "📦" }))
        }

        // Simpan sesi untuk pemilihan via nomor.
        setTeraboxSession(m.chat, data)

        // Bila cuma 1 file → langsung kirim.
        if (data.files.length === 1) {
            await m.react("✅")
            return sendOne(sock, m, data.files[0], 1, 1)
        }

        // Bila user langsung sebut nomor di argumen: ".terabox <link> 3"
        const inlineNum = args.find((a) => /^\d+$/.test(a))
        if (inlineNum) {
            const i = parseInt(inlineNum, 10) - 1
            if (i >= 0 && i < data.files.length) {
                await m.react("✅")
                return sendOne(sock, m, data.files[i], i + 1, data.files.length)
            }
        }

        // Tampilkan daftar bernomor.
        await m.react("✅")
        const lines = [`*${data.files.length} file* ditemukan:`, ""]
        data.files.forEach((f, i) => {
            const em = EMOJI[f.type] || EMOJI.file
            lines.push(`${i + 1}. ${em} ${trim(f.name, 38)}`)
            lines.push(`   ${f.size} · ${f.type}`)
        })
        lines.push("")
        lines.push("Pilih file:")
        lines.push(`${global.prefix}terabox <nomor>  → contoh: ${global.prefix}terabox 1`)
        lines.push(`${global.prefix}terabox all      → kirim semua (maks ${ALL_MAX})`)
        return m.reply(card("TERABOX", lines, { emoji: "📦", footer: "Berlaku 10 menit." }))
    }
}

function trim(s = "", n = 40) {
    s = String(s)
    return s.length > n ? s.slice(0, n - 1) + "…" : s
}

/** Kirim 1 file sesuai tipe; bila terlalu besar / gagal unduh → kirim link langsung. */
async function sendOne(sock, m, f, no, total) {
    const label = total > 1 ? `(${no}/${total}) ` : ""
    const em = EMOJI[f.type] || EMOJI.file
    if (!f.download) {
        return m.reply(
            card("TERABOX", [`${label}${em} ${f.name}`, "", "Link download tidak tersedia."], {
                emoji: "📦"
            })
        )
    }

    // File besar → jangan unduh di bot; kirim link langsung (anti-timeout).
    if (f.sizeBytes && f.sizeBytes > INLINE_MAX) {
        return m.reply(
            card(
                "TERABOX",
                [
                    `${label}${em} *${f.name}*`,
                    `Ukuran: ${f.size} (terlalu besar untuk dikirim langsung)`,
                    "",
                    "Link download:",
                    f.download
                ],
                { emoji: "📦" }
            )
        )
    }

    try {
        await m.react("⬇️")
        const buf = await fetchBuffer(f.download, { timeout: 180000, referer: "https://www.terabox.com/" })
        const caption = `${label}${em} *${f.name}*\n${f.size}`

        if (f.type === "video") {
            await m.sendVideo(buf, caption)
        } else if (f.type === "image") {
            await m.sendImage(buf, caption)
        } else if (f.type === "audio") {
            await m.sendAudio(buf, false, { mimetype: "audio/mpeg" })
            await m.reply(caption)
        } else {
            await m.sendDocument(buf, f.name, { mimetype: guessMime(f.name) })
            await m.reply(caption)
        }
        await m.react("✅")
    } catch (e) {
        await m.react("⚠️")
        // Gagal unduh (CDN throttle / expired) → beri link langsung.
        return m.reply(
            card(
                "TERABOX",
                [
                    `${label}${em} *${f.name}* (${f.size})`,
                    "",
                    `Gagal unduh via bot: ${e.message}`,
                    "Coba link langsung:",
                    f.download
                ],
                { emoji: "📦" }
            )
        )
    }
}

function guessMime(name = "") {
    const ext = (name.split(".").pop() || "").toLowerCase()
    const map = {
        pdf: "application/pdf",
        zip: "application/zip",
        rar: "application/vnd.rar",
        "7z": "application/x-7z-compressed",
        apk: "application/vnd.android.package-archive",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xls: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ppt: "application/vnd.ms-powerpoint",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        txt: "text/plain",
        mp3: "audio/mpeg",
        mp4: "video/mp4"
    }
    return map[ext] || "application/octet-stream"
}
