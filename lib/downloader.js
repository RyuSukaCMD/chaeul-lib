import axios from "axios"
import { hasStarnova, snGet } from "./starnova.js"

// ═══════════════════════════════════════════════════════════
//  DOWNLOADER
//  Sumber UTAMA: StarNova API (global.api) — API milik owner, key unlimited.
//               Endpoint: /api/v1/download/* & /api/v1/search/*
//  FALLBACK    : API publik gratis (tikwm, davidcyriltech, lyrics.ovh)
//               bila StarNova belum aktif / sedang gagal.
//
//  Semua fungsi mencoba StarNova dulu, lalu jatuh ke sumber publik.
// ═══════════════════════════════════════════════════════════

const DAVID = "https://apis.davidcyriltech.my.id"
const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

async function getJSON(url, opt = {}) {
    const { data } = await axios.get(url, {
        timeout: opt.timeout || 60000,
        headers: { "User-Agent": UA, Accept: "application/json, text/plain, */*" },
        ...opt
    })
    return data
}

// ─── TikTok (StarNova → tikwm fallback) ───
export async function tiktok(url) {
    // 1) StarNova API (utama)
    if (hasStarnova()) {
        try {
            const r = await snGet("/api/v1/download/tiktok", { url }, { timeout: 60000 })
            if (r && (r.video || r.music || (r.images && r.images.length))) {
                return {
                    id: r.id || "",
                    title: r.title || "",
                    region: r.region || "-",
                    duration: r.duration || 0,
                    play_count: r.play_count,
                    digg_count: r.digg_count,
                    comment_count: r.comment_count,
                    share_count: r.share_count,
                    collect_count: r.collect_count,
                    author: {
                        nickname: r.author?.nickname || r.author || "-",
                        unique_id: r.author?.unique_id || "-"
                    },
                    video: abs(r.video || r.hdplay || r.play),
                    music: abs(r.music),
                    cover: abs(r.cover),
                    images: Array.isArray(r.images) ? r.images.map(abs) : [],
                    music_info: { title: r.music_info?.title || r.title || "-" }
                }
            }
        } catch {
            // lanjut ke fallback publik
        }
    }
    // 2) Fallback: tikwm
    const data = await getJSON(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`)
    if (!data || data.code !== 0 || !data.data) {
        throw new Error(data?.msg || "Gagal mengambil data TikTok.")
    }
    const d = data.data
    // Normalisasi supaya kompatibel dgn caption lama.
    return {
        id: d.id,
        title: d.title || "",
        region: d.region || "-",
        duration: d.duration || 0,
        play_count: d.play_count,
        digg_count: d.digg_count,
        comment_count: d.comment_count,
        share_count: d.share_count,
        collect_count: d.collect_count,
        author: {
            nickname: d.author?.nickname || "-",
            unique_id: d.author?.unique_id || "-"
        },
        // URL absolut (tikwm kadang mengembalikan path relatif)
        video: abs(d.hdplay || d.play || d.wmplay),
        music: abs(d.music),
        cover: abs(d.cover),
        images: Array.isArray(d.images) ? d.images.map(abs) : [],
        music_info: { title: d.music_info?.title || d.title || "-" }
    }
}
function abs(u) {
    if (!u) return ""
    return u.startsWith("http") ? u : `https://www.tikwm.com${u}`
}

// ─── TikTok Music (mp3 saja) ───
export async function tiktokMusic(url) {
    const d = await tiktok(url)
    return {
        title: d.music_info?.title || "TikTok Audio",
        author: d.author?.nickname || "-",
        audio: d.music,
        cover: d.cover
    }
}

// ─── YouTube search (StarNova → david fallback) ───
export async function ytSearch(query) {
    if (hasStarnova()) {
        try {
            const r = await snGet("/api/v1/search/youtube", { q: query }, { timeout: 45000 })
            const list = Array.isArray(r) ? r : r?.results || []
            if (list.length) {
                return list.map((x) => ({
                    title: x.title,
                    videoId: x.videoId,
                    url: x.url,
                    thumbnail: x.thumbnail,
                    views: x.views,
                    duration: x.duration || x.timestamp || "",
                    author: x.author?.name || x.author || ""
                }))
            }
        } catch {}
    }
    const data = await getJSON(`${DAVID}/youtube/search?query=${encodeURIComponent(query)}`)
    const list = data?.results || []
    if (!list.length) throw new Error("Tidak ada hasil YouTube.")
    return list.map((r) => ({
        title: r.title,
        videoId: r.videoId,
        url: r.url,
        thumbnail: r.thumbnail,
        views: r.views,
        duration: r.duration || r.timestamp || "",
        author: r.author?.name || r.author || ""
    }))
}

// ─── YouTube MP3 (StarNova → david fallback) ───
export async function ytmp3(url) {
    if (hasStarnova()) {
        try {
            const r = await snGet("/api/v1/download/ytmp3", { url }, { timeout: 90000 })
            const audio = r?.url || r?.download_url || r?.downloadUrl
            if (audio) return { title: r.title || "-", thumb: r.thumbnail || "", audio }
        } catch {}
    }
    const data = await getJSON(`${DAVID}/download/ytmp3?url=${encodeURIComponent(url)}`, {
        timeout: 90000
    })
    const r = data?.result || data
    const audio = r?.download_url || r?.url || r?.downloadUrl
    if (!audio) throw new Error("Gagal mengambil YouTube MP3.")
    return {
        title: r.title || "-",
        thumb: r.thumbnail || "",
        audio
    }
}

// ─── YouTube MP4 (StarNova → david fallback) ───
export async function ytmp4(url) {
    if (hasStarnova()) {
        try {
            const r = await snGet("/api/v1/download/ytmp4", { url }, { timeout: 90000 })
            const video = r?.url || r?.download_url || r?.downloadUrl
            if (video) return { title: r.title || "-", thumb: r.thumbnail || "", video }
        } catch {}
    }
    const data = await getJSON(`${DAVID}/download/ytmp4?url=${encodeURIComponent(url)}`, {
        timeout: 90000
    })
    const r = data?.result || data
    const video = r?.download_url || r?.url || r?.video
    if (!video) throw new Error("Gagal mengambil YouTube MP4.")
    return {
        title: r.title || "-",
        thumb: r.thumbnail || "",
        video
    }
}

// ─── Facebook (StarNova → david fallback) ───
export async function facebook(url) {
    if (hasStarnova()) {
        try {
            const r = await snGet("/api/v1/download/facebook", { url }, { timeout: 90000 })
            const dl = r?.downloads || {}
            const video = dl.hd?.url || dl.sd?.url || r.hd || r.sd || r.url || r.video
            if (video) return { title: r.title || "Facebook Video", video, thumb: r.thumbnail || "" }
        } catch {}
    }
    const data = await getJSON(`${DAVID}/facebook?url=${encodeURIComponent(url)}`, {
        timeout: 90000
    })
    const r = data?.result || {}
    const dl = r.downloads || {}
    const video = dl.hd?.url || dl.sd?.url || r.hd || r.sd || r.url
    if (!video) throw new Error("Gagal mengambil video Facebook.")
    return { title: r.title || "Facebook Video", video, thumb: r.thumbnail || "" }
}

// ─── Instagram (StarNova → david fallback) ───
export async function instagram(url) {
    if (hasStarnova()) {
        try {
            const r = await snGet("/api/v1/download/instagram", { url }, { timeout: 90000 })
            const media =
                r?.downloadUrl ||
                r?.url ||
                r?.video ||
                r?.[0]?.url ||
                (Array.isArray(r?.media) ? r.media[0]?.url : null)
            if (media) return { video: media, title: "Instagram" }
        } catch {}
    }
    const data = await getJSON(`${DAVID}/instagram?url=${encodeURIComponent(url)}`, {
        timeout: 90000
    })
    if (data?.success === false) throw new Error(data.message || "Gagal mengambil Instagram.")
    // Bentuk respons bisa bervariasi
    const media =
        data?.downloadUrl ||
        data?.url ||
        data?.result?.[0]?.url ||
        (Array.isArray(data?.media) ? data.media[0]?.url : null)
    if (!media) throw new Error("Gagal mengambil media Instagram (pakai URL Reel).")
    return { video: media, title: "Instagram" }
}

// ─── Terabox (via StarNova API — semua tipe file, multi-file/folder) ───
// StarNova mengembalikan: { shareId, title, files: [{name,size,sizeBytes,type,download,thumbnail}] }
export async function terabox(url) {
    if (!hasStarnova()) {
        throw new Error(
            "Terabox butuh StarNova API aktif (lisensi bot). Config belum termuat."
        )
    }
    const r = await snGet("/api/v1/download/terabox", { url }, { timeout: 90000 })
    const files = Array.isArray(r?.files) ? r.files : []
    if (!files.length) throw new Error("Tidak ada file pada share Terabox ini (atau share privat/expired).")
    return {
        shareId: r.shareId || "",
        title: r.title || files[0]?.name || "Terabox",
        files: files.map((f) => ({
            name: f.name || "file",
            size: f.size || "-",
            sizeBytes: Number(f.sizeBytes) || 0,
            type: f.type || "file",
            download: f.download || "",
            thumbnail: f.thumbnail || ""
        }))
    }
}

// ─── Lyrics ───
export async function lyrics(artistOrQuery, title = "") {
    // lyrics.ovh butuh artist & title. Bila hanya query, coba pisah "-".
    let artist = artistOrQuery
    let song = title
    if (!song && artistOrQuery.includes(" - ")) {
        ;[artist, song] = artistOrQuery.split(" - ")
    } else if (!song) {
        // fallback: pakai query sbagai judul, artist kosong tidak didukung
        song = artistOrQuery
    }
    // 1) StarNova API (utama) — butuh artist & title.
    if (hasStarnova() && artist && song) {
        try {
            const r = await snGet(
                "/api/v1/search/lyrics",
                { artist: artist.trim(), title: song.trim() },
                { timeout: 25000 }
            )
            const lyr = typeof r === "string" ? r : r?.lyrics
            if (lyr && lyr.trim()) return lyr.trim()
        } catch {}
    }
    // 2) Fallback: lyrics.ovh
    try {
        const data = await getJSON(
            `https://api.lyrics.ovh/v1/${encodeURIComponent(artist.trim())}/${encodeURIComponent(
                song.trim()
            )}`,
            { timeout: 20000 }
        )
        if (data?.lyrics) return data.lyrics.trim()
    } catch {}
    return null
}

/**
 * Unduh media dari URL menjadi Buffer (dengan header browser).
 * WhatsApp/Baileys kadang gagal fetch URL CDN langsung, jadi kita
 * unduh manual lalu kirim sebagai Buffer.
 */
export async function fetchBuffer(url, opt = {}) {
    const { data } = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: opt.timeout || 120000,
        maxContentLength: 100 * 1024 * 1024,
        maxBodyLength: 100 * 1024 * 1024,
        headers: {
            "User-Agent": UA,
            Accept: "*/*",
            Referer: opt.referer || ""
        }
    })
    return Buffer.from(data)
}

// ─── Info detail video YouTube (author/channel via noembed) ───
export async function ytInfo(url) {
    try {
        const data = await getJSON(`https://noembed.com/embed?url=${encodeURIComponent(url)}`, {
            timeout: 15000
        })
        return {
            title: data?.title || "",
            author: data?.author_name || "",
            authorUrl: data?.author_url || "",
            thumbnail: data?.thumbnail_url || ""
        }
    } catch {
        return {}
    }
}

export default {
    tiktok,
    ytInfo,
    tiktokMusic,
    ytSearch,
    ytmp3,
    ytmp4,
    facebook,
    instagram,
    terabox,
    lyrics,
    fetchBuffer
}
