import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import {
    getSystemStates,
    isKnownSystem,
    isSystemEnabled,
    setSystemEnabled,
    toggleSystem
} from "../../lib/systems.js"

const LOCK_RX = /​#lock=\d+$/
const cleanBody = (m) => String(m.body || "").replace(LOCK_RX, "").trim()

// ─── Kartu status seluruh sistem + tombol toggle ───
function buildStatusCard() {
    const states = getSystemStates()
    const lines = [
        "🎛️ *Kelola sistem background bot.*",
        "Klik sistem di daftar untuk mematikan/menyalakan.",
        "",
        "─────────────────",
        "",
        ...states.map(
            (s) => `${s.enabled ? "🟢" : "🔴"} *${s.name}* — ${s.enabled ? "ON" : "OFF"}`
        ),
        "",
        "─────────────────",
        "",
        ...states.map((s) => `• ${s.desc}`),
        "",
        "_Perubahan langsung berlaku & tersimpan (tahan restart)._"
    ]

    const rows = states.map((s) => ({
        title: `${s.enabled ? "🔴 Matikan" : "🟢 Nyalakan"} ${s.name.replace(/^[^ ]+ /, "")}`,
        description: s.desc,
        id: `disable_tgl:${s.key}`
    }))

    return { lines, rows }
}

async function showStatus(sock, m) {
    const { lines, rows } = buildStatusCard()

    return Button.menu({
        sock,
        m,
        body: card("SYSTEMS CONTROL", lines, { emoji: "🎛️" }),
        footer: "© Chaeul",
        lock: m.sender,
        buttons: [
            { type: "quick", text: "🔴 Matikan Semua", id: "disable_all:off" },
            { type: "quick", text: "🟢 Nyalakan Semua", id: "disable_all:on" },
            { type: "quick", text: "🔄 Refresh", id: "disable_refresh" }
        ],
        sections: rows.length ? [{ title: "✦ PILIH SISTEM", rows }] : []
    })
}

export default {
    command: [
        "disable",
        "disablesys",
        "systems",
        /^disable_tgl:.+$/,
        /^disable_all:(on|off)$/,
        /^disable_refresh$/
    ],

    owner: true,

    category: "Owner",

    description: "Enable/disable sistem background (weather, node warning, dll) via tombol",

    async run({ sock, m, args }) {
        // ─── Router klik button ───
        const body = cleanBody(m)

        if (body === "disable_refresh") {
            return await showStatus(sock, m)
        }

        if (body.startsWith("disable_all:")) {
            const enabled = body.endsWith(":on")
            for (const s of getSystemStates()) {
                setSystemEnabled(s.key, enabled)
            }
            await m.reply(card(
                enabled ? "✅ SEMUA ON" : "🔴 SEMUA OFF",
                [
                    enabled
                        ? "🟢 Semua sistem background *dinyalakan*."
                        : "🔴 Semua sistem background *dimatikan*.",
                    "",
                    "Status terkini:"
                ],
                { emoji: enabled ? "🟢" : "🔴" }
            ))
            return await showStatus(sock, m)
        }

        if (body.startsWith("disable_tgl:")) {
            const key = body.slice("disable_tgl:".length)
            if (!isKnownSystem(key)) return null

            const nowOn = toggleSystem(key)
            const sys = getSystemStates().find((s) => s.key === key)

            await m.reply(card(
                nowOn ? "✅ SYSTEM ON" : "🔴 SYSTEM OFF",
                [
                    `${nowOn ? "🟢" : "🔴"} *${sys?.name || key}* sekarang *${nowOn ? "ON" : "OFF"}*.`,
                    "",
                    sys?.desc || ""
                ],
                { emoji: nowOn ? "🟢" : "🔴" }
            ))
            return await showStatus(sock, m)
        }

        // ─── Via argumen teks: .disable <key> on/off/toggle | list ───
        const sub = (args[0] || "").toLowerCase()

        if (sub && sub !== "list" && isKnownSystem(sub)) {
            const action = (args[1] || "toggle").toLowerCase()
            let nowOn
            if (action === "on" || action === "enable" || action === "aktif" || action === "nyala") {
                nowOn = setSystemEnabled(sub, true)
            } else if (action === "off" || action === "disable" || action === "mati" || action === "nonaktif") {
                nowOn = setSystemEnabled(sub, false)
            } else {
                nowOn = toggleSystem(sub)
            }
            const sys = getSystemStates().find((s) => s.key === sub)
            return m.reply(card(nowOn ? "✅ SYSTEM ON" : "🔴 SYSTEM OFF", [
                `${nowOn ? "🟢" : "🔴"} *${sys?.name || sub}* sekarang *${nowOn ? "ON" : "OFF"}*.`
            ], { emoji: nowOn ? "🟢" : "🔴" }))
        }

        // ─── Tampilkan status + tombol ───
        return await showStatus(sock, m)
    }
}
