import Button from "./button.js"
import { card } from "./ui.js"
import { getNodes, getLocations, getNodeServers, formatBytes } from "./pterodactyl.js"
import {
    getNodesWithStatus,
    getWhitelistNodes,
    getBlacklistNodes,
    getUrgentMode,
    whitelistNode,
    removeWhitelistNode,
    blacklistNode,
    removeBlacklistNode,
    isNodeWhitelisted,
    isNodeBlacklisted
} from "./urgent.js"

// ─── Helpers ───
const MB = (mb) => (Number(mb) || 0) * 1024 * 1024
const fld = (obj, key, fb) => obj?.[key] ?? obj?.attributes?.[key] ?? fb

async function serverCountMap(nodes) {
    const entries = await Promise.all(
        nodes.map(async (n) => {
            const id = String(fld(n, "id"))
            const servers = await getNodeServers(id).catch(() => [])
            return [id, servers.length]
        })
    )
    return Object.fromEntries(entries)
}

async function locationMap() {
    const map = {}
    try {
        for (const loc of await getLocations()) {
            const id = fld(loc, "id")
            map[id] = fld(loc, "short") || fld(loc, "long") || `Loc ${id}`
        }
    } catch {}
    return map
}

const PREFIX = { whitelist: "wlnode", blacklist: "blnode" }

// ─── Kirim picker interaktif berisi SELURUH node ───
// 🟢 = online • 🔴 = offline/maintenance • Description = detail node
export async function sendNodePicker({ sock, m, action }) {
    const prefix = PREFIX[action]
    const [live, locations, wl, bl] = await Promise.all([
        getNodesWithStatus(),
        locationMap(),
        Promise.resolve(getWhitelistNodes()),
        Promise.resolve(getBlacklistNodes())
    ])
    const nodes = live.nodes
    const counts = await serverCountMap(nodes)

    if (!nodes.length) {
        return m.reply(card("NODE LIST", ["❌ Tidak ada node ditemukan."], { emoji: "📭" }))
    }

    const markedList = action === "whitelist" ? wl : bl
    const markedEmoji = action === "whitelist" ? "✅ Whitelisted" : "🛑 Blacklisted"

    const rows = nodes.map((node) => {
        const id = String(fld(node, "id"))
        const name = fld(node, "name", `Node ${id}`)
        const liveInfo = live.status[id] || { online: false, maintenance: false }

        // 🟢/🔴 untuk status on/off (maintenance → 🔴)
        const dot = liveInfo.online ? "🟢" : "🔴"

        const parts = [
            locations[fld(node, "location_id")] || `Loc #${fld(node, "location_id")}`,
            `${counts[id] ?? 0} server`,
            `${formatBytes(MB(fld(node, "memory", 0)))} RAM`,
            `${formatBytes(MB(fld(node, "disk", 0)))} Disk`
        ]
        if (liveInfo.maintenance) parts.push("🛠 maintenance")
        else if (!liveInfo.online) parts.push("offline")
        if (markedList.includes(id)) parts.push(markedEmoji)

        return {
            title: `${dot} ${name}`,
            description: parts.join(" • "),
            id: `${prefix}_pick:${id}`
        }
    })

    const mode = getUrgentMode()
    const title = action === "whitelist" ? "WHITELIST NODE" : "BLACKLIST NODE"
    const extraInfo =
        action === "whitelist"
            ? [
                  `Klik node untuk menambah/menghapus ${action}.`,
                  ``,
                  `_🔴 Node offline/maintenance tidak bisa di-whitelist._`,
                  `_Mode aktif: ${mode === "whitelist" ? "⚪ WHITELIST" : "⚫ BLACKLIST"}_`
              ]
            : [
                  `Klik node untuk menambah/menghapus ${action}.`,
                  ``,
                  `_Mode aktif: ${mode === "whitelist" ? "⚪ WHITELIST" : "⚫ BLACKLIST"}_`,
                  mode === "blacklist"
                      ? `_Mode blacklist: node ter-blacklist tidak bisa di-unblacklist._`
                      : ``
              ]

    return Button.menu({
        sock,
        m,
        body: card(
            title,
            [
                `🌐 Total Node: *${nodes.length}*`,
                `📋 ${action === "whitelist" ? "Whitelisted" : "Blacklisted"}: *${markedList.length}*`,
                ``,
                ...extraInfo.filter(Boolean)
            ],
            { emoji: action === "whitelist" ? "✅" : "🛑" }
        ),
        footer: "© Chaeul",
        lock: m.sender,
        buttons: [
            { type: "quick", text: "🔄 Refresh", id: `${prefix}_list` },
            { type: "quick", text: "🎛️ Mode", id: ".urgentmode" }
        ],
        sections: [{ title: action === "whitelist" ? "✦ PILIH NODE (WHITELIST)" : "✦ PILIH NODE (BLACKLIST)", rows }]
    })
}

