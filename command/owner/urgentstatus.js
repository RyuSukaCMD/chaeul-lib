import { card } from "../../lib/ui.js"
import {
    getUrgentConfig,
    isUrgentOpen,
    getUrgentMode,
    getBlacklistNodes,
    getWhitelistNodes,
    getClaimedUUIDs,
    getClonedUUIDs,
    getIpAlias,
    getIpAddress
} from "../../lib/urgent.js"
import { getNodes } from "../../lib/pterodactyl.js"

export default {
    command: ["urgentstatus", "urgentstats", "urgentinfo"],

    owner: true,

    category: "Owner",

    description: "Status dan statistik sistem urgent",

    async run({ sock, m }) {
        const config = getUrgentConfig()
        const isOpen = isUrgentOpen()
        const mode = getUrgentMode()
        const blacklist = getBlacklistNodes()
        const whitelist = getWhitelistNodes()
        const claimed = getClaimedUUIDs()
        const cloned = getClonedUUIDs()
        const ipAlias = getIpAlias()
        const ipAddress = getIpAddress()

        // Ambil nama node dari list (sudah di-unwrap oleh lib/pterodactyl.js)
        let nodes = []
        try {
            nodes = await getNodes()
        } catch {}

        const getNodeName = (id) => {
            const node = nodes.find((n) => String(n.id ?? n.attributes?.id) === String(id))
            return node?.name ?? node?.attributes?.name ?? `Node ${id}`
        }

        // Format blacklist
        let blacklistText = ""
        if (blacklist.length === 0) {
            blacklistText = "├ Tidak ada"
        } else {
            blacklistText = blacklist.map((id) => `├ 🛑 ${getNodeName(id)} (${id})`).join("\n")
        }

        // Format whitelist
        let whitelistText = ""
        if (whitelist.length === 0) {
            whitelistText = "├ Semua node boleh (kecuali blacklist)"
        } else {
            whitelistText = whitelist.map((id) => `├ ✅ ${getNodeName(id)} (${id})`).join("\n")
        }

        // Format claimed UUIDs
        let claimedText = ""
        const claimedList = Object.entries(claimed)
        if (claimedList.length === 0) {
            claimedText = "├ Tidak ada UUID yang di-claim"
        } else {
            claimedText = claimedList
                .slice(0, 5) // Max 5 items
                .map(([uuid, info]) => {
                    const date = new Date(info.claimedAt).toLocaleDateString("id-ID")
                    return `├ 📋 ${uuid.substring(0, 12)}... → Server #${info.newServerId}`
                })
                .join("\n")
            if (claimedList.length > 5) {
                claimedText += `\n├ ...dan ${claimedList.length - 5} lagi`
            }
        }

        const text = `
╭─❏ 🚨 *URGENT STATUS*
┃
┃ 📊 *Status:* ${isOpen ? "🟢 DIBUKA" : "🔴 DITUTUP"}
┃ 🎛️ *Mode:* ${mode === "whitelist" ? "⚪ WHITELIST (hanya WL)" : "⚫ BLACKLIST (semua kecuali BL)"}
┃ 🖥️ *Default Node:* ${config.defaultNode ? getNodeName(config.defaultNode) + ` (${config.defaultNode})` : "_Belum diset_"}
┃
┃ ─── 🌐 IP CONFIG ───
┃
┃ 🌐 Alias: ${ipAlias}
┃ 📍 IP: ${ipAddress}
┃
┃ ─── 🛑 BLACKLIST ───
┃
${blacklistText}
┃
┃ ─── ✅ WHITELIST ───
┃
${whitelistText}
┃
┃ ─── 📋 CLAIMED UUIDs ───
┃
${claimedText}
┃
┃ ─── 📈 STATS ───
┃
├ Total UUID di-claim: ${claimedList.length}
├ Server clone tercatat (anti infinite): ${Object.keys(cloned).length}
├ Total blacklist: ${blacklist.length}
├ Total whitelist: ${whitelist.length}
┃
╰───────────────────❏

📝 *Command:*
├ ${global.prefix}openurgent      - Buka sistem
├ ${global.prefix}closeurgent     - Tutup sistem
├ ${global.prefix}nodeto          - Set node target
├ ${global.prefix}setipurgent     - Set IP config
├ ${global.prefix}blnode          - Blacklist node
├ ${global.prefix}wlnode          - Whitelist node
`.trim()

        return m.reply(text)
    }
}
