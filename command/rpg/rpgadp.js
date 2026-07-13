import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { EVENTS, getActiveEvents, startEvent, endEvent } from "../../lib/events.js"

function timeLeft(endsAt) {
    const ms = endsAt - Date.now()
    if (ms <= 0) return "berakhir"
    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function panelBody() {
    const active = getActiveEvents()
    const lines = [`⚙️ Kelola event RPG. Event bisa NUMPUK (stack).`, ``]

    if (active.length) {
        lines.push(`🟢 EVENT AKTIF (${active.length}):`)
        for (const ev of active) {
            lines.push(`${ev.emoji} ${ev.name} — ⏳ ${timeLeft(ev.endsAt)}`)
        }
    } else {
        lines.push(`⚫ Tidak ada event aktif.`)
    }
    lines.push(``)
    lines.push(`Pilih aksi di daftar bawah 👇`)
    return card("RPG ADMIN PANEL", lines, { emoji: "🛠️" })
}

async function sendPanel(sock, m) {
    const active = getActiveEvents()
    const activeIds = new Set(active.map((e) => e.id))

    // Section 1: nyalakan / perpanjang event (bisa stack)
    const eventRows = EVENTS.map((ev) => ({
        title: `${ev.emoji} ${ev.name}${activeIds.has(ev.id) ? " 🟢" : ""}`,
        description: activeIds.has(ev.id) ? `Aktif — pilih untuk perpanjang` : ev.desc,
        id: `rpgadp_ev:${ev.id}`
    }))

    // Section 2: kontrol
    const controlRows = [
        { title: `🎲 Event Acak`, description: `Nyalakan 1 event random`, id: `rpgadp_random` },
        {
            title: `🎲🎲 Stack 2 Event`,
            description: `Nyalakan 2 event acak sekaligus`,
            id: `rpgadp_stack`
        }
    ]

    // Section 3: matikan event aktif (per event) + stop semua
    const stopRows = active.map((ev) => ({
        title: `🛑 Stop ${ev.name}`,
        description: `Matikan event ini saja`,
        id: `rpgadp_stop:${ev.id}`
    }))
    stopRows.push({
        title: `🛑 Stop SEMUA Event`,
        description: `Matikan semua event aktif`,
        id: `rpgadp_stopall`
    })
    stopRows.push({
        title: `🔄 Refresh Panel`,
        description: `Perbarui status`,
        id: `rpgadp_status`
    })

    const sections = [
        { title: "✦ NYALAKAN / PERPANJANG EVENT", rows: eventRows },
        { title: "✦ KONTROL CEPAT", rows: controlRows },
        { title: "✦ MATIKAN EVENT", rows: stopRows }
    ]

    return Button.menu({
        sock,
        m,
        body: panelBody(),
        footer: "© Chaeul • RPG Admin Panel",
        listTitle: "🛠️ Panel Admin RPG",
        sections
    })
}

export default {
    command: [
        "rpgadp",
        "rpgadmin",
        "rpgpanel",
        /^rpgadp_ev:.+$/,
        /^rpgadp_stop:.+$/,
        "rpgadp_random",
        "rpgadp_stack",
        "rpgadp_stopall",
        "rpgadp_status"
    ],

    owner: true,

    category: "RPG",

    description: "Panel admin RPG: nyalain/matiin event (bisa stack) — owner only",

    async run({ sock, m, command }) {
        // Nyalakan / perpanjang event tertentu (stack)
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

        // Stop event tertentu
        if (command.startsWith("rpgadp_stop:")) {
            const id = command.split(":")[1]
            const ev = EVENTS.find((e) => e.id === id)
            endEvent(id)
            await m.react("🛑")
            await m.reply(
                card("EVENT DIMATIKAN", [`${ev ? ev.name : id} dihentikan.`], { emoji: "🛑" })
            )
            return sendPanel(sock, m)
        }

        // Event acak
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

        // Stack 2 event acak
        if (command === "rpgadp_stack") {
            const first = startEvent()
            const others = EVENTS.filter((e) => e.id !== first?.id)
            const second = startEvent(others[Math.floor(Math.random() * others.length)].id)
            await m.react("🔥")
            await m.reply(
                card(
                    "STACK EVENT DINYALAKAN",
                    [`🔥 2 event sekaligus!`, `${first.name}`, `${second.name}`],
                    { emoji: "🔥" }
                )
            )
            return sendPanel(sock, m)
        }

        // Stop semua
        if (command === "rpgadp_stopall") {
            endEvent()
            await m.react("🛑")
            await m.reply(card("EVENT DIMATIKAN", [`Semua event dihentikan.`], { emoji: "🛑" }))
            return sendPanel(sock, m)
        }

        // Refresh / command utama
        return sendPanel(sock, m)
    }
}
