import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { EVENTS, getActiveEvent, startEvent, endEvent } from "../../lib/events.js"

// Format sisa waktu event jadi teks.
function timeLeft(endsAt) {
    const ms = endsAt - Date.now()
    if (ms <= 0) return "berakhir"
    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return m > 0 ? `${m} menit ${s} detik` : `${s} detik`
}

// Susun teks status panel.
function panelBody() {
    const active = getActiveEvent()
    const lines = [`⚙️ Kelola event RPG sesuka hati.`, ``]

    if (active) {
        lines.push(`🟢 EVENT AKTIF:`)
        lines.push(`${active.name}`)
        lines.push(`${active.desc}`)
        lines.push(`⏳ Sisa: ${timeLeft(active.endsAt)}`)
    } else {
        lines.push(`⚫ Tidak ada event aktif.`)
    }
    lines.push(``)
    lines.push(`Daftar event:`)
    for (const ev of EVENTS) {
        lines.push(`${ev.emoji} ${ev.name.replace(/^[^\s]+\s/, "")} — ${ev.desc}`)
    }
    return card("RPG ADMIN PANEL", lines, { emoji: "🛠️" })
}

// Kirim panel + tombol.
async function sendPanel(sock, m) {
    const buttons = [
        ...EVENTS.map((ev) => ({
            type: "quick",
            text: `${ev.emoji} ${ev.name.replace(/^[^\s]+\s/, "")}`,
            id: `rpgadp_ev:${ev.id}`
        })),
        { type: "quick", text: "🎲 Event Acak", id: "rpgadp_random" },
        { type: "quick", text: "🛑 Stop Event", id: "rpgadp_stop" },
        { type: "quick", text: "🔄 Refresh", id: "rpgadp_status" }
    ]

    return Button.menu({
        sock,
        m,
        body: panelBody(),
        footer: "© Chaeul • RPG Admin",
        buttons
    })
}

export default {
    command: [
        "rpgadp",
        "rpgadmin",
        "rpgpanel",
        /^rpgadp_ev:.+$/,
        "rpgadp_random",
        "rpgadp_stop",
        "rpgadp_status"
    ],

    owner: true,

    category: "RPG",

    description: "Panel admin RPG: nyalain/matiin event sesuka hati (owner only)",

    async run({ sock, m, command }) {
        // ── Tombol: nyalakan event tertentu ──
        if (command.startsWith("rpgadp_ev:")) {
            const id = command.split(":")[1]
            const ev = startEvent(id)
            if (!ev)
                return m.reply(card("RPG ADMIN", `Event "${id}" tidak ditemukan.`, { emoji: "🛠️" }))
            await m.react("✅")
            await m.reply(
                card(
                    "EVENT DINYALAKAN",
                    [`${ev.name}`, `${ev.desc}`, `⏳ Durasi: ${timeLeft(ev.endsAt)}`],
                    { emoji: "🟢" }
                )
            )
            return sendPanel(sock, m)
        }

        // ── Tombol: event acak ──
        if (command === "rpgadp_random") {
            const ev = startEvent()
            await m.react("🎲")
            await m.reply(
                card(
                    "EVENT ACAK DINYALAKAN",
                    [`${ev.name}`, `${ev.desc}`, `⏳ Durasi: ${timeLeft(ev.endsAt)}`],
                    { emoji: "🎲" }
                )
            )
            return sendPanel(sock, m)
        }

        // ── Tombol: stop event ──
        if (command === "rpgadp_stop") {
            const active = getActiveEvent()
            endEvent()
            await m.react("🛑")
            await m.reply(
                card(
                    "EVENT DIMATIKAN",
                    active ? [`${active.name} dihentikan.`] : [`Tidak ada event yang aktif.`],
                    { emoji: "🛑" }
                )
            )
            return sendPanel(sock, m)
        }

        // ── Tombol: refresh / status / command utama ──
        return sendPanel(sock, m)
    }
}
