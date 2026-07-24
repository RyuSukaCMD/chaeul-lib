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
    formatCpuBar,
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
            // ─── Ambil data dari API ───
            const [nodesData, locationsData] = await Promise.all([
                getNodes(),
                getLocations()
            ])

            const nodes = nodesData?.data || nodesData || []
            const locations = locationsData?.data || locationsData || []

            if (!nodes.length) {
                return m.reply(
                    card("NODE STATUS", ["❌ Tidak ada node ditemukan."], { emoji: "📭" })
                )
            }

            // ─── Build location map ───
            const locationMap = {}
            for (const loc of locations) {
                locationMap[loc.id] = loc.short || loc.name || `Loc ${loc.id}`
            }

            // ─── Single Node Mode ───
            if (args[0] && args[0] !== "all") {
                const query = args.join(" ").toLowerCase()
                const targetNode = nodes.find(
                    (n) =>
                        String(n.id) === query ||
                        n.name.toLowerCase().includes(query) ||
                        n.uuid === query
                )

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
        const nodes = await getNodes()
        const locations = await getLocations()

        const locationMap = {}
        for (const loc of locations) {
            locationMap[loc.id] = loc.short || loc.name || `Loc ${loc.id}`
        }

        let text = `╭─❏ 📊 *ALL NODES OVERVIEW*\\n┃\\n┃ 🌐 Total: ${nodes.length} node\\n┃\\n`

        for (const node of nodes) {
            const loc = locationMap[node.location_id] || `Loc #${node.location_id}`
            text += `┣─❏ 🖥️ *${node.name}*\\n`
            text += `┃   📍 ${loc}\\n`
            text += `┃   🧠 ${formatBytes((node.memory || 0) * 1024 * 1024)} RAM\\n`
            text += `┃   💿 ${formatBytes((node.disk || 0) * 1024 * 1024 * 1024)} Disk\\n`
            text += `┃   ⚙️  ${node.cpu} Cores\\n`
            text += `┃\\n`
        }

        text += `╰───────────────────❏\\n\\n_💡 Ketik ${global.prefix}nodestatus <id> untuk detail_`

        return m.reply(text)
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
        const nodes = await getNodes()
        const locations = await getLocations()

        const locationMap = {}
        for (const loc of locations) {
            locationMap[loc.id] = loc.short || loc.name || `Loc ${loc.id}`
        }

        const node = nodes.find((n) => String(n.id) === String(nodeId))
        if (!node) {
            return m.reply("❌ Node tidak ditemukan.")
        }

        return await showSingleNode(sock, m, node, locationMap)
    } catch (error) {
        return m.reply(card("ERROR", [`❌ ${error.message}`], { emoji: "❌" }))
    }
}

// ─── Show Single Node (UPDATED - matches your API response) ───

