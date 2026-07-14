import axios from "axios"
import { card } from "../../lib/ui.js"

// Command owner untuk kelola lisensi bot lewat website (admin API).
// Butuh global.license.apiUrl + global.license.adminToken.

function base() {
    return (global.license?.apiUrl || "").replace(/\/+$/, "")
}
function headers() {
    return { "x-admin-token": global.license?.adminToken || "" }
}

export default {
    command: ["license", "lisensi", "genlicense", "buatlisensi"],

    owner: true,

    category: "Owner",

    description: "Kelola lisensi bot (buat/list/perpanjang/revoke) via website",

    async run({ m, args, command }) {
        if (!base()) {
            return m.reply(
                card("LICENSE", "URL website lisensi belum diatur (global.license.apiUrl).", {
                    emoji: "🔑"
                })
            )
        }

        const sub = (args[0] || (command === "genlicense" ? "create" : "help")).toLowerCase()

        try {
            // ── BUAT lisensi ──
            // .license create <plan> <days> [ownerNumber] [groupJid]
            if (sub === "create" || sub === "buat" || command === "genlicense") {
                const a = command === "genlicense" ? args : args.slice(1)
                const plan = (a[0] || "private").toLowerCase()
                const days = parseInt(a[1], 10) || 30
                const ownerNumber = (a[2] || "").replace(/[^0-9]/g, "") || global.owner[0]
                const groupJid = a[3] || null

                const { data } = await axios.post(
                    `${base()}/api/license/create`,
                    { plan, days, ownerNumber, groupJid },
                    { headers: headers(), timeout: 20000 }
                )
                if (!data?.ok) throw new Error(data?.error || "Gagal membuat lisensi.")
                const l = data.license
                await m.react("✅")
                return m.reply(
                    card(
                        "LISENSI DIBUAT",
                        [
                            `🔑 Key: ${l.key}`,
                            `📦 Plan: ${l.plan}`,
                            `👤 Owner: ${l.ownerNumber}`,
                            `📅 Aktif: ${days} hari`,
                            l.groupJid ? `💬 Grup: ${l.groupJid}` : ``,
                            ``,
                            `Pasang di config bot:`,
                            `CHAEUL_LICENSE=${l.key}`
                        ].filter(Boolean),
                        { emoji: "🔑" }
                    )
                )
            }

            // ── LIST lisensi ──
            if (sub === "list") {
                const { data } = await axios.get(`${base()}/api/license/list`, {
                    headers: headers(),
                    timeout: 20000
                })
                if (!data?.ok) throw new Error("Gagal mengambil daftar.")
                if (!data.items.length)
                    return m.reply(card("LISENSI", "Belum ada lisensi.", { emoji: "🔑" }))
                const lines = data.items.slice(0, 20).map((l) => {
                    const on = l.online ? "🟢" : "🔴"
                    return `${on} ${l.key}\n   ${l.plan} · ${l.status} · owner ${l.ownerNumber}`
                })
                return m.reply(
                    card("DAFTAR LISENSI", [`Total: ${data.total}`, ``, ...lines], { emoji: "🔑" })
                )
            }

            // ── PERPANJANG ──
            // .license extend <key> <days>
            if (sub === "extend" || sub === "perpanjang") {
                const key = args[1]
                const days = parseInt(args[2], 10) || 30
                const { data } = await axios.post(
                    `${base()}/api/license/extend`,
                    { key, days },
                    { headers: headers(), timeout: 20000 }
                )
                if (!data?.ok) throw new Error("Gagal / key tidak ditemukan.")
                await m.react("✅")
                return m.reply(
                    card("LISENSI", `✅ ${key} diperpanjang ${days} hari.`, { emoji: "🔑" })
                )
            }

            // ── SUSPEND / ACTIVATE ──
            if (sub === "suspend" || sub === "activate") {
                const key = args[1]
                const status = sub === "suspend" ? "suspended" : "active"
                const { data } = await axios.post(
                    `${base()}/api/license/status`,
                    { key, status },
                    { headers: headers(), timeout: 20000 }
                )
                if (!data?.ok) throw new Error("Gagal / key tidak ditemukan.")
                await m.react("✅")
                return m.reply(card("LISENSI", `✅ ${key} → ${status}.`, { emoji: "🔑" }))
            }

            // ── REVOKE ──
            if (sub === "revoke" || sub === "cabut") {
                const key = args[1]
                const { data } = await axios.post(
                    `${base()}/api/license/revoke`,
                    { key },
                    { headers: headers(), timeout: 20000 }
                )
                if (!data?.ok) throw new Error("Gagal / key tidak ditemukan.")
                await m.react("✅")
                return m.reply(card("LISENSI", `🚫 ${key} dicabut.`, { emoji: "🔑" }))
            }

            // ── HELP ──
            return m.reply(
                card(
                    "LICENSE MANAGER",
                    [
                        `${global.prefix}license create <plan> <days> [owner] [grupJid]`,
                        `${global.prefix}license list`,
                        `${global.prefix}license extend <key> <days>`,
                        `${global.prefix}license suspend <key>`,
                        `${global.prefix}license activate <key>`,
                        `${global.prefix}license revoke <key>`,
                        ``,
                        `plan: private / public`
                    ],
                    { emoji: "🔑" }
                )
            )
        } catch (e) {
            await m.react("❌")
            return m.reply(card("LICENSE ERROR", e.message, { emoji: "⚠️" }))
        }
    }
}
