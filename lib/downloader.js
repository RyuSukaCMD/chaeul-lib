import axios from "axios"

// ═══════════════════════════════════════════════════════════
//  DOWNLOADER — 100% API PUBLIK (tanpa StarNova).
//  Setiap fungsi punya RANTAI FALLBACK multi-provider: bila satu
//  sumber mati/limit, otomatis coba sumber berikutnya. Tujuannya
//  agar tetap jalan walau salah satu API down.
//
//  Sumber utama (yang terverifikasi bekerja):
//   - TikTok   : tikwm.com
//   - YouTube  : davidcyriltech (search/mp3/mp4) + vreden + fastrestapis
//   - Facebook : davidcyriltech + snapsave
//   - Instagram: davidcyriltech + snapsave/vreden
//   - Lyrics   : api.lyrics.ovh
// ═══════════════════════════════════════════════════════════

const DAVID = "https://apis.davidcyriltech.my.id"
const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

async function getJSON(url, opt = {}) {
    const { data } = await axios.get(url, {
        timeout: opt.timeout || 60000,
        headers: { "User-Agent": UA, Accept: "application/json, text/plain, */*", ...(opt.headers || {}) }
    })
    return data
}
async function postJSON(url, body, opt = {}) {
    const { data } = await axios.post(url, body, {
        timeout: opt.timeout || 60000,
        headers: { "User-Agent": UA, "Content-Type": "application/json", Accept: "application/json", ...(opt.headers || {}) }
    })
    return data
}

/** Coba beberapa provider berurutan; kembalikan hasil pertama yang truthy. */
async function tryChain(chain, errMsg) {
    let lastErr = null
    for (const fn of chain) {
        try {
            const r = await fn()
            if (r) return r
        } catch (e) {
            lastErr = e
        }
    }
    throw new Error(errMsg + (lastErr?.message ? ` (${lastErr.message})` : ""))
}

/** Bungkus provider agar di-retry beberapa kali (untuk API yang suka intermittent). */
function withRetry(fn, tries = 3, delayMs = 2500) {
    return async () => {
        let last = null
        for (let i = 0; i < tries; i++) {
            try {
                const r = await fn()
                if (r) return r
            } catch (e) {
                last = e
            }
            if (i < tries - 1) await new Promise((r) => setTimeout(r, delayMs))
        }
        if (last) throw last
        return null
    }
}

function abs(u) {
    if (!u) return ""
    return String(u).startsWith("http") ? u : `https://www.tikwm.com${u}`
}

// ═══════════════════════════ TikTok ═══════════════════════════
export async function tiktok(url) {
    return tryChain(
        [
            // 1) tikwm (utama)
            async () => {
                const data = await getJSON(
                    `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`
                )
                if (!data || data.code !== 0 || !data.data) return null
                const d = data.data
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
                    video: abs(d.hdplay || d.play || d.wmplay),
                    music: abs(d.music),
                    cover: abs(d.cover),
                    images: Array.isArray(d.images) ? d.images.map(abs) : [],
                    music_info: { title: d.music_info?.title || d.title || "-" }
                }
            },
            // 2) davidcyriltech tiktok
            async () => {
                const data = await getJSON(`${DAVID}/download/tiktok?url=${encodeURIComponent(url)}`)
                const r = data?.result || data
                const video = r?.video || r?.hdplay || r?.play || r?.url
                if (!video) return null
                return {
                    id: r.id || "",
                    title: r.title || "",
                    region: r.region || "-",
                    duration: r.duration || 0,
                    author: {
                        nickname: r.author?.nickname || r.author || "-",
                        unique_id: r.author?.unique_id || "-"
                    },
                    video,
                    music: r.music || r.audio || "",
                    cover: r.cover || r.thumbnail || "",
                    images: Array.isArray(r.images) ? r.images : [],
                    music_info: { title: r.music_info?.title || r.title || "-" }
                }
            }
        ],
        "Gagal mengambil data TikTok."
    )
}

export async function tiktokMusic(url) {
    const d = await tiktok(url)
    return {
        title: d.music_info?.title || "TikTok Audio",
        author: d.author?.nickname || "-",
        audio: d.music,
        cover: d.cover
    }
}