// ─── Terapkan aksi pick (klik row / ketik .wlnode <id> / .blnode <id>) ───
export async function applyNodePick({ sock, m, action, nodeId }) {
    const prefix = PREFIX[action]
    const id = String(nodeId)
    const mode = getUrgentMode()

    const reopen = [
        { type: "quick", text: "📋 Daftar Node", id: `${prefix}_list` },
        { type: "quick", text: "🎛️ Mode", id: ".urgentmode" }
    ]

    const replyCard = (title, lines, emoji) =>
        Button.menu({
            sock,
            m,
            body: card(title, lines, { emoji }),
            footer: "© Chaeul",
            lock: m.sender,
            buttons: reopen
        })

    // Ambil node + status live-nya
    const live = await getNodesWithStatus()
    const node = live.nodes.find((n) => String(fld(n, "id")) === id)

    if (!node) {
        return replyCard("NODE NOT FOUND", [`❌ Node dengan ID *${id}* tidak ditemukan.`], "❌")
    }

    const name = fld(node, "name", `Node ${id}`)
    const liveInfo = live.status[id] || { online: false, maintenance: false }
    const statusLine = liveInfo.maintenance
        ? "🔴 Maintenance"
        : liveInfo.online
          ? "🟢 Online"
          : "🔴 Offline"

    if (action === "whitelist") {
        // Toggle: sudah di-whitelist → hapus (selalu boleh)
        if (isNodeWhitelisted(id)) {
            removeWhitelistNode(id)
            return replyCard(
                "WHITELIST REMOVED",
                [`➖ Node *${name}* (ID: ${id}) dihapus dari whitelist.`],
                "➖"
            )
        }

        // ATURAN: node OFF / maintenance TIDAK dapat di-whitelist
        if (!liveInfo.online) {
            return replyCard(
                "TIDAK DAPAT WHITELIST",
                [
                    `🚫 Node *${name}* (ID: ${id}) sedang ${statusLine}.`,
                    ``,
                    `Node *offline/maintenance tidak dapat di-whitelist*.`,
                    `Aktifkan node-nya dulu, baru bisa di-whitelist.`
                ],
                "🚫"
            )
        }

        whitelistNode(id)
        const lines = [
            `✅ Node *${name}* (ID: ${id}) berhasil di-whitelist.`,
            ``,
            `${statusLine}`
        ]
        if (mode !== "whitelist") {
            lines.push(``)
            lines.push(`ℹ️ Mode saat ini *BLACKLIST* — whitelist belum berpengaruh.`)
            lines.push(`_Ubah dengan ${global.prefix}urgentmode whitelist_`)
        }
        return replyCard("✅ WHITELISTED", lines, "✅")
    }

    // ─── blacklist ───
    if (isNodeBlacklisted(id)) {
        // ATURAN: dalam mode blacklist, node TIDAK dapat di-unblacklist
        if (mode === "blacklist") {
            return replyCard(
                "TIDAK DAPAT UNBLACKLIST",
                [
                    `🚫 Node *${name}* (ID: ${id}) sedang di-blacklist.`,
                    ``,
                    `Dalam *mode blacklist*, node yang sudah di-blacklist`,
                    `tidak dapat di-unblacklist.`,
                    ``,
                    `_Ubah mode dengan ${global.prefix}urgentmode whitelist bila ingin mengelola ulang._`
                ],
                "🚫"
            )
        }

        removeBlacklistNode(id)
        return replyCard(
            "BLACKLIST REMOVED",
            [`➖ Node *${name}* (ID: ${id}) dihapus dari blacklist.`],
            "➖"
        )
    }

    blacklistNode(id)
    const lines = [
        `🛑 Node *${name}* (ID: ${id}) berhasil di-blacklist.`,
        ``,
        `Server dari node ini tidak bisa di-claim dengan ${global.prefix}urgent`
    ]
    if (mode === "whitelist") {
        lines.push(``)
        lines.push(`ℹ️ Mode *WHITELIST* aktif — blacklist belum berpengaruh.`)
    }
    return replyCard("✅ BLACKLISTED", lines, "🛑")
}
