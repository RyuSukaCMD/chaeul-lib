// Deteksi jenis link/konten terlarang pada teks pesan.
import { normalizeText } from "./normalize.js"

const RE = {
    // Undangan grup WhatsApp
    group: /chat\.whatsapp\.com\/[0-9A-Za-z]+/i,
    // Channel / newsletter WhatsApp
    channel: /whatsapp\.com\/channel\/[0-9A-Za-z]+/i,
    // Media sosial
    sosmed: /(tiktok\.com|vt\.tiktok\.com|instagram\.com|instagr\.am|facebook\.com|fb\.watch|fb\.me|(?:twitter|x)\.com)\/[^\s]+/i
}

/**
 * Mengembalikan array mode yang terlanggar dari sebuah teks,
 * mis. ["group"], ["sosmed"], atau [] bila tidak ada.
 * (mode "all" ditangani di pemanggil; mode "tagsw" dari mention status.)
 */
export function detectLinks(text = "") {
    // Normalisasi font aneh -> ASCII agar tidak bisa di-bypass
    const t = normalizeText(text)
    const hits = []
    if (RE.group.test(t)) hits.push("group")
    if (RE.channel.test(t)) hits.push("channel")
    if (RE.sosmed.test(t)) hits.push("sosmed")
    return hits
}

/** Deteksi link generik apa pun (untuk mode "all"). */
export function hasAnyLink(text = "") {
    const t = normalizeText(text)
    return /https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9-]+\.(com|net|org|xyz|id|me|io|gg|link|site|info|tv|co)\b|chat\.whatsapp\.com\/[0-9A-Za-z]+/i.test(
        t
    )
}

export default { detectLinks, hasAnyLink }
