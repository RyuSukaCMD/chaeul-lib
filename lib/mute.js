import { readJSON, writeJSON } from "./db.js"

const FILE = "./database/mute.json"

function load() {
    return readJSON(FILE, {})
}

function save(data) {
    writeJSON(FILE, data)
}

export function mute(
    number,

    expired,

    reason = "-"
) {
    const db = load()

    db[number] = {
        expired,

        reason
    }

    save(db)
}

export function unmute(number) {
    const db = load()

    delete db[number]

    save(db)
}

export function getMute(number) {
    const db = load()

    return db[number] || null
}

export function isMuted(number) {
    const data = getMute(number)

    if (!data) return false

    if (data.expired !== 0 && Date.now() >= data.expired) {
        unmute(number)

        return false
    }

    return true
}

export function getAllMute() {
    return load()
}

export function parseTime(text) {
    if (text === "perm" || text === "permanent") return 0

    const match = text.match(/^(\d+)(s|m|h|d)$/i)

    if (!match) return null

    const value = Number(match[1])

    const unit = match[2].toLowerCase()

    const time = {
        s: 1000,

        m: 60000,

        h: 3600000,

        d: 86400000
    }

    return Date.now() + value * time[unit]
}
