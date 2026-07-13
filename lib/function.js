import fs from "fs"

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const toTime = (ms) => {
    ms = Number(ms)

    const day = Math.floor(ms / 86400000)
    const hour = Math.floor(ms / 3600000) % 24
    const minute = Math.floor(ms / 60000) % 60
    const second = Math.floor(ms / 1000) % 60

    return [
        day ? `${day} Hari` : "",
        hour ? `${hour} Jam` : "",
        minute ? `${minute} Menit` : "",
        second ? `${second} Detik` : ""
    ]
        .filter(Boolean)
        .join(" ")
}

export const runtime = (seconds) => {
    seconds = Number(seconds)

    const d = Math.floor(seconds / (3600 * 24))
    const h = Math.floor((seconds % (3600 * 24)) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)

    return [d ? `${d} Hari` : "", h ? `${h} Jam` : "", m ? `${m} Menit` : "", s ? `${s} Detik` : ""]
        .filter(Boolean)
        .join(" ")
}

export const toNumber = (jid = "") => {
    return jid.replace(/:\d+@/g, "@").split("@")[0]
}

export const toJid = (number = "") => {
    number = number.replace(/\D/g, "")
    return `${number}@s.whatsapp.net`
}

export const readJSON = (file) => {
    if (!fs.existsSync(file)) return []

    return JSON.parse(fs.readFileSync(file))
}

export const saveJSON = (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

export const getRandom = (ext = "") => `${Math.floor(Math.random() * 100000)}${ext}`

export default {
    sleep,

    runtime,

    toNumber,

    toTime,

    toJid,

    readJSON,

    saveJSON,

    getRandom
}
