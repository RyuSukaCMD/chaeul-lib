import { smallcaps as sc } from "./font.js"

/**
 * Kartu output standar Chaeul (dekoratif & konsisten).
 * @param {string} title  judul kartu (mis. "AUTO READ")
 * @param {string|string[]} lines  isi (string atau array baris)
 * @param {object} [opt]
 * @param {string} [opt.emoji]  emoji judul
 * @param {string} [opt.footer] baris footer opsional
 * @param {boolean} [opt.fancy=true] pakai font small-caps utk judul
 */
export function card(title, lines, opt = {}) {
    const emoji = opt.emoji ? `${opt.emoji} ` : ""
    const head = opt.fancy === false ? title : sc(title)
    const body = Array.isArray(lines) ? lines : [lines]

    let out = `╭─❏ ${emoji}*${head}*\n`
    for (const line of body) {
        out += `┃ ${line}\n`
    }
    if (opt.footer) {
        out += `┃\n┃ ${opt.footer}\n`
    }
    out += `╰──────────────❏`
    return out
}

/** Baris status ON/OFF yang seragam. */
export function status(label, on) {
    return `${label} : ${on ? "✅ ON" : "❌ OFF"}`
}

export default { card, status }
