import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import {
    getSystemStates,
    getGroupSystemStates,
    isKnownSystem,
    isSystemEnabled,
    setSystemEnabled,
    setGroupSystemEnabled,
    toggleSystem,
    toggleGroupSystem,
    clearGroupSystem
} from "../../lib/systems.js"

const LOCK_RX = /​#lock=\d+$/
const cleanBody = (m) => String(m.body || "").replace(LOCK_RX, "").trim()

// ─── Kartu status seluruh sistem + tombol toggle ───
// Di dalam GRUP, .disable mengatur NOTIFIKASI GRUP ITU SAJA.
// Di private chat, .disable mengatur setelan GLOBAL (semua grup).
function buildStatusCard(jid) {
    const scoped = !!jid
    const states = scoped ? getGroupSystemStates(jid) : getSystemStates()
    const lines = [
        scoped
            ? "🎛️ *Kelola notifikasi untuk GRUP INI.*"
            : "🎛️ *Kelola notifikasi bot (global).*",
        scoped
            ? "Hanya notifikasi di grup ini yang terpengaruh."
            : "Berlaku sebagai default untuk semua grup.",
        "",
        "ℹ️ Command, auto-read, auto-typing & auto-voice",
        "TIDAK terpengaruh setelan ini.",
        "",
        "─────────────────",
        "",
        ...states.map(
            (s) =>
                `${s.enabled ? "🟢" : "🔴"} *${s.name}* — ${s.enabled ? "ON" : "OFF"}` +
                (s.overridden ? " _(khusus grup)_" : "")
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
    const scope = m.isGroup ? m.chat : null
    const { lines, rows } = buildStatusCard(scope)

    return Button.menu({
        sock,
        m,
        body: card(m.isGroup ? "NOTIFIKASI GRUP" : "SYSTEMS CONTROL", lines, { emoji: "🎛️" }),
        footer: "© Chaeul",
        lock: m.sender,
        buttons: [
            { type: "quick", text: "🔴 Matikan Semua", id: "disable_all:off" },
            { type: "quick", text: "🟢 Nyalakan Semua", id: "disable_all:on" },
            { type: "quick", text: "🔄 Refresh", id: "disable_refresh" },
            ...(m.isGroup
                ? [{ type: "quick", text: "♻️ Ikuti Global", id: "disable_reset" }]
                : [])
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
        /^disable_refresh$/,
        /^disable_reset$/
    ],

    owner: true,

    category: "Owner",

    description:
        "Atur NOTIFIKASI bot (weather, node warning, absen, welcome). Di grup = per-grup, di PC = global",

    async run({ sock, m, args }) {
        // ─── Router klik button ───
        const body = cleanBody(m)

        // Cakupan: di grup → per-grup, di PC → global.
        const scope = m.isGroup ? m.chat : null
        const scopeLabel = m.isGroup ? "grup ini" : "semua grup (global)"

        const applySet = (key, val) =>
            scope ? setGroupSystemEnabled(scope, key, val) : setSystemEnabled(key, val)
        const applyToggle = (key) => (scope ? toggleGroupSystem(scope, key) : toggleSystem(key))

        if (body === "disable_refresh") {
            return await showStatus(sock, m)
        }

        // Kembalikan grup ini agar mengikuti setelan global lagi.
        if (body === "disable_reset") {
            if (m.isGroup) clearGroupSystem(m.chat)
            await m.reply(
                card("NOTIFIKASI GRUP", ["♻️ Grup ini kembali mengikuti setelan global."], {
                    emoji: "♻️"
                })
            )
            return await showStatus(sock, m)
        }

        if (body.startsWith("disable_all:")) {
            const enabled = body.endsWith(":on")
            for (const s of getSystemStates()) {
                applySet(s.key, enabled)
            }
            await m.reply(card(
                enabled ? "✅ SEMUA ON" : "🔴 SEMUA OFF",
                [
                    enabled
                        ? `🟢 Semua notifikasi *dinyalakan* untuk ${scopeLabel}.`
                        : `🔴 Semua notifikasi *dimatikan* untuk ${scopeLabel}.`,
                    "Command & auto-read tetap berjalan normal.",
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

            const nowOn = applyToggle(key)
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
                nowOn = applySet(sub, true)
            } else if (action === "off" || action === "disable" || action === "mati" || action === "nonaktif") {
                nowOn = applySet(sub, false)
            } else {
                nowOn = applyToggle(sub)
            }
            const sys = getSystemStates().find((s) => s.key === sub)
            return m.reply(
                card(
                    nowOn ? "✅ NOTIF ON" : "🔴 NOTIF OFF",
                    [
                        `${nowOn ? "🟢" : "🔴"} *${sys?.name || sub}* sekarang *${nowOn ? "ON" : "OFF"}* untuk ${scopeLabel}.`
                    ],
                    { emoji: nowOn ? "🟢" : "🔴" }
                )
            )
        }

        // ─── Tampilkan status + tombol ───
        return await showStatus(sock, m)
    }
}
