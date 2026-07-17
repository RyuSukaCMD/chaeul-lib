import fs from "fs"
import path from "path"
import { spawn } from "child_process"

function loadEnv() {
    const files = [process.env.ENV_FILE, path.resolve(process.cwd(), ".env"), path.resolve(process.cwd(), "../.env")].filter(Boolean)
    for (const file of files) {
        try {
            if (!fs.existsSync(file)) continue
            for (let line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
                line = line.trim()
                if (!line || line.startsWith("#")) continue
                const eq = line.indexOf("=")
                if (eq < 0) continue
                const key = line.slice(0, eq).trim()
                let val = line.slice(eq + 1).trim()
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
                if (key && process.env[key] === undefined) process.env[key] = val
            }
        } catch {}
    }
}

function enabled() {
    const v = String(process.env.ABSEN_CRON_ENABLE ?? "true").toLowerCase()
    return !["0", "false", "off", "no"].includes(v)
}

function runCronOnce() {
    loadEnv()
    if (!enabled()) return
    const phpBin = process.env.PHP_BIN || "php"
    const cronPath = path.resolve(process.cwd(), process.env.ABSEN_CRON_PATH || "../cron_absen_expiry.php")
    if (!fs.existsSync(cronPath)) return console.log(`[ABSEN-CRON] File tidak ditemukan: ${cronPath}`)

    const child = spawn(phpBin, [cronPath], { cwd: path.dirname(cronPath), stdio: ["ignore", "pipe", "pipe"] })
    let out = ""
    let err = ""
    child.stdout.on("data", (d) => (out += d.toString()))
    child.stderr.on("data", (d) => (err += d.toString()))
    child.on("close", (code) => {
        const text = (out || err || "").trim()
        if (text) console.log(`[ABSEN-CRON] ${text}`)
        if (code) console.log(`[ABSEN-CRON] exit code ${code}`)
    })
    child.on("error", (e) => console.log(`[ABSEN-CRON] ${e.message}`))
}

export default function startAbsenCron() {
    loadEnv()
    if (!enabled()) return console.log("[ABSEN-CRON] disabled")
    const interval = Number(process.env.ABSEN_CRON_INTERVAL_MS || 5 * 60 * 1000)
    setTimeout(runCronOnce, 15000).unref?.()
    const timer = setInterval(runCronOnce, interval)
    timer.unref?.()
    console.log(`[ABSEN-CRON] aktif tiap ${Math.round(interval / 1000)} detik`)
}
