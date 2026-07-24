import { readJSON, writeJSON } from "./db.js"
import { getNodesWithStatus } from "./urgent.js"
import { card } from "./ui.js"

// ─── NODE STATUS WARNING ───
// Memantau SELURUH node secara berkala (setiap 5–10 menit) dan mengirim
// notifikasi ke grup yang terdaftar (.nodegbwarn) bila ada PERUBAHAN
// status: online 🟢 / offline 🔴 / maintenance 🟡.
// Node yang masuk blacklist notifier (.blnotif) tetap dilacak statusnya,
// tapi perubahannya TIDAK dikirim sebagai notifikasi.

const DB = "./database/nodewatcher.json"

const MIN_CHECK_MIN = 5 // menit
const MAX_CHECK_MIN = 10 // menit
const FIRST_DELAY = 20 * 1000 // cek pertama 20 detik setelah bot jalan

const ICON = { online: "🟢", offline: "🔴", maintenance: "🟡" }
const LABEL = { online: "ONLINE", offline: "OFFLINE", maintenance: "MAINTENANCE" }

// ─── DB ───
function db() {
    return readJSON(DB, {
        targets: [],          // jid grup tujuan notifikasi
        blacklistNodes: [],   // node id yang di-skip notifikasinya
        lastStatus: {},       // id -> { name, fqdn, state, updatedAt }
        lastCheckAt: null
    })
}

function save(data) {
    writeJSON(DB, data)
}

// ─── Target grup notifikasi ───
export function getWarnTargets() {
    return db().targets || []
}

export function isWarnTarget(jid) {
    return getWarnTargets().includes(String(jid))
}

export function setWarnTarget(jid, by = null) {
    const data = db()
    const target = String(jid)
    if (!data.targets.includes(target)) {
        data.targets.push(target)
        save(data)
        return { added: true, total: data.targets.length }
    }
    return { added: false, total: data.targets.length }
}

export function unsetWarnTarget(jid) {
    const data = db()
    const target = String(jid)
    const before = data.targets.length
    data.targets = data.targets.filter((t) => t !== target)
    save(data)
    return { removed: data.targets.length !== before, total: data.targets.length }
}

// ─── Blacklist node dari notifier (.blnotif) ───
// Node di sini TETAP dicek & dilacak statusnya (baseline benar),
// hanya saja perubahannya tidak dikirim sebagai notifikasi.
export function getNotifBlacklist() {
    return db().blacklistNodes || []
}

export function isNotifBlacklisted(nodeId) {
    return getNotifBlacklist().includes(String(nodeId))
}

export function addNotifBlacklist(nodeId) {
    const data = db()
    const id = String(nodeId)
    if (!data.blacklistNodes.includes(id)) {
        data.blacklistNodes.push(id)
        save(data)
        return { added: true, total: data.blacklistNodes.length }
    }
    return { added: false, total: data.blacklistNodes.length }
}

export function removeNotifBlacklist(nodeId) {
    const data = db()
    const id = String(nodeId)
    const before = data.blacklistNodes.length
    data.blacklistNodes = data.blacklistNodes.filter((n) => n !== id)
    save(data)
    return { removed: data.blacklistNodes.length !== before, total: data.blacklistNodes.length }
}

export function toggleNotifBlacklist(nodeId) {
    return isNotifBlacklisted(nodeId) ? removeNotifBlacklist(nodeId) : addNotifBlacklist(nodeId)
}

// ─── Status terakhir yang diketahui ───
export function getLastStatus() {
    return db().lastStatus || {}
}

export function getWatcherInfo() {
    const data = db()
    return {
        targets: data.targets || [],
        blacklist: data.blacklistNodes || [],
        lastStatus: data.lastStatus || {},
        lastCheckAt: data.lastCheckAt || null,
        nextCheckAt,
        watchRunning: started,
        intervalText: `±${MIN_CHECK_MIN}–${MAX_CHECK_MIN} menit`
    }
}

// ─── Snapshot status seluruh node (online / offline / maintenance) ───
// getNodesWithStatus() mem-ping daemon tiap node; node maintenance
// selalu dihitung maintenance (meski daemon kebetulan merespons).
export async function collectNodeStates(timeout = 3500) {
    const { nodes, status } = await getNodesWithStatus({ timeout })
    const states = {}
    for (const node of nodes) {
        const id = String(node.id ?? node.attributes?.id)
        const name = node.name ?? node.attributes?.name ?? `Node ${id}`
        const fqdn = node.fqdn ?? node.attributes?.fqdn ?? "-"
        const st = status[id] || {}
        states[id] = {
            id,
            name,
            fqdn,
            state: st.maintenance ? "maintenance" : st.online ? "online" : "offline"
        }
    }
    return states
}

