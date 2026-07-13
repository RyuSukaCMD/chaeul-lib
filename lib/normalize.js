// Normalisasi teks "font aneh" (unicode) menjadi ASCII biasa agar
// deteksi link antilink tidak bisa di-bypass dengan huruf gaya.
//
// Contoh yang ditangani:
//  - Mathematical bold/italic/monospace/sans/script/fraktur/double-struck
//  - Fullwidth (ａｂｃ), small-caps (ᴀʙᴄ), circled (ⓐ), regional/parenthesized
//  - Menghapus zero-width & karakter tak terlihat penyusup

// Rentang "Mathematical Alphanumeric Symbols" (U+1D400–U+1D7FF) dipetakan
// secara terprogram ke a-z/A-Z/0-9.

const ZERO_WIDTH = /[\u200B-\u200D\uFEFF\u2060\u00AD\u034F\u17B4\u17B5\u180E]/g

// Peta khusus untuk gaya yang tidak berurutan rapi (small caps, circled, dst)
const SPECIAL = {
    // small caps
    ᴀ: "a",
    ʙ: "b",
    ᴄ: "c",
    ᴅ: "d",
    ᴇ: "e",
    ꜰ: "f",
    ɢ: "g",
    ʜ: "h",
    ɪ: "i",
    ᴊ: "j",
    ᴋ: "k",
    ʟ: "l",
    ᴍ: "m",
    ɴ: "n",
    ᴏ: "o",
    ᴘ: "p",
    ꞯ: "q",
    ʀ: "r",
    ᴛ: "t",
    ᴜ: "u",
    ᴠ: "v",
    ᴡ: "w",
    ʏ: "y",
    ᴢ: "z",
    // fullwidth digits & dot
    "０": "0",
    "１": "1",
    "２": "2",
    "３": "3",
    "４": "4",
    "５": "5",
    "６": "6",
    "７": "7",
    "８": "8",
    "９": "9",
    "．": ".",
    "／": "/",
    "：": ":"
}

// Rentang blok Mathematical Alphanumeric Symbols -> a-z/A-Z/0-9
// [start (huruf A / a / 0), jenis]
const MATH_RANGES = [
    // Bold
    [0x1d400, "A"],
    [0x1d41a, "a"],
    // Italic
    [0x1d434, "A"],
    [0x1d44e, "a"],
    // Bold Italic
    [0x1d468, "A"],
    [0x1d482, "a"],
    // Script
    [0x1d49c, "A"],
    [0x1d4b6, "a"],
    // Bold Script
    [0x1d4d0, "A"],
    [0x1d4ea, "a"],
    // Fraktur
    [0x1d504, "A"],
    [0x1d51e, "a"],
    // Double-struck
    [0x1d538, "A"],
    [0x1d552, "a"],
    // Bold Fraktur
    [0x1d56c, "A"],
    [0x1d586, "a"],
    // Sans-serif
    [0x1d5a0, "A"],
    [0x1d5ba, "a"],
    // Sans-serif Bold
    [0x1d5d4, "A"],
    [0x1d5ee, "a"],
    // Sans-serif Italic
    [0x1d608, "A"],
    [0x1d622, "a"],
    // Sans-serif Bold Italic
    [0x1d63c, "A"],
    [0x1d656, "a"],
    // Monospace
    [0x1d670, "A"],
    [0x1d68a, "a"]
]

// Digit math (bold, double-struck, sans, sans-bold, monospace) mulai 0
const MATH_DIGITS = [0x1d7ce, 0x1d7d8, 0x1d7e2, 0x1d7ec, 0x1d7f6]

function mapChar(ch) {
    // Special table dulu
    if (SPECIAL[ch]) return SPECIAL[ch]

    const cp = ch.codePointAt(0)

    // Fullwidth latin A-Z / a-z (U+FF21–FF3A, U+FF41–FF5A)
    if (cp >= 0xff21 && cp <= 0xff3a) return String.fromCharCode(cp - 0xff21 + 65)
    if (cp >= 0xff41 && cp <= 0xff5a) return String.fromCharCode(cp - 0xff41 + 97)

    // Math letters
    for (const [start, base] of MATH_RANGES) {
        if (cp >= start && cp < start + 26) {
            const baseCode = base === "A" ? 65 : 97
            return String.fromCharCode(baseCode + (cp - start))
        }
    }

    // Math digits
    for (const start of MATH_DIGITS) {
        if (cp >= start && cp < start + 10) {
            return String.fromCharCode(48 + (cp - start))
        }
    }

    return ch
}

/** Normalisasi teks ke ASCII biasa (huruf gaya -> huruf normal). */
export function normalizeText(text = "") {
    if (!text) return ""

    // Buang karakter tak terlihat
    let out = String(text).replace(ZERO_WIDTH, "")

    // Petakan tiap karakter (pakai spread agar aman utk surrogate pair)
    out = [...out].map(mapChar).join("")

    // Unicode NFKD untuk membereskan sisa (fullwidth simbol dll) lalu lower
    try {
        out = out.normalize("NFKD")
    } catch {}

    return out
}

export default { normalizeText }
