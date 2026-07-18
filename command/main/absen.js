import fs from "fs"
import path from "path"
import { spawn } from "child_process"
import { fileURLToPath } from "url"
import Button from "../../lib/button.js"

// .absen NexHost
// Bot jalan di: /root/nexhost-bot/chaeul
// PHP absen ada di: /root/nexhost-bot/wa_absen.php (default dari bot: ../wa_absen.php)
// Config dibaca dari .env, bukan config.js.

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const BOT_ROOT = path.resolve(__dirname, "../..")

export default {
    command: ["absen", "attendance", /^absen_(do|status):(\d+)$/],
    category: "Main",
    description: "Absen harian hosting NexHost",
    free: true,

    async run({ sock, m, command }) {
        loadEnv()
        const number = userNumber(m)
        const username = m.pushName || m.name || number

        const btn = String(command).match(/^absen_(do|status):(\d+)$/)
        if (btn) {
            const [, action, ownerNumber] = btn
            if (ownerNumber !== number) return
            if (action === "do") return doAbsenFlow(m, number, username)
            return showStatus(m, number)
        }

        return showPanel(sock, m, number, username)
    }
}

function resolveFromBotRoot(p) {
    if (!p) return ""
    return path.isAbsolute(p) ? p : path.resolve(BOT_ROOT, p)
}

