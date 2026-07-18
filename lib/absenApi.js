import fs from "fs"
import path from "path"
import { spawn } from "child_process"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const BOT_ROOT = path.resolve(__dirname, "..")

export function resolveFromBotRoot(p) {
    if (!p) return ""
    return path.isAbsolute(p) ? p : path.resolve(BOT_ROOT, p)
}

export function loadEnv() {
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
            for (let line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
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

export function cfg() {
    loadEnv()
    const mode = env("ABSEN_API_MODE", "local").toLowerCase() // local | http | auto
    const configuredPhpPath = resolveFromBotRoot(env("ABSEN_PHP_PATH", env("PHP_FILE", "../wa_absen.php")))
    const phpCandidates = [configuredPhpPath, path.resolve(BOT_ROOT, "../wa_absen.php"), "/root/nexhost-bot/wa_absen.php"].filter(Boolean)
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
    return { mode, phpPath, phpCandidates, phpBin, secret, apiPath: apiPath.startsWith("/") ? apiPath : `/${apiPath}`, portal }
}

async function callLocalPhp(payload) {
    const c = cfg()
    if (!fs.existsSync(c.phpPath)) {
        return {
            success: false,
            code: "php_not_found",
            error: `File PHP absen tidak ditemukan: ${c.phpPath}`,
            detail: `Path dicoba: ${c.phpCandidates.join(", ")}. Pastikan /root/nexhost-bot/wa_absen.php ada.`
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

export async function callAbsen(action, phone) {
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

export function absenStatus(res) {
    const record = res?.record || null
    const now = Number(res?.now || Math.floor(Date.now() / 1000))
    const exp = Number(record?.expires_at || res?.expires_at || 0)
    return { record, now, exp, active: !!record && exp > now, remainingSec: Math.max(0, exp - now) }
}

export function formatWIB(sec) {
    if (!sec) return "-"
    const p = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(Number(sec) * 1000))
    const g = (t) => p.find((x) => x.type === t)?.value || ""
    return `${g("day")} ${g("month")} ${g("year")}, ${g("hour")}:${g("minute")} WIB`
}

export function remaining(expSec, nowSec) {
    const ms = Math.max(0, (Number(expSec || 0) - Number(nowSec || Math.floor(Date.now() / 1000))) * 1000)
    const totalMin = Math.floor(ms / 60000)
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    return h > 0 ? `${h}j ${m}m` : `${m}m`
}

export function serverListText(res) {
    const list = Array.isArray(res?.servers) ? res.servers : res?.server ? [res.server] : []
    if (!list.length) return "-"
    return list
        .map((s, i) => {
            const name = s.name || s.server_name || s.egg_name || s.note || s.ptero_server_id || s.id || `Server ${i + 1}`
            const id = s.ptero_server_id || s.server_id || s.id || ""
            return id && String(name) !== String(id) ? `${name} (${id})` : String(name)
        })
        .join("\n              ")
}

export function userNumber(m) {
    return String(m.senderNumber || m.sender?.split("@")[0] || "").split(":")[0].replace(/[^0-9]/g, "")
}

export default { loadEnv, cfg, callAbsen, absenStatus, formatWIB, remaining, serverListText, userNumber }
