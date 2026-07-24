import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import {
    isConfigured,
    getConfig,
    getNodes,
    getLocations,
    getNodeServers,
    getNodeAllocations,
    formatBytes,
    formatMemoryBar,
    formatDiskBar,
    calcNodeUsage
} from "../../lib/pterodactyl.js"
import net from "net"

// ─── Ping Node (TCP connect test ke daemon/wings) ───
async function pingNode(fqdn, port = 8080, timeout = 8000) {
    return new Promise((resolve) => {
        const socket = new net.Socket()
        let responded = false

        const done = (result) => {
            if (!responded) {
                responded = true
                clearTimeout(timer)
                socket.destroy()
                resolve(result)
            }
        }

        const timer = setTimeout(() => done(false), timeout)
        socket.setTimeout(timeout)
        socket.on("connect", () => done(true))
        socket.on("error", () => done(false))
        socket.on("timeout", () => done(false))

        try {
            socket.connect(port, fqdn)
        } catch {
            done(false)
        }
    })
}

// ─── Helper data (response sudah di-unwrap oleh lib/pterodactyl.js) ───
function toArr(result) {
    if (Array.isArray(result)) return result
    if (result && Array.isArray(result.data)) return result.data
    return []
}

function field(obj, key, fallback = undefined) {
    return obj?.[key] ?? obj?.attributes?.[key] ?? fallback
}

function buildLocationMap(locations) {
    const map = {}
    for (const loc of toArr(locations)) {
        const id = field(loc, "id")
        map[id] = field(loc, "short") || field(loc, "long") || field(loc, "name") || `Loc ${id}`
    }
    return map
}

// Pterodactyl menyimpan memory & disk node dalam MB → konversi ke bytes
const MB = (mb) => (Number(mb) || 0) * 1024 * 1024

function timeWIB() {
    return (
        new Date().toLocaleTimeString("id-ID", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        }) + " WIB"
    )
}

// ─── Helper tombol ───
async function sendInteractive({ sock, m, body, buttons = [], sections = [] }) {
    const { url } = getConfig()
    const allButtons = [...buttons]
    if (url && !allButtons.some((b) => b.type === "url")) {
        allButtons.push({ type: "url", text: "🌐 Buka Panel", url })
    }

    return Button.menu({
        sock,
        m,
        body,
        footer: "© Chaeul",
        lock: m.sender,
        buttons: allButtons,
        sections
    })
}

function notConfiguredReply(m) {
    return m.reply(
        card(
            "PTERODACTYL",
            [
                "⚠️ Konfigurasi Pterodactyl belum ada.",
                "",
                "Gunakan command berikut untuk mengatur:",
                "",
                `${global.prefix}setpterodactyl <url> <api_key>`,
                "",
                "Contoh:",
                `${global.prefix}setpterodactyl https://panel.example.com ptsecret-xxxxx`
            ],
            { emoji: "⚙️" }
        )
    )
}

function errorReply(m, error) {
    console.error("[NodeStatus Error]", error)
    return m.reply(
        card(
            "ERROR",
            [
                `❌ Gagal mengambil data node.`,
                "",
                `*Error:* ${error.message || "Unknown error"}`,
                "",
                "Pastikan:",
                "• URL panel benar",
                "• API key valid (admin key)",
                "• Panel bisa diakses"
            ],
            { emoji: "❌" }
        )
    )
}

