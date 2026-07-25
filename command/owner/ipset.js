import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import {
    getIpAlias,
    getIpAddress,
    setIpAlias,
    setIpAddress,
    setIpConfig,
    resetIpConfig
} from "../../lib/urgent.js"

const LOCK_RX = /​#lock=\d+$/
const cleanBody = (m) => String(m.body || "").replace(LOCK_RX, "").trim()

const showsAs = (v) => v || "-"

function statusLines() {
    const alias = getIpAlias()
    const ip = getIpAddress()
    return [
        `🌐 *IP Alias saat ini:* ${showsAs(alias)}`,
        `📍 *IP Address saat ini:* ${showsAs(ip)}`,
        "",
        `📡 Connect string: \`${alias}:${"<port>"}\``,
        "",
        "─────────────────"
    ]
}

const IP_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$|^::$/i

function isValidIp(ip) {
    if (!IP_PATTERN.test(ip)) return false
    const octets = ip.split(".")
    if (octets.length !== 4) return ip === "::"
    return octets.every((o) => Number(o) >= 0 && Number(o) <= 255)
}

function isValidAlias(alias) {
    return alias.length >= 2 && alias.length <= 100 && !/\s/.test(alias)
}

export default {
    command: [
        "ipset",
        "setalias",
        "aliasip",
        /^ipset_(reset|zero|status|menu)$/
    ],

    owner: true,

    category: "Owner",

    description: "Ganti IP alias & IP address untuk koneksi server (urgent/clone)",

    async run({ sock, m, args }) {
        // ─── Router klik button ───
        const body = cleanBody(m)

        if (body === "ipset_status") {
            return await showMain(sock, m)
        }

        if (body === "ipset_menu") {
            return m.reply(card("CARA GANTI ALIAS & IP", [
                "📝 *Set keduanya sekaligus:*",
                `${global.prefix}ipset <alias> <ip>`,
                `└─ contoh: ${global.prefix}ipset pvnode-5.nexhostku.com 103.10.1.5`,
                "",
                "📝 *Alias saja:*",
                `${global.prefix}ipset alias <domain>`,
                "",
                "📝 *IP saja:*",
                `${global.prefix}ipset ip <ip>`,
                "",
                "📝 *Reset default:*",
                `${global.prefix}ipset reset`
            ], { emoji: "📖" }))
        }

        if (body === "ipset_zero") {
            setIpAddress("0.0.0.0")
            await m.reply(card("✅ IP SET", [
                "📍 IP Address diset ke *0.0.0.0* (wildcard).",
                "Cocok untuk panel dengan allocation wildcard."
            ], { emoji: "🟢" }))
            return await showMain(sock, m)
        }

        if (body === "ipset_reset") {
            const result = resetIpConfig()
            await m.reply(card("✅ RESET", [
                "IP config di-reset ke default:",
                "",
                `🌐 Alias: ${result.ipAlias}`,
                `📍 IP: ${result.ipAddress}`
            ], { emoji: "🟢" }))
            return await showMain(sock, m)
        }

        // ─── Via argumen: status ───
        const sub = (args[0] || "").toLowerCase()
        if (!sub || sub === "status" || sub === "info") {
            return await showMain(sock, m)
        }

        // ─── reset ───
        if (sub === "reset" || sub === "default") {
            const result = resetIpConfig()
            return m.reply(card("✅ RESET", [
                "IP config di-reset ke default:",
                "",
                `🌐 Alias: ${result.ipAlias}`,
                `📍 IP: ${result.ipAddress}`
            ], { emoji: "🟢" }))
        }

        // ─── alias saja: .ipset alias <alias> ───
        if (sub === "alias") {
            const alias = String(args[1] || "").trim()
            if (!alias) {
                return m.reply(card("ERROR", [
                    "❌ Sertakan alias baru.",
                    "",
                    `Contoh: ${global.prefix}ipset alias pvnode-5.nexhostku.com`
                ], { emoji: "❌" }))
            }
            if (!isValidAlias(alias)) {
                return m.reply(card("ERROR", [
                    "❌ Alias tidak valid.",
                    "",
                    "Alias harus 2-100 karakter tanpa spasi",
                    "(domain/IP, mis. pvnode-5.nexhostku.com)."
                ], { emoji: "❌" }))
            }

            const newAlias = setIpAlias(alias)
            await m.reply(card("✅ ALIAS SET", [`🌐 IP alias berhasil diganti: *${newAlias}*`], { emoji: "🟢" }))
            return await showMain(sock, m)
        }

        // ─── ip saja: .ipset ip <ip> ───
        if (sub === "ip") {
            const ip = String(args[1] || "").trim()
            if (!ip) {
                return m.reply(card("ERROR", [
                    "❌ Sertakan IP address baru.",
                    "",
                    `Contoh: ${global.prefix}ipset ip 103.10.1.5`,
                    `Atau wildcard: ${global.prefix}ipset ip 0.0.0.0`
                ], { emoji: "❌" }))
            }
            if (!isValidIp(ip)) {
                return m.reply(card("ERROR", [
                    "❌ Format IP tidak valid.",
                    "",
                    `Yang kamu masukkan: ${ip}`,
                    "",
                    "Contoh benar: 103.10.1.5 / 0.0.0.0"
                ], { emoji: "❌" }))
            }

            try {
                const newIp = setIpAddress(ip)
                await m.reply(card("✅ IP SET", [`📍 IP address berhasil diganti: *${newIp}*`], { emoji: "🟢" }))
            } catch (error) {
                return m.reply(card("ERROR", [`❌ ${error.message}`], { emoji: "❌" }))
            }
            return await showMain(sock, m)
        }

        // ─── set keduanya: .ipset <alias> <ip> ───
        if (args.length >= 2) {
            const alias = String(args[0]).trim()
            const ip = String(args[1]).trim()

            if (!isValidAlias(alias)) {
                return m.reply(card("ERROR", [
                    "❌ Alias tidak valid.",
                    "",
                    `Yang kamu masukkan: ${alias}`
                ], { emoji: "❌" }))
            }
            if (!isValidIp(ip)) {
                return m.reply(card("ERROR", [
                    "❌ Format IP tidak valid.",
                    "",
                    `Yang kamu masukkan: ${ip}`
                ], { emoji: "❌" }))
            }

            try {
                const result = setIpConfig(alias, ip)
                await m.reply(card("✅ IP CONFIG SET", [
                    "Alias & IP berhasil diganti:",
                    "",
                    `🌐 *Alias:* ${result.ipAlias}`,
                    `📍 *IP:* ${result.ipAddress}`
                ], { emoji: "🟢" }))
            } catch (error) {
                return m.reply(card("ERROR", [`❌ ${error.message}`], { emoji: "❌" }))
            }
            return await showMain(sock, m)
        }

        // ─── fallback: menu ───
        return await showMain(sock, m)
    }
}

async function showMain(sock, m) {
    return Button.menu({
        sock,
        m,
        body: card("IP CONFIG", [
            ...statusLines(),
            "",
            "*Kelola dengan tombol, atau ketik:*",
            `${global.prefix}ipset <alias> <ip>`,
            `${global.prefix}ipset alias <domain>`,
            `${global.prefix}ipset ip <ip>`,
            `${global.prefix}ipset reset`
        ], { emoji: "🌐" }),
        footer: "© Chaeul",
        lock: m.sender,
        buttons: [
            { type: "quick", text: "📖 Cara Ganti", id: "ipset_menu" },
            { type: "quick", text: "📍 Set IP 0.0.0.0", id: "ipset_zero" },
            { type: "quick", text: "🔄 Reset Default", id: "ipset_reset" }
        ]
    })
}
