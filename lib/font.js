// Konversi teks biasa → small-caps unicode (ᴜɴɪᴄᴏᴅᴇ) untuk tampilan menu.

const MAP = {
    a: "ᴀ",
    b: "ʙ",
    c: "ᴄ",
    d: "ᴅ",
    e: "ᴇ",
    f: "ꜰ",
    g: "ɢ",
    h: "ʜ",
    i: "ɪ",
    j: "ᴊ",
    k: "ᴋ",
    l: "ʟ",
    m: "ᴍ",
    n: "ɴ",
    o: "ᴏ",
    p: "ᴘ",
    q: "ǫ",
    r: "ʀ",
    s: "s",
    t: "ᴛ",
    u: "ᴜ",
    v: "ᴠ",
    w: "ᴡ",
    x: "x",
    y: "ʏ",
    z: "ᴢ"
}

/** Ubah teks menjadi small-caps unicode. Karakter non-huruf dibiarkan. */
export function smallcaps(text = "") {
    return String(text)
        .split("")
        .map((ch) => MAP[ch.toLowerCase()] || ch)
        .join("")
}

/** Sapaan berdasarkan jam lokal + emoji. */
export function greeting() {
    const h = new Date().getHours()
    if (h < 4) return { text: "Selamat Malam", emoji: "🌙" }
    if (h < 11) return { text: "Selamat Pagi", emoji: "🌅" }
    if (h < 15) return { text: "Selamat Siang", emoji: "☀️" }
    if (h < 19) return { text: "Selamat Sore", emoji: "🌇" }
    return { text: "Selamat Malam", emoji: "🌙" }
}

export default { smallcaps, greeting }