// ─── Format pesan perubahan ───
function buildChangeMessage(changes) {
    const time = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
    const lines = ["⚠️ *Terdeteksi perubahan status node!*", ""]
    for (const c of changes) {
        lines.push(`${ICON[c.to]} *${c.name}* (ID: ${c.id})`)
        lines.push(`├ Status: ${ICON[c.from]} ${LABEL[c.from]} → ${ICON[c.to]} ${LABEL[c.to]}`)
        lines.push(`├ FQDN: \`${c.fqdn}\``)
        lines.push("")
    }
    lines.push(`🕒 ${time} WIB`)
    return card("NODE STATUS WARNING", lines, { emoji: "🔔" })
}

// ─── Cek sekali: bandingkan dengan status terakhir, notif bila berubah ───
//  • Node BARU (belum ada di baseline) → dicatat diam-diam (tidak spam).
//  • Node di blacklist notifier → status tetap diperbarui, tapi tidak dinotifkan.
//  Mengembalikan { states, changes, notified, baseline }.
export async function runNodeCheckOnce(sock, { notifyTargets = true } = {}) {
    const data = db()
    const prev = data.lastStatus || {}
    const hadBaseline = Object.keys(prev).length > 0

    const states = await collectNodeStates()

    // Hitung perubahan pada node yang SUDAH dikenal
    const changes = []
    for (const [id, s] of Object.entries(states)) {
        const oldState = prev[id]?.state
        if (!oldState) continue // node baru → baseline, jangan spam
        if (oldState !== s.state) {
            changes.push({ id, name: s.name, fqdn: s.fqdn, from: oldState, to: s.state })
        }
    }

    // Simpan snapshot terbaru (dicatat TERLEPAS dari blacklist)
    data.lastStatus = Object.fromEntries(
        Object.entries(states).map(([id, s]) => [id, { name: s.name, fqdn: s.fqdn, state: s.state, updatedAt: Date.now() }])
    )
    data.lastCheckAt = Date.now()
    save(data)

    // Kirim notifikasi (skip node blacklist & bila tidak ada target)
    const bl = new Set(getNotifBlacklist())
    const toNotify = changes.filter((c) => !bl.has(String(c.id)))
    const targets = getWarnTargets()

    if (notifyTargets && toNotify.length && targets.length && sock) {
        const text = buildChangeMessage(toNotify)
        for (const target of targets) {
            await sock.sendMessage(target, { text }).catch(() => {})
        }
        console.log(`[NodeWatcher] ${toNotify.length} perubahan → notif ke ${targets.length} grup`)
    } else if (changes.length) {
        console.log(`[NodeWatcher] ${changes.length} perubahan (${toNotify.length} dinotifkan, ${changes.length - toNotify.length} blacklist)`)
    }

    return { states, changes, notified: toNotify, targets, baseline: !hadBaseline }
}

// ─── Scheduler 5–10 menit (setTimeout chain, aman dari reload ganda) ───
let started = false
let timer = null
let running = false
let nextCheckAt = null

function randomDelay() {
    return (MIN_CHECK_MIN + Math.random() * (MAX_CHECK_MIN - MIN_CHECK_MIN)) * 60 * 1000
}

export function startNodeWatcher(sock) {
    if (started) return false
    started = true

    const schedule = (ms) => {
        nextCheckAt = Date.now() + ms
        timer = setTimeout(tick, ms)
        timer.unref?.()
    }

    const tick = async () => {
        if (!running) {
            running = true
            try {
                await runNodeCheckOnce(sock)
            } catch (error) {
                console.warn(`[NodeWatcher] cek gagal: ${error.message}`)
            } finally {
                running = false
            }
        }
        schedule(randomDelay())
    }

    schedule(FIRST_DELAY)
    console.log(`[NodeWatcher] aktif — cek ${MIN_CHECK_MIN}–${MAX_CHECK_MIN} menit (pertama dalam ${Math.round(FIRST_DELAY / 1000)} dtk)`)
    return true
}

export default {
    getWarnTargets,
    isWarnTarget,
    setWarnTarget,
    unsetWarnTarget,
    getNotifBlacklist,
    isNotifBlacklisted,
    addNotifBlacklist,
    removeNotifBlacklist,
    toggleNotifBlacklist,
    getLastStatus,
    getWatcherInfo,
    collectNodeStates,
    runNodeCheckOnce,
    startNodeWatcher
}
