import axios from "axios"

// ═══════════════════════════════════════════════════════════
//  DOWNLOADER — API publik gratis (dengan fallback).
//  Sumber utama:
//   - TikTok   : tikwm.com (video + music/mp3)
//   - YouTube  : davidcyriltech (search / mp3 / mp4)
//   - Facebook : davidcyriltech
//   - Instagram: davidcyriltech (reel)
//   - Lyrics   : api.lyrics.ovh
//  Bila API vsunsee (global.api) tersedia, dipakai sebagai fallback.
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

// ─── TikTok (tikwm) ───
export async function tiktok(url) {
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

// ─── YouTube search ───
export async function ytSearch(query) {
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

// ─── YouTube MP3 (endpoint download/ytmp3 — URL fetchable) ───
export async function ytmp3(url) {
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

// ─── YouTube MP4 (endpoint download/ytmp4 — URL fetchable) ───
export async function ytmp4(url) {
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

// ─── Facebook ───
export async function facebook(url) {
    const data = await getJSON(`${DAVID}/facebook?url=${encodeURIComponent(url)}`, {
        timeout: 90000
    })
    const r = data?.result || {}
    const dl = r.downloads || {}
    const video = dl.hd?.url || dl.sd?.url || r.hd || r.sd || r.url
    if (!video) throw new Error("Gagal mengambil video Facebook.")
    return { title: r.title || "Facebook Video", video, thumb: r.thumbnail || "" }
}

// ─── Instagram (reel) ───
export async function instagram(url) {
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
    lyrics,
    fetchBuffer
}