// ═══════════════════════════ YouTube search ═══════════════════════════
export async function ytSearch(query) {
    const norm = (list) =>
        (list || [])
            .filter((r) => r && (r.url || r.videoId))
            .map((r) => ({
                title: r.title || r.name || "-",
                videoId: r.videoId || r.id || "",
                url: r.url || (r.videoId ? `https://youtu.be/${r.videoId}` : ""),
                thumbnail: r.thumbnail || r.image || r.thumb || "",
                views: r.views || r.viewCount || 0,
                duration: r.duration || r.timestamp || r.durationLabel || "",
                author: r.author?.name || r.author || r.channel || ""
            }))
    return tryChain(
        [
            async () => {
                const d = await getJSON(`${DAVID}/youtube/search?query=${encodeURIComponent(query)}`)
                const list = norm(d?.results || d?.result)
                return list.length ? list : null
            },
            async () => {
                const d = await getJSON(
                    `https://api.vreden.my.id/api/ytplay?query=${encodeURIComponent(query)}`
                )
                const r = d?.result
                if (r?.metadata?.url)
                    return [
                        {
                            title: r.metadata.title,
                            videoId: r.metadata.videoId || "",
                            url: r.metadata.url,
                            thumbnail: r.metadata.thumbnail || r.metadata.image || "",
                            views: r.metadata.views || 0,
                            duration: r.metadata.timestamp || r.metadata.duration || "",
                            author: r.metadata.author?.name || ""
                        }
                    ]
                return null
            }
        ],
        "Tidak ada hasil YouTube."
    )
}

// ═══════════════════════════ YouTube MP3 ═══════════════════════════
export async function ytmp3(url) {
    return tryChain(
        [
            // davidcyriltech (kadang intermittent → retry 3x)
            withRetry(async () => {
                const d = await getJSON(`${DAVID}/download/ytmp3?url=${encodeURIComponent(url)}`, {
                    timeout: 90000
                })
                const r = d?.result || d
                const audio = r?.download_url || r?.url || r?.downloadUrl
                if (r?.success === false || !audio) return null
                return { title: r.title || "-", thumb: r.thumbnail || "", audio }
            }),
            async () => {
                const d = await getJSON(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`, {
                    timeout: 90000
                })
                const r = d?.result
                const audio = r?.download?.url || r?.url
                if (!audio) return null
                return { title: r?.metadata?.title || r?.title || "-", thumb: r?.metadata?.thumbnail || "", audio }
            },
            async () => {
                const d = await getJSON(
                    `https://fastrestapis.fasturl.cloud/downup/ytmp3?url=${encodeURIComponent(url)}&quality=128kbps&server=auto`,
                    { timeout: 90000 }
                )
                const r = d?.result || d
                const audio = r?.media || r?.url || r?.download
                if (!audio) return null
                return { title: r?.title || "-", thumb: r?.thumbnail || r?.image || "", audio }
            }
        ],
        "Gagal mengambil YouTube MP3 dari semua sumber."
    )
}

// ═══════════════════════════ YouTube MP4 ═══════════════════════════
export async function ytmp4(url) {
    return tryChain(
        [
            // davidcyriltech (kadang intermittent → retry 3x)
            withRetry(async () => {
                const d = await getJSON(`${DAVID}/download/ytmp4?url=${encodeURIComponent(url)}`, {
                    timeout: 90000
                })
                const r = d?.result || d
                const video = r?.download_url || r?.url || r?.video
                if (r?.success === false || !video) return null
                return { title: r.title || "-", thumb: r.thumbnail || "", video }
            }),
            async () => {
                const d = await getJSON(`https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(url)}`, {
                    timeout: 90000
                })
                const r = d?.result
                const video = r?.download?.url || r?.url
                if (!video) return null
                return { title: r?.metadata?.title || r?.title || "-", thumb: r?.metadata?.thumbnail || "", video }
            },
            async () => {
                const d = await getJSON(
                    `https://fastrestapis.fasturl.cloud/downup/ytmp4?url=${encodeURIComponent(url)}&quality=480`,
                    { timeout: 90000 }
                )
                const r = d?.result || d
                const video = r?.media || r?.url || r?.download
                if (!video) return null
                return { title: r?.title || "-", thumb: r?.thumbnail || r?.image || "", video }
            }
        ],
        "Gagal mengambil YouTube MP4 dari semua sumber."
    )
}