export default {
    command: [
        "nodestatus",
        "nodes",
        "node",
        /^nodestatus_all$/,
        /^nodestatus_list$/,
        /^nodestatus_detail:\d+$/,
        /^nodestatus_refresh:\d+$/,
        /^nodestatus_servers:\d+$/
    ],

    category: "Owner",

    description: "Cek status node Pterodactyl",

    owner: true,

    async run({ sock, m, command, args }) {
        // ─── Router button click ───
        const rawBody = String(m.body || "").replace(/​#lock=\d+$/, "").trim()
        const sepIdx = rawBody.indexOf(":")
        const action = sepIdx === -1 ? rawBody : rawBody.slice(0, sepIdx)
        const param = sepIdx === -1 ? null : rawBody.slice(sepIdx + 1)

        if (action === "nodestatus_all") return await viewAllNodes(sock, m)
        if (action === "nodestatus_list") return await viewNodeList(sock, m)
        if (action === "nodestatus_detail" || action === "nodestatus_refresh") {
            return await viewNodeById(sock, m, param, action === "nodestatus_refresh")
        }
        if (action === "nodestatus_servers") return await viewNodeServers(sock, m, param)

        // ─── Cek konfigurasi ───
        if (!isConfigured()) return notConfiguredReply(m)

        await m.reply("⏳ Mengambil data node...")

        try {
            const nodes = await getNodes()

            if (!nodes.length) {
                return m.reply(
                    card("NODE STATUS", ["❌ Tidak ada node ditemukan."], { emoji: "📭" })
                )
            }

            // ─── .nodestatus all ───
            if (args[0] === "all") return await viewAllNodes(sock, m, nodes)

            // ─── .nodestatus <id/nama/uuid> ───
            if (args[0]) {
                const query = args.join(" ").toLowerCase()
                const targetNode = nodes.find((n) => {
                    const id = field(n, "id")
                    const name = (field(n, "name", "") || "").toLowerCase()
                    const uuid = (field(n, "uuid", "") || "").toLowerCase()
                    return String(id) === query || name.includes(query) || uuid === query
                })

                if (!targetNode) {
                    return m.reply(
                        card(
                            "NODE NOT FOUND",
                            [`Tidak ada node dengan: *${args.join(" ")}*`],
                            { emoji: "🔍" }
                        )
                    )
                }

                return await viewSingleNode(sock, m, targetNode)
            }

            // ─── Tanpa argumen ───
            if (nodes.length === 1) return await viewSingleNode(sock, m, nodes[0])
            return await viewNodeList(sock, m, nodes)
        } catch (error) {
            return errorReply(m, error)
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// VIEW: Daftar Node (list menu interaktif)
// ═══════════════════════════════════════════════════════════════
async function viewNodeList(sock, m, prefetched = null) {
    if (!isConfigured()) return notConfiguredReply(m)

    try {
        const nodes = prefetched || (await getNodes())
        if (!nodes.length) {
            return m.reply(card("NODE STATUS", ["❌ Tidak ada node ditemukan."], { emoji: "📭" }))
        }

        const locationMap = buildLocationMap(await getLocations())
        const serverCounts = await getServerCountMap(nodes)

        const rows = nodes.map((node) => {
            const id = field(node, "id")
            const name = field(node, "name", `Node ${id}`)
            const location = locationMap[field(node, "location_id")] || `Loc #${field(node, "location_id")}`
            const ram = formatBytes(MB(field(node, "memory", 0)))
            const disk = formatBytes(MB(field(node, "disk", 0)))
            const srvCount = serverCounts[String(id)] ?? 0
            const maintenance = field(node, "maintenance_mode", false)
            const dot = maintenance ? "🟡" : "🖥️"

            return {
                title: `${dot} ${name}`,
                description: `${location} • ${srvCount} server • ${ram} RAM • ${disk} Disk`,
                id: `nodestatus_detail:${id}`
            }
        })

        rows.push({
            title: "📊 Ringkasan Semua Node",
            description: `Total ${nodes.length} node — lihat ringkasan`,
            id: "nodestatus_all"
        })

        return await sendInteractive({
            sock,
            m,
            body: card(
                "PTERODACTYL NODES",
                [
                    `🌐 Total Node: *${nodes.length}*`,
                    `🖥️ Total Server: *${Object.values(serverCounts).reduce((a, b) => a + b, 0)}*`,
                    ``,
                    `Pilih node untuk melihat detail:`,
                    ``,
                    `_🟡 = maintenance mode_`
                ],
                { emoji: "🖥️" }
            ),
            buttons: [{ type: "quick", text: "📊 Semua Node", id: "nodestatus_all" }],
            sections: [{ title: "✦ NODE LIST", rows }]
        })
    } catch (error) {
        return errorReply(m, error)
    }
}

// ═══════════════════════════════════════════════════════════════
// VIEW: Ringkasan semua node (total server per node bekerja)
// ═══════════════════════════════════════════════════════════════
async function viewAllNodes(sock, m, prefetched = null) {
    if (!isConfigured()) return notConfiguredReply(m)

    await m.reply("⏳ Mengambil ringkasan semua node...")

    try {
        const nodes = prefetched || (await getNodes())
        if (!nodes.length) {
            return m.reply(card("NODE STATUS", ["❌ Tidak ada node ditemukan."], { emoji: "📭" }))
        }

        const locationMap = buildLocationMap(await getLocations())
        const serverCounts = await getServerCountMap(nodes)
        const totalServers = Object.values(serverCounts).reduce((a, b) => a + b, 0)

        const lines = []
        lines.push(`╭─❏ 📊 *SEMUA NODE*`)
        lines.push(`┃`)
        lines.push(`┃ 🌐 Node: *${nodes.length}*  •  🖥️ Server: *${totalServers}*`)
        lines.push(`┃ 🕒 ${timeWIB()}`)
        lines.push(`┃`)

        for (const node of nodes) {
            const id = field(node, "id")
            const name = field(node, "name", `Node ${id}`)
            const loc = locationMap[field(node, "location_id")] || `Loc #${field(node, "location_id")}`
            const ram = formatBytes(MB(field(node, "memory", 0)))
            const disk = formatBytes(MB(field(node, "disk", 0)))
            const cpu = Number(field(node, "cpu", 0)) || 0
            const srvCount = serverCounts[String(id)] ?? 0
            const maintenance = field(node, "maintenance_mode", false)
            const dot = maintenance ? "🟡" : "🟢"

            lines.push(`┣─❏ ${dot} *${name}* (#${id})${maintenance ? " _maintenance_" : ""}`)
            lines.push(`┃   📍 ${loc}  •  🖥️ ${srvCount} server`)
            lines.push(`┃   🧠 ${ram}  •  💿 ${disk}`)
            lines.push(`┃   ⚙️ ${cpu}% CPU`)
            lines.push(`┃`)
        }

        lines.push(`╰───────────────────❏`)
        lines.push(``)
        lines.push(`_💡 Detail: ${global.prefix}nodestatus <id>_`)

        return await sendInteractive({
            sock,
            m,
            body: lines.join("\n"),
            buttons: [
                { type: "quick", text: "🔄 Refresh", id: "nodestatus_all" },
                { type: "quick", text: "📋 Daftar Node", id: "nodestatus_list" }
            ]
        })
    } catch (error) {
        return errorReply(m, error)
    }
}

// ═══════════════════════════════════════════════════════════════
// VIEW: Detail satu node (dengan tombol Cek Server Lagi, dll)
// ═══════════════════════════════════════════════════════════════
async function viewNodeById(sock, m, nodeId, isRefresh = false) {
    if (!isConfigured()) return notConfiguredReply(m)

    await m.reply(isRefresh ? "🔄 Mengecek ulang node..." : "⏳ Mengambil detail node...")

    try {
        const nodes = await getNodes()
        const node = nodes.find((n) => String(field(n, "id")) === String(nodeId))
        if (!node) {
            return m.reply(card("NODE NOT FOUND", [`❌ Node #${nodeId} tidak ditemukan.`], { emoji: "🔍" }))
        }
        return await viewSingleNode(sock, m, node)
    } catch (error) {
        return errorReply(m, error)
    }
}

async function viewSingleNode(sock, m, node) {
    try {
        const nodeId = field(node, "id")
        const nodeName = field(node, "name", `Node ${nodeId}`)
        const nodeUuid = field(node, "uuid", "-")
        const maintenance = field(node, "maintenance_mode", false)

        const [serversData, allocData, locations] = await Promise.all([
            getNodeServers(nodeId).catch(() => []),
            getNodeAllocations(nodeId).catch(() => []),
            getLocations().catch(() => [])
        ])

        const servers = toArr(serversData)
        const allocations = toArr(allocData)
        const locationMap = buildLocationMap(locations)

        // ─── Resource node (memory & disk dalam MB sesuai response API) ───
        const memoryTotal = MB(field(node, "memory", 0))
        const diskTotal = MB(field(node, "disk", 0))
        const cpuTotal = Number(field(node, "cpu", 0)) || 0

        const usage = calcNodeUsage(servers)
        const memoryUsed = (usage.totalMemory || 0) * 1024 * 1024
        const diskUsed = (usage.totalDisk || 0) * 1024 * 1024

        const totalAllocs = allocations.length
        const usedAllocs = allocations.filter((a) => a.assigned ?? a.attributes?.assigned).length
        const freeAllocs = totalAllocs - usedAllocs

        const location = locationMap[field(node, "location_id")] || `Location #${field(node, "location_id")}`
        const memoryBar = formatMemoryBar(memoryUsed, memoryTotal)
        const diskBar = formatDiskBar(diskUsed, diskTotal)

        // ─── PING wings (TCP ke fqdn:daemon_listen) ───
        let nodeStatus = "⏳ Checking..."
        const fqdn = field(node, "fqdn")
        const daemonPort = Number(field(node, "daemon_listen", 8080)) || 8080

        if (fqdn) {
            const isOnline = await pingNode(fqdn, daemonPort, 7000)
            nodeStatus = isOnline ? "🟢 *ONLINE*" : "🔴 *OFFLINE*"
        } else {
            nodeStatus = "⚠️ *No FQDN*"
        }
        if (maintenance) nodeStatus += " • 🟡 *MAINTENANCE*"

        const lines = []
        lines.push(`╭─❏ 🖥️ *${nodeName}* (#${nodeId})`)
        lines.push(`┃`)
        lines.push(`┃ ${nodeStatus}`)
        lines.push(`┃ 📍 ${location}  •  🕒 ${timeWIB()}`)
        lines.push(`┃ 🌐 UUID: ${nodeUuid}`)
        lines.push(`┃`)
        lines.push(`┃ ─── 💾 Resource ───`)
        lines.push(`┃`)
        lines.push(`┃ 🧠 Memory: ${memoryBar}`)
        lines.push(`┃    Total: ${formatBytes(memoryTotal)}  •  Alokasi: ${formatBytes(memoryUsed)}`)
        lines.push(`┃`)
        lines.push(`┃ 💿 Disk: ${diskBar}`)
        lines.push(`┃    Total: ${formatBytes(diskTotal)}  •  Alokasi: ${formatBytes(diskUsed)}`)
        lines.push(`┃`)
        lines.push(`┃ ⚙️ CPU Limit: ${cpuTotal}% (${cpuTotal / 100} Core)  •  OC: ${field(node, "cpu_overallocate", 0)}%`)
        lines.push(`┃`)
        lines.push(`┃ ─── 🖧 Network ───`)
        lines.push(`┃`)
        lines.push(`┃ 📦 Upload: ${field(node, "upload_size", "∞")} MB/s  •  🔌 Port: ${daemonPort}`)
        lines.push(`┃ 📁 ${field(node, "daemon_base", "/var/lib/pterodactyl/volumes")}`)
        lines.push(`┃`)
        lines.push(`┃ ─── 📡 Allocation ───`)
        lines.push(`┃`)
        lines.push(`┃ 🟢 Total: ${totalAllocs}  •  🟡 Used: ${usedAllocs}  •  ⚪ Free: ${freeAllocs}`)
        lines.push(`┃`)
        lines.push(`┃ ─── 🏠 Server ───`)
        lines.push(`┃`)
        lines.push(`┃ 📊 Total Server: *${servers.length}*`)
        lines.push(`┃`)
        lines.push(`╰───────────────────❏`)

        return await sendInteractive({
            sock,
            m,
            body: lines.join("\n"),
            buttons: [
                { type: "quick", text: "🔄 Cek Server Lagi", id: `nodestatus_refresh:${nodeId}` },
                { type: "quick", text: "🖥️ Lihat Server", id: `nodestatus_servers:${nodeId}` },
                { type: "quick", text: "📋 Daftar Node", id: "nodestatus_list" }
            ]
        })
    } catch (error) {
        return errorReply(m, error)
    }
}

// ═══════════════════════════════════════════════════════════════
// VIEW: Daftar server pada satu node
// ═══════════════════════════════════════════════════════════════
async function viewNodeServers(sock, m, nodeId) {
    if (!isConfigured()) return notConfiguredReply(m)

    await m.reply("⏳ Mengambil daftar server...")

    try {
        const [nodes, serversData] = await Promise.all([
            getNodes(),
            getNodeServers(nodeId).catch(() => [])
        ])

        const node = nodes.find((n) => String(field(n, "id")) === String(nodeId))
        if (!node) {
            return m.reply(card("NODE NOT FOUND", [`❌ Node #${nodeId} tidak ditemukan.`], { emoji: "🔍" }))
        }

        const servers = toArr(serversData)
        const nodeName = field(node, "name", `Node ${nodeId}`)

        const lines = []
        lines.push(`╭─❏ 🖥️ *SERVER @ ${nodeName}*`)
        lines.push(`┃`)
        lines.push(`┃ 📊 Total: *${servers.length}* server  •  🕒 ${timeWIB()}`)
        lines.push(`┃`)

        const MAX_SHOW = 20
        for (const srv of servers.slice(0, MAX_SHOW)) {
            const sid = field(srv, "id")
            const sname = field(srv, "name", "-")
            const identifier = field(srv, "identifier", String(field(srv, "uuid", "-")).slice(0, 8))
            const suspended = field(srv, "suspended", false)
            const limits = srv?.limits || srv?.attributes?.limits || {}
            const dot = suspended ? "🔴" : "🟢"

            lines.push(`┣─❏ ${dot} *${sname}* (#${sid})${suspended ? " _suspended_" : ""}`)
            lines.push(`┃   🆔 ${identifier}  •  🧠 ${limits.memory ?? 0} MB  •  💿 ${limits.disk ?? 0} MB  •  ⚙️ ${limits.cpu ?? 0}%`)
        }

        if (servers.length === 0) {
            lines.push(`┃ _Tidak ada server di node ini._`)
        } else if (servers.length > MAX_SHOW) {
            lines.push(`┃ _...dan ${servers.length - MAX_SHOW} server lainnya_`)
        }

        lines.push(`┃`)
        lines.push(`╰───────────────────❏`)

        return await sendInteractive({
            sock,
            m,
            body: lines.join("\n"),
            buttons: [
                { type: "quick", text: "🔄 Refresh", id: `nodestatus_servers:${nodeId}` },
                { type: "quick", text: "⬅️ Detail Node", id: `nodestatus_detail:${nodeId}` },
                { type: "quick", text: "📋 Daftar Node", id: "nodestatus_list" }
            ]
        })
    } catch (error) {
        return errorReply(m, error)
    }
}

// ─── Hitung jumlah server per node (paralel, tahan error) ───
async function getServerCountMap(nodes) {
    const entries = await Promise.all(
        nodes.map(async (node) => {
            const id = field(node, "id")
            const servers = await getNodeServers(id).catch(() => [])
            return [String(id), servers.length]
        })
    )
    return Object.fromEntries(entries)
}
