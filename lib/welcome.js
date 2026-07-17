import Button from "./button.js"
import { isGroupRegistered } from "./groupmanage.js"
import { enqueue } from "./batchNotify.js"

// ═══════════════════════════════════════════════════════════
//  WELCOME & GOODBYE — dengan BATCHING.
//  Kalau dalam 10 detik ada 2+ orang join/leave di grup yang sama,
//  digabung jadi SATU pesan yang men-tag semuanya (bukan spam).
// ═══════════════════════════════════════════════════════════

const WINDOW = 10 * 1000 // 10 detik

export default function startWelcome(sock) {
    sock.ev.on("group-participants.update", async (data) => {
        try {
            // Hanya untuk grup terdaftar
            if (!isGroupRegistered(data.id)) return
            if (data.action !== "add" && data.action !== "remove") return

            // Kumpulkan jid tiap peserta ke batch (per grup + per aksi).
            for (const participant of data.participants) {
                const jid = participant.phoneNumber || participant.id || participant
                if (!jid) continue
                const number = String(jid).split("@")[0].split(":")[0]

                enqueue({
                    sock,
                    chat: data.id,
                    type: data.action === "add" ? "welcome" : "goodbye",
                    jid,
                    data: { number },
                    window: WINDOW,
                    render: data.action === "add" ? renderWelcome : renderGoodbye
                })
            }
        } catch (e) {
            console.error("[WELCOME]", e)
        }
    })
}

// ─── Susun daftar tag "@a @b @c" + mentions[] ───
function buildTags(items) {
    const uniq = []
    const seen = new Set()
    for (const it of items) {
        if (!it.jid || seen.has(it.jid)) continue
        seen.add(it.jid)
        uniq.push(it)
    }
    const tags = uniq.map((it) => `@${it.number}`).join(" ")
    const mentions = uniq.map((it) => it.jid)
    return { tags, mentions, count: uniq.length }
}

async function renderWelcome(items, { sock, chat }) {
    const { tags, mentions, count } = buildTags(items)
    if (!count) return
    let meta = {}
    try {
        meta = await sock.groupMetadata(chat)
    } catch {}
    const subject = meta.subject || "grup ini"

    const body =
        `╭────────────────────────\n` +
        `│ Welcome${count > 1 ? ` (${count} anggota baru)` : ""}\n` +
        `╰────────────────────────\n\n` +
        `Halo ${tags}\n\n` +
        `Selamat datang di\n*${subject}*.\n\n` +
        `Klik button di bawah\nuntuk claim hosting gratis!\n\n` +
        `────────────────────────`

    await sendCard(sock, chat, body, mentions)
}

async function renderGoodbye(items, { sock, chat }) {
    const { tags, mentions, count } = buildTags(items)
    if (!count) return

    const body =
        `╭────────────────────────\n` +
        `│ Goodbye${count > 1 ? ` (${count} anggota)` : ""}\n` +
        `╰────────────────────────\n\n` +
        `Selamat tinggal\n${tags}\n\n` +
        `Semoga sukses\ndi mana pun berada.\n\n` +
        `────────────────────────`

    await sendCard(sock, chat, body, mentions)
}

// Kirim pakai Button.menu (biar tetap ada tombol + gambar), dengan mentions
// agar tag @user benar-benar nge-ping semua orang.
async function sendCard(sock, chat, body, mentions) {
    try {
        await Button.menu({
            sock,
            m: { chat, sender: mentions[0] },
            image: "./media/menu.jpg",
            body,
            footer: "Nexhost Department",
            mentions, // <- tag banyak orang sekaligus
            buttons: [{ type: "url", text: "Website", url: "https://portal.nexhostku.com" }]
        })
    } catch (e) {
        // Fallback: pesan teks biasa dengan mentions bila Button gagal.
        try {
            await sock.sendMessage(chat, { text: body, mentions })
        } catch {}
    }
}
