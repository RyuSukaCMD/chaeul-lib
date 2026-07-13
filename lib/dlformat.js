import { getBalance } from "./token.js"

/** Format angka besar: 1500000 → "1.5M", 12000 → "12K". */
export function formatCount(n) {
    n = Number(n || 0)
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B"
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M"
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K"
    return String(n)
}

/** Format durasi detik → "mm:ss" atau "hh:mm:ss". */
export function formatDuration(sec) {
    sec = Math.floor(Number(sec || 0))
    if (!sec) return "-"
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    const pad = (x) => String(x).padStart(2, "0")
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/**
 * Footer standar untuk command berbayar.
 * Menampilkan sisa token user di atas copyright.
 */
export function tokenFooter(jid) {
    const balance = getBalance(jid)
    return `🪙 Token tersisa: ${balance}\n© Chaeul`
}

export default { formatCount, formatDuration, tokenFooter }
