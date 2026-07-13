import axios from "axios"

// Helper terpusat untuk memanggil API downloader (YouTube / TikTok).
// Base URL & apikey diambil dari config.js (global.api).

function apiBase() {
    return (global.api?.baseUrl || "").replace(/\/+$/, "")
}

function apiKey() {
    return global.api?.key || ""
}

async function callApi(path, url) {
    const { data } = await axios.get(`${apiBase()}${path}`, {
        params: { apikey: apiKey(), url },
        timeout: 120000
    })
    return data
}

/** Download YouTube MP4. Mengembalikan { title, thumb, duration, video }. */
export async function ytmp4(url) {
    const res = await callApi("/vsunseeV8/ytmp4", url)

    if (!res || res.status === false) {
        throw new Error(res?.error || "Gagal mengambil data YouTube MP4.")
    }

    const r = res.result || {}
    return {
        title: r.title || "-",
        thumb: r.thumb || r.thumbnail || "",
        duration: r.duration || 0,
        // Endpoint bisa memakai nama field berbeda untuk URL video
        video: r.video || r.url || r.mp4 || r.download || r.dl || ""
    }
}

/** Download YouTube MP3. Mengembalikan { title, thumb, duration, audio }. */
export async function ytmp3(url) {
    const res = await callApi("/vsunseeV8/ytmp3", url)

    if (!res || res.status === false) {
        throw new Error(res?.error || "Gagal mengambil data YouTube MP3.")
    }

    const r = res.result || {}
    return {
        title: r.title || "-",
        thumb: r.thumb || r.thumbnail || "",
        duration: r.duration || 0,
        audio: r.audio || r.url || r.mp3 || r.download || r.dl || ""
    }
}

/** Download TikTok. Mengembalikan objek data mentah dari API (result.data). */
export async function tiktok(url) {
    const res = await callApi("/vsunseeV8/tiktok-v2", url)

    if (!res || res.status === false) {
        throw new Error(res?.error || "Gagal mengambil data TikTok.")
    }

    const data = res.result?.data
    if (!data) throw new Error("Data TikTok tidak ditemukan.")

    return data
}

export default { ytmp4, ytmp3, tiktok }