// ═══════════════════════════ Facebook ═══════════════════════════
export async function facebook(url) {
    return tryChain(
        [
            async () => {
                const d = await getJSON(`${DAVID}/facebook?url=${encodeURIComponent(url)}`, {
                    timeout: 90000
                })
                const r = d?.result || {}
                const dl = r.downloads || {}
                const video = dl.hd?.url || dl.sd?.url || r.hd || r.sd || r.url
                if (!video) return null
                return { title: r.title || "Facebook Video", video, thumb: r.thumbnail || "" }
            },
            async () => {
                const d = await getJSON(
                    `https://api.vreden.my.id/api/fbdl?url=${encodeURIComponent(url)}`,
                    { timeout: 90000 }
                )
                const r = d?.result
                const arr = Array.isArray(r) ? r : r?.media || r?.data
                const video = arr?.[0]?.url || arr?.[0]?.link || r?.hd || r?.sd
                if (!video) return null
                return { title: r?.title || "Facebook Video", video, thumb: r?.thumbnail || "" }
            }
        ],
        "Gagal mengambil video Facebook."
    )
}

// ═══════════════════════════ Instagram ═══════════════════════════
export async function instagram(url) {
    return tryChain(
        [
            async () => {
                const d = await getJSON(`${DAVID}/instagram?url=${encodeURIComponent(url)}`, {
                    timeout: 90000
                })
                if (d?.success === false) return null
                const media =
                    d?.downloadUrl ||
                    d?.url ||
                    d?.result?.[0]?.url ||
                    (Array.isArray(d?.media) ? d.media[0]?.url : null)
                return media ? { video: media, title: "Instagram" } : null
            },
            async () => {
                const d = await getJSON(
                    `https://api.vreden.my.id/api/igdownload?url=${encodeURIComponent(url)}`,
                    { timeout: 90000 }
                )
                const r = d?.result
                const arr = Array.isArray(r) ? r : r?.media || r?.data
                const media = arr?.[0]?.url || arr?.[0]?.link || r?.url
                return media ? { video: media, title: "Instagram" } : null
            },
            async () => {
                // snapsave (POST)
                const d = await postJSON("https://api.dreaded.site/api/instagram", { url }, {
                    timeout: 90000
                })
                const media = d?.result?.url || d?.url || d?.result?.[0]?.url
                return media ? { video: media, title: "Instagram" } : null
            }
        ],
        "Gagal mengambil media Instagram."
    )
}

// ═══════════════════════════ Terabox (multi-file/folder, semua tipe) ═══════════════════════════
// Terabox butuh cookie akun untuk hasil stabil → set env TERABOX_COOKIE (di config bot / .env).
// Alur: shorturlinfo (list) → download API (dlink). Fallback API publik bila cookie kosong.
export function teraboxSurl(url) {
    const u = String(url).trim()
    const q = u.match(/[?&]surl=([A-Za-z0-9_-]+)/)
    if (q) return q[1].replace(/^1/, "")
    const s = u.match(/\/s\/1?([A-Za-z0-9_-]+)/)
    if (s) return s[1]
    const bare = u.match(/([A-Za-z0-9_-]{15,})/)
    return bare ? bare[1] : ""
}
function teraType(name = "") {
    const ext = (name.split(".").pop() || "").toLowerCase()
    if (["mp4", "mkv", "mov", "avi", "webm", "m4v", "flv", "3gp", "ts"].includes(ext)) return "video"
    if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "heic"].includes(ext)) return "image"
    if (["mp3", "m4a", "wav", "ogg", "flac", "aac", "opus"].includes(ext)) return "audio"
    if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"].includes(ext)) return "document"
    if (["zip", "rar", "7z", "tar", "gz", "apk"].includes(ext)) return "archive"
    return "file"
}
function humanSize(bytes) {
    const b = Number(bytes) || 0
    if (!b) return "-"
    const u = ["B", "KB", "MB", "GB", "TB"]
    let i = 0,
        n = b
    while (n >= 1024 && i < u.length - 1) {
        n /= 1024
        i++
    }
    return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${u[i]}`
}

async function teraboxOfficial(surl) {
    const cookie = (global.terabox && global.terabox.cookie) || process.env.TERABOX_COOKIE || ""
    if (!cookie) throw new Error("cookie kosong")
    const H = { "User-Agent": UA, Cookie: cookie, Referer: "https://www.terabox.com/" }
    const info = await getJSON(
        `https://www.terabox.com/api/shorturlinfo?app_id=250528&web=1&channel=dubox&clienttype=0&shorturl=1${encodeURIComponent(surl)}&root=1`,
        { headers: H, timeout: 40000 }
    )
    if (info?.errno !== 0) throw new Error(`errno ${info?.errno}`)
    const { shareid, uk, sign, timestamp } = info
    const all = []
    const walk = async (list, depth) => {
        for (const it of list || []) {
            if (String(it.isdir) === "1" && depth < 3) {
                try {
                    const d = await getJSON(
                        `https://www.terabox.com/share/list?app_id=250528&web=1&channel=dubox&clienttype=0&shorturl=1${encodeURIComponent(surl)}&root=0&dir=${encodeURIComponent(it.path)}&order=name`,
                        { headers: H, timeout: 40000 }
                    )
                    if (d?.errno === 0) await walk(d.list, depth + 1)
                } catch {}
            } else if (String(it.isdir) !== "1") all.push(it)
        }
    }
    await walk(info.list, 0)
    const files = []
    for (const f of all) {
        let dlink = f.dlink || ""
        if (!dlink && f.fs_id) {
            try {
                const dl = await getJSON(
                    `https://www.terabox.com/api/download?app_id=250528&web=1&channel=dubox&clienttype=0&shareid=${shareid}&uk=${uk}&sign=${encodeURIComponent(sign)}&timestamp=${timestamp}&fid_list=%5B${f.fs_id}%5D`,
                    { headers: H, timeout: 40000 }
                )
                dlink = dl?.dlink?.[0]?.dlink || dl?.list?.[0]?.dlink || ""
            } catch {}
        }
        files.push({
            name: f.server_filename || f.filename || "file",
            size: humanSize(f.size),
            sizeBytes: Number(f.size) || 0,
            type: teraType(f.server_filename || f.filename),
            download: dlink,
            thumbnail: f.thumbs?.url3 || f.thumbs?.url2 || f.thumbs?.url1 || ""
        })
    }
    if (!files.length) throw new Error("kosong")
    return { shareId: surl, title: info?.title || files[0]?.name || "Terabox", files }
}

