import sharp from "sharp"
import os from "os"
import { execSync } from "child_process"

const formatBytes = (bytes) => {
    const units = ["B", "KB", "MB", "GB", "TB"]

    let i = 0

    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024
        i++
    }

    return `${bytes.toFixed(1)} ${units[i]}`
}

export default async function System(data = {}) {
    const { latency = "0.00 ms", plugin = 0, mode = "Public" } = data

    const totalRam = os.totalmem()

    const freeRam = os.freemem()

    const usedRam = totalRam - freeRam

    const ramPercent = Number(((usedRam / totalRam) * 100).toFixed(1))

    const cpu = Number(((os.loadavg()[0] / os.cpus().length) * 100).toFixed(1))

    let storage = 0

    try {
        storage = Number(
            execSync("df -h . | tail -1 | awk '{print $5}'")
                .toString()

                .replace("%", "")

                .trim()
        )
    } catch {}

    const uptime = process.uptime()

    const day = Math.floor(uptime / 86400)

    const hour = Math.floor((uptime % 86400) / 3600)

    const minute = Math.floor((uptime % 3600) / 60)

    const runtime = day
        ? `${day}d ${hour}h ${minute}m`
        : hour
          ? `${hour}h ${minute}m`
          : `${minute}m`

    const cpuWidth = Math.max(8, Math.min(580, Math.round(cpu * 5.8)))

    const ramWidth = Math.max(8, Math.min(580, Math.round(ramPercent * 5.8)))

    const storageWidth = Math.max(8, Math.min(580, Math.round(storage * 5.8)))

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1366" height="1000">

<style>

.title{font:700 56px Arial;fill:#fff}
.sub{font:30px Arial;fill:#94A3B8}
.head{font:700 32px Arial;fill:#F8FAFC}
.value{font:700 30px Arial;fill:#E2E8F0}
.footer{font:700 28px Arial;fill:#60A5FA}
.credit{font:26px Arial;fill:#94A3B8}

</style>

<rect width="100%" height="100%" fill="#08111D"/>

<rect x="40" y="35" width="1286" height="170" rx="24" fill="#0F1C2C"/>

<text x="80" y="105" class="title">
Chaeul
</text>

<text x="80" y="150" class="sub">
Linux • NodeJS • Pterodactyl
</text>

<circle cx="1120" cy="110" r="14" fill="#22C55E"/>

<text x="1150" y="120" class="sub">
ONLINE
</text>

<rect x="40" y="240" width="640" height="140" rx="20" fill="#0F1C2C"/>

<text x="70" y="300" class="head">
Latency
</text>

<text x="610" y="300" class="value" text-anchor="end">
${latency}
</text>

<rect x="70" y="330" width="540" height="16" rx="8" fill="#263548"/>

<rect x="70" y="330" width="540" height="16" rx="8" fill="#3B82F6"/>

<rect x="40" y="410" width="640" height="140" rx="20" fill="#0F1C2C"/>

<text x="70" y="470" class="head">
CPU
</text>

<text x="610" y="470" class="value" text-anchor="end">
${cpu}%
</text>

<rect x="70" y="500" width="540" height="16" rx="8" fill="#263548"/>

<rect x="70" y="500" width="${cpuWidth}" height="16" rx="8" fill="#3B82F6"/>

<rect x="40" y="580" width="640" height="140" rx="20" fill="#0F1C2C"/>

<text x="70" y="640" class="head">
RAM
</text>

<text x="610" y="640" class="value" text-anchor="end">
${ramPercent}%
</text>

<rect x="70" y="670" width="540" height="16" rx="8" fill="#263548"/>

<rect x="70" y="670" width="${ramWidth}" height="16" rx="8" fill="#22C55E"/>

<rect x="40" y="750" width="640" height="140" rx="20" fill="#0F1C2C"/>

<text x="70" y="810" class="head">
Storage
</text>

<text x="610" y="810" class="value" text-anchor="end">
${storage}%
</text>

<rect x="70" y="840" width="540" height="16" rx="8" fill="#263548"/>

<rect x="70" y="840" width="${storageWidth}" height="16" rx="8" fill="#FACC15"/>

<rect x="720" y="240" width="606" height="650" rx="20" fill="#0F1C2C"/>

<text x="770" y="320" class="head">
NodeJS
</text>

<text x="1260" y="320" class="value" text-anchor="end">
${process.version}
</text>

<text x="770" y="400" class="head">
Runtime
</text>

<text x="1260" y="400" class="value" text-anchor="end">
${runtime}
</text>

<text x="770" y="480" class="head">
Memory
</text>

<text x="1260" y="480" class="value" text-anchor="end">
${formatBytes(usedRam)} / ${formatBytes(totalRam)}
</text>

<text x="770" y="560" class="head">
Platform
</text>

<text x="1260" y="560" class="value" text-anchor="end">
${os.platform()}
</text>

<text x="770" y="640" class="head">
Mode
</text>

<text x="1260" y="640" class="value" text-anchor="end">
${mode}
</text>

<text x="770" y="720" class="head">
Plugin
</text>

<text x="1260" y="720" class="value" text-anchor="end">
${plugin}
</text>

<text x="770" y="800" class="head">
Version
</text>

<text x="1260" y="800" class="value" text-anchor="end">
${global.version}
</text>

<rect x="40" y="920" width="1286" height="50" rx="16" fill="#0F1C2C"/>

<text x="683" y="952" text-anchor="middle" class="footer">
Powered by Chaeul
</text>

</svg>
`

    const image = await sharp(Buffer.from(svg)).png().toBuffer()

    return {
        image,

        latency,

        runtime,

        ram: `${formatBytes(usedRam)} / ${formatBytes(totalRam)}`,

        ramPercent,

        cpu,

        storage,

        node: process.version,

        platform: os.platform(),

        plugin,

        mode
    }
}
