import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import {
    isConfigured,
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

// ─── Ping Node (TCP connect test) ───
async function pingNode(fqdn, port = 8080, timeout = 8000) {
    return new Promise((resolve) => {
        const socket = new net.Socket()
        let responded = false

        const timer = setTimeout(() => {
            if (!responded) {
                responded = true
                socket.destroy()
                resolve(false)
            }
        }, timeout)

        socket.setTimeout(timeout)

        socket.on("connect", () => {
            if (!responded) {
                responded = true
                clearTimeout(timer)
                socket.destroy()
                resolve(true)
            }
        })

        socket.on("error", () => {
            if (!responded) {
                responded = true
                clearTimeout(timer)
                resolve(false)
            }
        })

        socket.on("timeout", () => {
            if (!responded) {
                responded = true
                socket.destroy()
                resolve(false)
            }
        })

        try {
            socket.connect(port, fqdn)
        } catch {
            if (!responded) {
                responded = true
                resolve(false)
            }
        }
    })
}

// ─── Helper: pastikan array (aman utk array flat & { data: [...] }) ───
function toArr(result) {
    if (Array.isArray(result)) return result
    if (result && Array.isArray(result.data)) return result.data
    return []
}

// Helper: ambil field dari object flat ATAU format { attributes }
function field(obj, key, fallback = undefined) {
    return obj?.[key] ?? obj?.attributes?.[key] ?? fallback
}

// Bangun peta lokasi (location sudah di-unwrap: id, short, long)
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

export default {
    command: ["nodestatus", "nodes", "node", /^nodestatus_detail:.+$/, /^nodestatus_all$/],

    category: "Owner",

    description: "Cek status node Pterodactyl",

    owner: true,

    async run({ sock, m, command, args }) {
        // ─── Handle button click ───
        const rawBody = m.body || ""
        if (rawBody === "nodestatus_all") {
            return await handleShowAllNodes(sock, m)
        }
        if (rawBody.startsWith("nodestatus_detail:")) {
            const nodeId = rawBody.split(":")[1]
            return await handleShowNodeDetail(sock, m, nodeId)
        }

        // ─── Cek konfigurasi ───
        if (!isConfigured()) {
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

        // ─── Loading ───
        await m.reply("⏳ Mengambil data node...")

        try {
            // ─── Ambil data dari API (sudah di-unwrap oleh lib/pterodactyl.js) ───
            const [nodesData, locationsData] = await Promise.all([
                getNodes(),
                getLocations()
            ])

            const nodes = toArr(nodesData)
            const locationMap = buildLocationMap(locationsData)

            if (!nodes.length) {
                return m.reply(
                    card("NODE STATUS", ["❌ Tidak ada node ditemukan."], { emoji: "📭" })
                )
            }

            // ─── Single Node Mode ───
            if (args[0] && args[0] !== "all") {
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

                return await showSingleNode(sock, m, targetNode, locationMap)
            }

            // ─── Multi Node / All Nodes ───
            if (nodes.length === 1) {
                return await showSingleNode(sock, m, nodes[0], locationMap)
            }

            return await showMultiNodeMenu(sock, m, nodes, locationMap)
        } catch (error) {
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
    }
}

// ─── Button Handlers ───

async function handleShowAllNodes(sock, m) {
    if (!isConfigured()) {
        return m.reply(card("PTERODACTYL", ["⚠️ Konfigurasi belum ada."], { emoji: "⚙️" }))
    }

    await m.reply("⏳ Mengambil semua data node...")

    try {
        const nodes = toArr(await getNodes())
        const locationMap = buildLocationMap(await getLocations())

        return m.reply(buildAllNodesText(nodes, locationMap))
    } catch (error) {
        return m.reply(card("ERROR", [`❌ ${error.message}`], { emoji: "❌" }))
    }
}

async function handleShowNodeDetail(sock, m, nodeId) {
    if (!isConfigured()) {
        return m.reply(card("PTERODACTYL", ["⚠️ Konfigurasi belum ada."], { emoji: "⚙️" }))
    }

    await m.reply("⏳ Mengambil detail node...")

    try {
        const nodes = toArr(await getNodes())
        const locationMap = buildLocationMap(await getLocations())

        const node = nodes.find((n) => String(field(n, "id")) === String(nodeId))
        if (!node) {
            return m.reply("❌ Node tidak ditemukan.")
        }

        return await showSingleNode(sock, m, node, locationMap)
    } catch (error) {
        return m.reply(card("ERROR", [`❌ ${error.message}`], { emoji: "❌" }))
    }
}

// ─── Ringkasan semua node ───

function buildAllNodesText(nodes, locationMap) {
    const lines = []
    lines.push(`╭─❏ 📊 *ALL NODES OVERVIEW*`)
    lines.push(`┃`)
    lines.push(`┃ 🌐 Total: ${nodes.length} node`)
    lines.push(`┃`)

    for (const node of nodes) {
        const id = field(node, "id")
        const name = field(node, "name", `Node ${id}`)
        const loc = locationMap[field(node, "location_id")] || `Loc #${field(node, "location_id")}`
        const ram = formatBytes(MB(field(node, "memory", 0)))
        const disk = formatBytes(MB(field(node, "disk", 0)))
        const cpu = Number(field(node, "cpu", 0)) || 0

        lines.push(`┣─❏ 🖥️ *${name}*`)
        lines.push(`┃   📍 ${loc}`)
        lines.push(`┃   🧠 ${ram} RAM`)
        lines.push(`┃   💿 ${disk} Disk`)
        lines.push(`┃   ⚙️  ${cpu}% CPU`)
        lines.push(`┃`)
    }

    lines.push(`╰───────────────────❏`)
    lines.push(``)
    lines.push(`_💡 Ketik ${global.prefix}nodestatus <id> untuk detail_`)

    return lines.join("\n")
}

// ─── Show Single Node (sesuai response API Pterodactyl) ───

async function showSingleNode(sock, m, node, locationMap) {
    const nodeId = field(node, "id")
    const nodeName = field(node, "name", `Node ${nodeId}`)
    const nodeUuid = field(node, "uuid", "-")

    // Ambil servers dan allocations
    const [serversData, allocData] = await Promise.all([
        getNodeServers(nodeId).catch(() => []),
        getNodeAllocations(nodeId).catch(() => [])
    ])

    const servers = toArr(serversData)
    const allocations = toArr(allocData)

    // ─── Data node (memory & disk dalam MB di response Pterodactyl) ───
    const memoryTotal = MB(field(node, "memory", 0))
    const diskTotal = MB(field(node, "disk", 0))
    const cpuTotal = Number(field(node, "cpu", 0)) || 0 // persen (100% = 1 core)

    // Usage dari servers (limits.memory/disk dalam MB)
    const usage = calcNodeUsage(servers)

    // Allocation stats (allocation sudah di-unwrap: port, assigned, dst)
    const totalAllocs = allocations.length
    const usedAllocs = allocations.filter((a) => a.assigned ?? a.attributes?.assigned).length
    const freeAllocs = totalAllocs - usedAllocs

    // Asumsi terpakai = resource yang dialokasikan ke server
    const memoryUsed = (usage.totalMemory || 0) * 1024 * 1024
    const diskUsed = (usage.totalDisk || 0) * 1024 * 1024

    const location = locationMap[field(node, "location_id")] || `Location #${field(node, "location_id")}`
    const memoryBar = formatMemoryBar(memoryUsed, memoryTotal)
    const diskBar = formatDiskBar(diskUsed, diskTotal)

    // ─── PING NODE (auto detect fqdn + port) ───
    let nodeStatus = "⏳ Checking..."
    const fqdn = field(node, "fqdn")
    const daemonPort = Number(field(node, "daemon_listen", 8080)) || 8080

    if (fqdn) {
        const isOnline = await pingNode(fqdn, daemonPort, 7000)
        nodeStatus = isOnline
            ? "🟢 *ONLINE*"
            : "🔴 *OFFLINE*"
    } else {
        nodeStatus = "⚠️ *No FQDN*"
    }

    const text = `
╭─❏ 🖥️ *${nodeName}* (ID: ${nodeId})
┃
┃ ${nodeStatus}
┃ 📍 Lokasi: ${location}
┃ 🌐 UUID: ${nodeUuid}
┃
┃ ─── 💾 Resource ───
┃
┃ 🧠 Memory: ${memoryBar}
┃    Total: ${formatBytes(memoryTotal)}
┃    Dialokasikan: ${formatBytes(memoryUsed)}
┃
┃ 💿 Disk: ${diskBar}
┃    Total: ${formatBytes(diskTotal)}
┃    Dialokasikan: ${formatBytes(diskUsed)}
┃
┃ ⚙️ CPU Limit: ${cpuTotal}% (${cpuTotal / 100} Core)
┃    Overcommit: ${field(node, "cpu_overallocate", 0)}%
┃
┃ ─── 🖧 Network ───
┃
┃ 📦 Upload Limit: ${field(node, "upload_size", "Unlimited")} MB/s
┃ 🔌 Daemon Port: ${daemonPort}
┃ 📁 Daemon Path: ${field(node, "daemon_base", "/var/lib/pterodactyl/volumes")}
┃
┃ ─── 📡 Allocation ───
┃
┃ 🟢 Total: ${totalAllocs}
┃ 🟡 Used: ${usedAllocs}
┃ ⚪ Free: ${freeAllocs}
┃
┃ ─── 🏠 Server ───
┃
┃ 📊 Total Server: ${servers.length}
┃
╰───────────────────❏

_💡 Detail node lain: ${global.prefix}nodestatus <id>_
`.trim()

    return m.reply(text)
}

// ─── Show Multi Node Menu ───

async function showMultiNodeMenu(sock, m, nodes, locationMap) {
    const rows = nodes.map((node) => {
        const id = field(node, "id")
        const name = field(node, "name", `Node ${id}`)
        const location = locationMap[field(node, "location_id")] || `Loc #${field(node, "location_id")}`
        const ram = formatBytes(MB(field(node, "memory", 0)))
        const disk = formatBytes(MB(field(node, "disk", 0)))
        const cpu = Number(field(node, "cpu", 0)) || 0

        return {
            title: `🖥️ ${name}`,
            description: `${location} • ${ram} RAM • ${disk} Disk • ${cpu}% CPU`,
            id: `nodestatus_detail:${id}`
        }
    })

    rows.push({
        title: "📊 Tampilkan Semua",
        description: `Lihat ringkasan semua ${nodes.length} node`,
        id: "nodestatus_all"
    })

    await Button.menu({
        sock,
        m,
        body: card(
            "PTERODACTYL NODES",
            [
                `🌐 Total Node: *${nodes.length}*`,
                ``,
                `Pilih node untuk melihat detail.`
            ],
            { emoji: "🖥️" }
        ),
        footer: "© Chaeul",
        lock: m.sender,
        sections: [
            {
                title: "✦ NODE LIST",
                rows
            }
        ]
    })
}

// ─── Button Handler ───
export async function handleNodeButton(sock, m, buttonId) {
    if (buttonId === "nodestatus_all") {
        const nodes = toArr(await getNodes())
        const locationMap = buildLocationMap(await getLocations())

        return m.reply(buildAllNodesText(nodes, locationMap))
    }

    if (buttonId.startsWith("nodestatus_detail:")) {
        const nodeId = buttonId.split(":")[1]
        const nodes = toArr(await getNodes())
        const locationMap = buildLocationMap(await getLocations())

        const node = nodes.find((n) => String(field(n, "id")) === String(nodeId))
        if (!node) {
            return m.reply("❌ Node tidak ditemukan.")
        }

        return await showSingleNode(sock, m, node, locationMap)
    }

    return null
}
