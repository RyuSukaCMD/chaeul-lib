// Helper waktu Indonesia Barat (WIB / Asia/Jakarta).

const TZ = "Asia/Jakarta"

/** Objek bagian tanggal-waktu WIB. */
function partsWIB(d = new Date()) {
    const fmt = new Intl.DateTimeFormat("id-ID", {
        timeZone: TZ,
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).formatToParts(d)
    const get = (t) => fmt.find((x) => x.type === t)?.value || ""
    return {
        weekday: get("weekday"),
        day: get("day"),
        month: get("month"),
        year: get("year"),
        hour: get("hour"),
        minute: get("minute"),
        second: get("second")
    }
}

/** "Senin, 12 Juli 2026" */
export function dateWIB(d = new Date()) {
    const p = partsWIB(d)
    return `${p.weekday}, ${p.day} ${p.month} ${p.year}`
}

/** "14:30:05 WIB" */
export function clockWIB(d = new Date()) {
    const p = partsWIB(d)
    return `${p.hour}:${p.minute}:${p.second} WIB`
}

/** "Senin, 12 Juli 2026 • 14:30 WIB" */
export function fullWIB(d = new Date()) {
    const p = partsWIB(d)
    return `${p.weekday}, ${p.day} ${p.month} ${p.year} • ${p.hour}:${p.minute} WIB`
}

/** Sapaan berdasarkan jam WIB. */
export function greetWIB(d = new Date()) {
    const hour = parseInt(partsWIB(d).hour, 10)
    if (hour < 4) return { text: "Selamat Malam", emoji: "🌙" }
    if (hour < 11) return { text: "Selamat Pagi", emoji: "🌅" }
    if (hour < 15) return { text: "Selamat Siang", emoji: "☀️" }
    if (hour < 19) return { text: "Selamat Sore", emoji: "🌇" }
    return { text: "Selamat Malam", emoji: "🌙" }
}

export default { dateWIB, clockWIB, fullWIB, greetWIB }