async function showSingleNode(sock, m, node, locationMap) {
    const nodeId = node.id
    const nodeName = node.name
    const nodeUuid = node.uuid

    // Ambil servers dan allocations
    const [serversData, allocData] = await Promise.all([
        getNodeServers(nodeId).catch(() => ({ data: [] })),
        getNodeAllocations(nodeId).catch(() => ({ data: [] }))
    ])

    const servers = serversData?.data || serversData || []
    const allocations = allocData?.data || allocData || []

    // ─── Parse node dari API response (sesuai contoh yang kamu kasih) ───
    const memoryTotal = (node.memory || 0) * 1024 * 1024
    const diskTotal = (node.disk || 0) * 1024 * 1024 * 1024
    const cpuTotal = node.cpu || 0

    // Usage dari servers
    const usage = calcNodeUsage(servers)

    // Allocation stats
    const totalAllocs = allocations.length
    const usedAllocs = allocations.filter((a) => a.attributes?.assigned).length
    const freeAllocs = totalAllocs - usedAllocs

    const memoryUsed = usage.usedMemory * 1024 * 1024
    const diskUsed = usage.usedDisk * 1024 * 1024 * 1024

    const location = locationMap[node.location_id] || `Location #${node.location_id}`
    const memoryBar = formatMemoryBar(memoryUsed, memoryTotal)
    const diskBar = formatDiskBar(diskUsed, diskTotal)

    // ─── PING NODE (auto detect fqdn + port) ───
    let nodeStatus = "⏳ Checking..."
    const fqdn = node.fqdn || node.attributes?.fqdn
    const daemonPort = node.daemon_listen || node.attributes?.daemon_listen || 8080

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
┃    Dialokasikan: ${formatBytes(usage.totalMemory * 1024 * 1024)}
┃
┃ 💿 Disk: ${diskBar}
┃    Total: ${formatBytes(diskTotal)}
┃    Dialokasikan: ${formatBytes(usage.totalDisk * 1024 * 1024 * 1024)}
┃
┃ ⚙️ CPU: ${cpuTotal} Cores
┃    Overcommit: ${node.cpu_overallocate || node.attributes?.cpu_overallocate || 0}%
┃
┃ ─── 🖧 Network ───
┃
┃ 📦 Upload Limit: ${node.upload_size || node.attributes?.upload_size || "Unlimited"} MB/s
┃ 🔌 Daemon Port: ${daemonPort}
┃ 📁 Daemon Path: ${node.daemon_base || node.attributes?.daemon_base || "/var/lib/pterodactyl/volumes"}
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

_💡 Detail server: ${global.prefix}nodestatus ${nodeId}_
`.trim()

    return m.reply(text)
}

// ─── Show Multi Node Menu ───

async function showMultiNodeMenu(sock, m, nodes, locationMap) {
    const rows = nodes.map((node) => {
        const location = locationMap[node.location_id] || `Loc #${node.location_id}`
        const memoryTotal = formatBytes((node.memory || 0) * 1024 * 1024)
        const diskTotal = formatBytes((node.disk || 0) * 1024 * 1024 * 1024)

        return {
            title: `🖥️ ${node.name}`,
            description: `${location} • ${node.memory}MB RAM • ${node.disk}GB Disk • ${node.cpu}C CPU`,
            id: `nodestatus_detail:${node.id}`
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
        const nodes = await getNodes()
        const locations = await getLocations()

        const locationMap = {}
        for (const loc of locations) {
            locationMap[loc.id] = loc.short || loc.name || `Loc ${loc.id}`
        }

        let text = `╭─❏ 📊 *ALL NODES OVERVIEW*\\n┃\\n┃ 🌐 Total: ${nodes.length} node\\n┃\\n`

        for (const node of nodes) {
            const loc = locationMap[node.location_id] || `Loc #${node.location_id}`
            text += `┣─❏ 🖥️ *${node.name}*\\n`
            text += `┃   📍 ${loc}\\n`
            text += `┃   🧠 ${formatBytes((node.memory || 0) * 1024 * 1024)} RAM\\n`
            text += `┃   💿 ${formatBytes((node.disk || 0) * 1024 * 1024 * 1024)} Disk\\n`
            text += `┃   ⚙️  ${node.cpu} Cores\\n`
            text += `┃\\n`
        }

        text += `╰───────────────────❏\\n\\n_💡 Ketik .nodestatus <id> untuk detail_`

        return m.reply(text)
    }

    if (buttonId.startsWith("nodestatus_detail:")) {
        const nodeId = buttonId.split(":")[1]
        const nodes = await getNodes()
        const locations = await getLocations()

        const locationMap = {}
        for (const loc of locations) {
            locationMap[loc.id] = loc.short || loc.name || `Loc ${loc.id}`
        }

        const node = nodes.find((n) => String(n.id) === String(nodeId))
        if (!node) {
            return m.reply("❌ Node tidak ditemukan.")
        }

        return await showSingleNode(sock, m, node, locationMap)
    }

    return null
}