async function teraboxPublic(url) {
    // wdzone
    const d = await getJSON(`https://wdzone-terabox-api.vercel.app/api?url=${encodeURIComponent(url)}`, {
        timeout: 60000
    })
    const info = d?.["📜 Extracted Info"] || d?.["Extracted Info"] || d?.list
    if (!info) throw new Error("publik kosong")
    const arr = Array.isArray(info) ? info : [info]
    const files = arr
        .map((x) => ({
            name: x?.["📂 Title"] || x?.title || x?.name || "file",
            size: x?.["📏 Size"] || x?.size || "-",
            sizeBytes: 0,
            type: teraType(x?.["📂 Title"] || x?.title || x?.name),
            download:
                x?.["🔽 Direct Download Link"] ||
                x?.["⚡ Direct Download Link"] ||
                x?.direct_link ||
                x?.download ||
                "",
            thumbnail: x?.["🖼️ Thumbnails"]?.["360x270"] || x?.thumb || ""
        }))
        .filter((f) => f.download)
    if (!files.length) throw new Error("publik tanpa link")
    return { shareId: teraboxSurl(url), title: files[0]?.name || "Terabox", files }
}

export async function terabox(url) {
    const surl = teraboxSurl(url)
    if (!surl) throw new Error("Link Terabox tidak valid.")
    try {
        return await teraboxOfficial(surl)
    } catch (e) {
        try {
            return await teraboxPublic(url)
        } catch (e2) {
            throw new Error(
                "Gagal ambil Terabox. Set cookie Terabox (global.terabox.cookie / TERABOX_COOKIE) untuk hasil stabil."
            )
        }
    }
}

// ═══════════════════════════ Lyrics ═══════════════════════════
export async function lyrics(artistOrQuery, title = "") {
    let artist = artistOrQuery
    let song = title
    if (!song && String(artistOrQuery).includes(" - ")) {
        ;[artist, song] = artistOrQuery.split(" - ")
    } else if (!song) {
        song = artistOrQuery
    }
    try {
        const data = await getJSON(
            `https://api.lyrics.ovh/v1/${encodeURIComponent(String(artist).trim())}/${encodeURIComponent(String(song).trim())}`,
            { timeout: 20000 }
        )
        if (data?.lyrics) return data.lyrics.trim()
    } catch {}
    return null
}

/** Unduh media dari URL menjadi Buffer (header browser). */
export async function fetchBuffer(url, opt = {}) {
    const { data } = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: opt.timeout || 120000,
        maxContentLength: 200 * 1024 * 1024,
        maxBodyLength: 200 * 1024 * 1024,
        headers: { "User-Agent": UA, Accept: "*/*", Referer: opt.referer || "" }
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
    teraboxSurl,
    lyrics,
    fetchBuffer
}
