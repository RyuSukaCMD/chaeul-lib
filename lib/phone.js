// ═══════════════════════════════════════════════════════════
//  PHONE — normalisasi & format nomor dengan KODE NEGARA.
//
//  Semua log (private chat & call) menyimpan nomor dalam bentuk
//  internasional "+62xxx" agar jelas asal negaranya.
// ═══════════════════════════════════════════════════════════

// Kode negara umum (terpanjang dicek lebih dulu saat mendeteksi).
const COUNTRY = {
    "1": "🇺🇸 US/CA",
    "7": "🇷🇺 RU/KZ",
    "20": "🇪🇬 Mesir",
    "27": "🇿🇦 Afrika Selatan",
    "31": "🇳🇱 Belanda",
    "33": "🇫🇷 Prancis",
    "34": "🇪🇸 Spanyol",
    "39": "🇮🇹 Italia",
    "44": "🇬🇧 Inggris",
    "49": "🇩🇪 Jerman",
    "52": "🇲🇽 Meksiko",
    "55": "🇧🇷 Brasil",
    "60": "🇲🇾 Malaysia",
    "61": "🇦🇺 Australia",
    "62": "🇮🇩 Indonesia",
    "63": "🇵🇭 Filipina",
    "65": "🇸🇬 Singapura",
    "66": "🇹🇭 Thailand",
    "81": "🇯🇵 Jepang",
    "82": "🇰🇷 Korea Selatan",
    "84": "🇻🇳 Vietnam",
    "86": "🇨🇳 China",
    "91": "🇮🇳 India",
    "92": "🇵🇰 Pakistan",
    "95": "🇲🇲 Myanmar",
    "212": "🇲🇦 Maroko",
    "234": "🇳🇬 Nigeria",
    "351": "🇵🇹 Portugal",
    "353": "🇮🇪 Irlandia",
    "358": "🇫🇮 Finlandia",
    "380": "🇺🇦 Ukraina",
    "421": "🇸🇰 Slovakia",
    "852": "🇭🇰 Hong Kong",
    "855": "🇰🇭 Kamboja",
    "856": "🇱🇦 Laos",
    "880": "🇧🇩 Bangladesh",
    "886": "🇹🇼 Taiwan",
    "962": "🇯🇴 Yordania",
    "966": "🇸🇦 Arab Saudi",
    "971": "🇦🇪 UEA",
    "972": "🇮🇱 Israel",
    "974": "🇶🇦 Qatar",
    "998": "🇺🇿 Uzbekistan"
}

/** JID/nomor apa pun → digit murni (tanpa @, tanpa :device, tanpa simbol). */
export function toDigits(value) {
    return String(value || "")
        .split("@")[0]
        .split(":")[0]
        .replace(/\D/g, "")
}

/**
 * Normalisasi ke format internasional TANPA tanda plus.
 * "08123..."  → "628123..."
 * "8123..."   → "628123..."  (asumsi Indonesia)
 * "628123..." → tetap
 */
export function toIntl(value, defaultCc = "62") {
    let num = toDigits(value)
    if (!num) return ""

    // Awalan 0 (format lokal) → ganti kode negara default.
    if (num.startsWith("0")) num = defaultCc + num.replace(/^0+/, "")

    // Nomor Indonesia sering ditulis tanpa 0 di depan (8xx...).
    if (num.startsWith("8") && num.length >= 9 && num.length <= 13) num = defaultCc + num

    return num
}

/** Format tampilan lengkap dengan tanda plus: "+62812xxxx". */
export function toDisplay(value, defaultCc = "62") {
    const num = toIntl(value, defaultCc)
    return num ? `+${num}` : "-"
}

/** Deteksi kode negara & label negaranya. */
export function detectCountry(value) {
    const num = toIntl(value)
    if (!num) return { code: "", label: "Tidak diketahui" }

    for (let len = 3; len >= 1; len--) {
        const code = num.slice(0, len)
        if (COUNTRY[code]) return { code, label: COUNTRY[code] }
    }
    return { code: num.slice(0, 2), label: "Tidak diketahui" }
}

/** JID WhatsApp standar dari nomor apa pun. */
export function toJid(value, defaultCc = "62") {
    const num = toIntl(value, defaultCc)
    return num ? `${num}@s.whatsapp.net` : ""
}

export default { toDigits, toIntl, toDisplay, detectCountry, toJid }