function loadEnv() {
    const files = [
        process.env.ENV_FILE,
        path.resolve(BOT_ROOT, ".env"),
        path.resolve(BOT_ROOT, "../.env"),
        path.resolve(process.cwd(), ".env")
    ].filter(Boolean)

    for (const file of files) {
        try {
            const envFile = path.isAbsolute(file) ? file : resolveFromBotRoot(file)
            if (!fs.existsSync(envFile)) continue
            const lines = fs.readFileSync(envFile, "utf8").split(/\r?\n/)
            for (let line of lines) {
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

function env(name, fallback = "") {
    return process.env[name] || fallback
}

function cfg() {
    const mode = env("ABSEN_API_MODE", "local").toLowerCase() // local | http | auto
    const configuredPhpPath = resolveFromBotRoot(env("ABSEN_PHP_PATH", env("PHP_FILE", "../wa_absen.php")))
    const phpCandidates = [
        configuredPhpPath,
        path.resolve(BOT_ROOT, "../wa_absen.php"),
        "/root/nexhost-bot/wa_absen.php"
    ].filter(Boolean)
    const phpPath = phpCandidates.find((p) => fs.existsSync(p)) || configuredPhpPath
    const phpBin = env("PHP_BIN", "php")
    const secret = env("API_SECRET", env("WA_BOT_API_SECRET", ""))
    const apiPath = env("API_PATH", "/wa_absen.php")
    let portal = env("PORTAL_URL", env("NEXHOST_WEB_URL", "")).replace(/\/+$/, "")
    const port = env("API_PORT", "")
    if (portal && port) {
        try {
            const u = new URL(portal)
            if (!u.port) u.port = port
            portal = u.toString().replace(/\/+$/, "")
        } catch {}
    }
    return {
        mode,
        phpPath,
        phpCandidates,
        phpBin,
        secret,
        apiPath: apiPath.startsWith("/") ? apiPath : `/${apiPath}`,
        portal
    }
}

function userNumber(m) {
    return String(m.senderNumber || m.sender?.split("@")[0] || "").split(":")[0].replace(/[^0-9]/g, "")
}

function card(title, lines, emoji = "📋") {
    if (!Array.isArray(lines)) lines = [String(lines || "")]
    return `╭━━━〔 ${emoji} ${title} 〕━━━⬣\n` + lines.join("\n") + `\n╰━━━━━━━━━━━━━━━━━━⬣`
}

function formatWIB(sec) {
    if (!sec) return "-"
    const p = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(Number(sec) * 1000))
    const g = (t) => p.find((x) => x.type === t)?.value || ""
    return `${g("day")} ${g("month")} ${g("year")}, ${g("hour")}:${g("minute")} WIB`
}

function remaining(expSec, nowSec) {
    const ms = Math.max(0, (Number(expSec || 0) - Number(nowSec || Math.floor(Date.now() / 1000))) * 1000)
    const totalMin = Math.floor(ms / 60000)
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    return h > 0 ? `${h}j ${m}m` : `${m}m`
}

async function callLocalPhp(payload) {
    const c = cfg()
    if (!fs.existsSync(c.phpPath)) {
        return {
            success: false,
            code: "php_not_found",
            error: `File PHP absen tidak ditemukan: ${c.phpPath}`,
            detail: `Path dicoba: ${c.phpCandidates.join(", ")}. Pastikan repo web sudah di-pull di /root/nexhost-bot dan file /root/nexhost-bot/wa_absen.php ada.`
        }
    }

    return new Promise((resolve) => {
        const child = spawn(c.phpBin, [c.phpPath], { cwd: path.dirname(c.phpPath), stdio: ["pipe", "pipe", "pipe"] })
        let out = ""
        let err = ""
        const timer = setTimeout(() => {
            try { child.kill("SIGKILL") } catch {}
            resolve({ success: false, code: "php_timeout", error: "PHP absen timeout." })
        }, 20000)
        child.stdout.on("data", (d) => (out += d.toString()))
        child.stderr.on("data", (d) => (err += d.toString()))
        child.on("error", (e) => {
            clearTimeout(timer)
            resolve({ success: false, code: "php_error", error: `Gagal menjalankan PHP: ${e.message}`, detail: `PHP_BIN=${c.phpBin}` })
        })
        child.on("close", () => {
            clearTimeout(timer)
            try { resolve(JSON.parse(out.trim())) }
            catch { resolve({ success: false, code: "php_invalid_json", error: "Output PHP tidak valid.", detail: (err || out).slice(0, 500) }) }
        })
        child.stdin.end(JSON.stringify(payload))
    })
}

async function callHttp(payload) {
    const c = cfg()
    if (!c.portal) return { success: false, code: "portal_missing", error: "PORTAL_URL belum diisi di .env." }
    const url = `${c.portal}${c.apiPath}`
    try {
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        const text = await res.text()
        try { return JSON.parse(text) }
        catch { return { success: false, code: "http_invalid_json", error: `Response web bukan JSON dari ${url}`, detail: text.slice(0, 500) } }
    } catch (e) {
        return { success: false, code: "http_error", error: `Gagal request web: ${e.message}` }
    }
}

async function callAbsen(action, phone) {
    loadEnv()
    const c = cfg()
    if (!c.secret) return { success: false, code: "secret_missing", error: "API_SECRET belum diisi di .env." }
    const payload = { secret: c.secret, action, phone }

    if (c.mode === "http") return callHttp(payload)
    if (c.mode === "auto") {
        if (fs.existsSync(c.phpPath)) return callLocalPhp(payload)
        if (String(env("ABSEN_ALLOW_HTTP_FALLBACK", "false")).toLowerCase() === "true") return callHttp(payload)
    }
    return callLocalPhp(payload)
}

function status(res) {
    const record = res?.record || null
    const now = Number(res?.now || Math.floor(Date.now() / 1000))
    const exp = Number(record?.expires_at || res?.expires_at || 0)
    return { record, now, exp, active: !!record && exp > now }
}

async function showPanel(sock, m, number, username) {
    const res = await callAbsen("status", number)
    const st = status(res)
    const lines = [`👤 ${res?.user?.username || username}`, ""]
    if (!res.success) {
        lines.push("❌ " + (res.error || "Gagal cek status absen."))
        if (res.detail) lines.push(String(res.detail))
    } else if (st.active) {
        lines.push("✅ Server kamu masih aman.")
        lines.push(`⏳ Berlaku sampai: ${formatWIB(st.exp)}`)
        lines.push(`Sisa waktu: ${remaining(st.exp, st.now)}`)
        lines.push("", "Absen ulang hanya bisa 1x per hari (WIB).")
    } else {
        lines.push("❌ Belum absen / absen sudah habis.")
        lines.push("Tekan tombol di bawah untuk langsung catat absen.")
    }
    return Button.menu({ sock, m, body: card("ABSEN HARIAN", lines), footer: "© NexHost • Absen via PHP web", buttons: [
        { type: "quick", text: "✅ Absen Sekarang", id: `absen_do:${number}` },
        { type: "quick", text: "📊 Cek Status", id: `absen_status:${number}` }
    ] })
}

async function doAbsenFlow(m, number, username) {
    const res = await callAbsen("absen", number)
    const st = status(res)
    if (!res.success) {
        await m.react(res.code === "already_absen" ? "⚠️" : "❌")
        const lines = [res.error || "Absen gagal."]
        if (st.record) lines.push("", `⏳ Aman sampai: ${formatWIB(st.exp)}`)
        if (res.detail) lines.push(String(res.detail))
        return m.reply(card("ABSEN", lines))
    }
    await m.react("✅")
    return m.reply(card("ABSEN BERHASIL", [`👤 ${res?.user?.username || username}`, "", "✅ Absen berhasil dicatat ke web.", `⏳ Aman sampai: ${formatWIB(st.exp || res.expires_at)}`, "", "Web/cron akan mengurus auto suspend/delete jika absen habis."], "🎉"))
}

async function showStatus(m, number) {
    const res = await callAbsen("status", number)
    const st = status(res)
    if (!res.success) return m.reply(card("STATUS ABSEN", [res.error || "Gagal cek status.", res.detail || ""].filter(Boolean), "📊"))
    if (!st.record) return m.reply(card("STATUS ABSEN", ["Belum ada data absen.", `Ketik ${global.prefix || "."}absen untuk mulai.`], "📊"))
    return m.reply(card("STATUS ABSEN", [`Absen terakhir: ${formatWIB(st.record.last_absen_ts)}`, `Berlaku sampai: ${formatWIB(st.exp)}`, "", st.active ? `✅ AKTIF — sisa ${remaining(st.exp, st.now)}` : "❌ SUDAH HABIS — silakan absen lagi."], "📊"))
}
