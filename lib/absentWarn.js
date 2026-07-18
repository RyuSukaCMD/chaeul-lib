import { readJSON, writeJSON } from "./db.js"
import { callAbsen, absenStatus, formatWIB, remaining } from "./absenApi.js"

const DB = "./database/absentwarn.json"
const DEFAULT_HOURS = 3
const CHECK_MS = 5 * 60 * 1000
const MIN_REPEAT_MS = 60 * 60 * 1000

let timer = null
let running = false

function db() {
    return readJSON(DB, { groups: [], hours: DEFAULT_HOURS, lastWarn: {} })
}
function save(data) {
    writeJSON(DB, data)
}

export function listAbsentWarnGroups() {
    return db().groups || []
}
export function getAbsentWarnHours() {
    return Number(db().hours || DEFAULT_HOURS)
}
export function addAbsentWarnGroup(jid) {
    const data = db()
    data.groups = Array.from(new Set([...(data.groups || []), jid]))
    if (!data.hours) data.hours = DEFAULT_HOURS
    data.lastWarn ||= {}
    save(data)
    return data
}
export function delAbsentWarnGroup(jid) {
    const data = db()
    data.groups = (data.groups || []).filter((x) => x !== jid)
    data.lastWarn ||= {}
    save(data)
    return data
}
export function setAbsentWarnHours(hours) {
    const data = db()
    data.hours = Math.max(1, Number(hours) || DEFAULT_HOURS)
    data.groups ||= []
    data.lastWarn ||= {}
    save(data)
    return data.hours
}

function jidNumber(x) {
    return String(x?.phoneNumber || x?.id || x || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, "")
}

function participantJid(p, num) {
    return p?.id || p?.jid || `${num}@s.whatsapp.net`
}

function shouldWarn(data, chat, num, exp) {
    const key = `${chat}:${num}:${exp || 0}`
    const now = Date.now()
    const last = Number(data.lastWarn?.[key] || 0)
    if (last && now - last < MIN_REPEAT_MS) return false
    data.lastWarn ||= {}
    data.lastWarn[key] = now
    // bersihkan key lama biar DB kecil
    for (const [k, t] of Object.entries(data.lastWarn)) {
        if (now - Number(t) > 3 * 24 * 3600 * 1000) delete data.lastWarn[k]
    }
    save(data)
    return true
}

export async function runAbsentWarnOnce(sock) {
    if (!sock) return
    const data = db()
    const groups = data.groups || []
    if (!groups.length) return

    const warnSec = Math.max(1, Number(data.hours || DEFAULT_HOURS)) * 3600

    for (const chat of groups) {
        let meta
        try {
            meta = await sock.groupMetadata(chat)
        } catch {
            continue
        }

        const targets = []
        for (const p of meta?.participants || []) {
            const num = jidNumber(p)
            if (!num) continue

            const res = await callAbsen("status", num)
            if (!res?.success) continue

            const st = absenStatus(res)
            if (!st.record) continue
            const remainingSec = st.exp - st.now
            if (remainingSec > warnSec) continue
            if (!shouldWarn(data, chat, num, st.exp)) continue

            targets.push({
                jid: participantJid(p, num),
                num,
                email: res?.user?.email || "-",
                server: res?.server?.ptero_server_id || res?.server?.id || res?.server?.name || "-",
                exp: st.exp,
                expired: remainingSec <= 0,
                rem: remaining(st.exp, st.now)
            })
        }

        if (!targets.length) continue
        const mentions = targets.map((x) => x.jid)
        const lines = ["⚠️ *ABSEN WARNING*", ""]
        for (const t of targets) {
            lines.push(`@${t.num}`)
            lines.push(`Email : ${t.email}`)
            lines.push(`Server : ${t.server}`)
            lines.push(`Expired : ${formatWIB(t.exp)}`)
            lines.push(t.expired ? "Status : ❌ SUDAH EXPIRED" : `Sisa : ${t.rem}`)
            lines.push("")
        }
        lines.push(`Segera ketik *${global.prefix || "."}absen* lalu tekan tombol *Absen Sekarang*.`)
        await sock.sendMessage(chat, { text: lines.join("\n"), mentions }).catch(() => {})
    }
}

export function startAbsentWarn(sock) {
    if (timer) clearInterval(timer)
    timer = setInterval(() => {
        if (running) return
        running = true
        runAbsentWarnOnce(sock).finally(() => (running = false))
    }, CHECK_MS)
    timer.unref?.()
    setTimeout(() => runAbsentWarnOnce(sock).catch(() => {}), 10000).unref?.()
}

export default {
    listAbsentWarnGroups,
    getAbsentWarnHours,
    addAbsentWarnGroup,
    delAbsentWarnGroup,
    setAbsentWarnHours,
    runAbsentWarnOnce,
    startAbsentWarn
}
