import axios from "axios"

// ═══════════════════════════════════════════════════════════
//  KLIEN STARNOVA API (API milik owner)
//
//  Semua fitur downloader & AI bot memakai StarNova API lebih dulu.
//  Kredensial (baseUrl + key) datang dari WEBSITE saat start (global.api),
//  HANYA bila lisensi aktif. Key owner = limit TAK TERBATAS.
//
//  Base URL contoh : https://dash.starnova.my.id
//  Format endpoint : /api/v1/<kategori>/<nama>
//  Auth            : header "apikey" ATAU query ?apikey=
//  Respons standar : { status: true, creator: "StarNova API", result: {...} }
//                    { status: false, message: "...", creator: "StarNova API" }
// ═══════════════════════════════════════════════════════════

const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

/** true bila kredensial StarNova tersedia (lisensi aktif → global.api terisi). */
export function hasStarnova() {
    return !!(global.api && global.api.baseUrl)
}

function base() {
    return String(global.api?.baseUrl || "").replace(/\/+$/, "")
}
function apikey() {
    return global.api?.key || ""
}

/**
 * Panggil endpoint StarNova (GET). Mengembalikan `result` (isi di dalam),
 * atau melempar error dengan pesan asli dari server.
 * @param {string} path   contoh: "/api/v1/download/tiktok"
 * @param {object} params query param (url/q/text/dst) — apikey otomatis ditambahkan
 * @param {object} opt    { timeout }
 */
export async function snGet(path, params = {}, opt = {}) {
    if (!hasStarnova()) throw new Error("StarNova API belum aktif (global.api kosong).")
    const url = `${base()}${path.startsWith("/") ? "" : "/"}${path}`
    const { data } = await axios.get(url, {
        params: { apikey: apikey(), ...params },
        timeout: opt.timeout || 60000,
        headers: { apikey: apikey(), "User-Agent": UA, Accept: "application/json, */*" }
    })
    if (data && data.status === false) {
        throw new Error(data.message || "StarNova API menolak permintaan.")
    }
    // Bentuk standar: { status, creator, result }
    return data && "result" in data ? data.result : data
}

export default { hasStarnova, snGet }
