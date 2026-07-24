import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import {
    getUrgentMode,
    setUrgentMode,
    getBlacklistNodes,
    getWhitelistNodes
} from "../../lib/urgent.js"

const LOCK_RX = /​#lock=\d+$/
const cleanBody = (m) => String(m.body || "").replace(LOCK_RX, "").trim()

function modeText(mode) {
    return mode === "whitelist"
        ? "⚪ *WHITELIST* — hanya node di whitelist yang boleh di-claim"
        : "⚫ *BLACKLIST* — semua node boleh, kecuali yang di-blacklist"
}

export default {
    command: [
        "urgentmode",
        "umode",
        /^urgentmode_set:(whitelist|blacklist)$/
    ],

    owner: true,

    category: "Owner",

    description: "Atur mode pembatasan node urgent (whitelist/blacklist)",

    async run({ sock, m, args }) {
        // ─── Router klik button ───
        const body = cleanBody(m)
        if (body.startsWith("urgentmode_set:")) {
            const mode = body.split(":")[1]
            return await applyMode(sock, m, mode)
        }

        // ─── Set via argumen ───
        if (args[0] === "whitelist" || args[0] === "wl" || args[0] === "blacklist" || args[0] === "bl") {
            const mode = args[0] === "wl" ? "whitelist" : args[0] === "bl" ? "blacklist" : args[0]
            return await applyMode(sock, m, mode)
        }

        // ─── Tampilkan status + tombol pilih mode ───
        const mode = getUrgentMode()
        const bl = getBlacklistNodes()
        const wl = getWhitelistNodes()

        return Button.menu({
            sock,
            m,
            body: card(
                "URGENT MODE",
                [
                    `🎛️ Mode aktif: ${modeText(mode)}`,
                    "",
                    `🛑 Blacklist: *${bl.length}* node`,
                    `✅ Whitelist: *${wl.length}* node`,
                    "",
                    "─────────────────",
                    "",
                    "📝 *Cara kerja mode:*",
                    "• *blacklist* → seluruh node dapat digunakan,",
                    "  kecuali yang di-blacklist.",
                    "• *whitelist* → hanya node di whitelist yang",
                    "  dapat digunakan.",
                    "",
                    "Pilih mode dengan tombol di bawah, atau:",
                    `${global.prefix}urgentmode whitelist`,
                    `${global.prefix}urgentmode blacklist`
                ],
                { emoji: "🎛️" }
            ),
            footer: "© Chaeul",
            lock: m.sender,
            buttons: [
                { type: "quick", text: "⚫ Mode Blacklist", id: "urgentmode_set:blacklist" },
                { type: "quick", text: "⚪ Mode Whitelist", id: "urgentmode_set:whitelist" },
                { type: "quick", text: "📊 Status", id: ".urgentstatus" }
            ]
        })
    }
}

async function applyMode(sock, m, mode) {
    setUrgentMode(mode)

    return Button.menu({
        sock,
        m,
        body: card(
            "✅ MODE DIUBAH",
            [
                `🎛️ Mode urgent sekarang:`,
                modeText(mode),
                "",
                mode === "whitelist"
                    ? "Kelola node whitelist dengan " + global.prefix + "wlnode"
                    : "Kelola node blacklist dengan " + global.prefix + "blnode"
            ],
            { emoji: "🎛️" }
        ),
        footer: "© Chaeul",
        lock: m.sender,
        buttons: [
            { type: "quick", text: "✅ Whitelist Node", id: "wlnode_list" },
            { type: "quick", text: "🛑 Blacklist Node", id: "blnode_list" },
            { type: "quick", text: "📊 Status", id: ".urgentstatus" }
        ]
    })
}
