import { readJSON, writeJSON } from "./db.js"

const DB = "./database/afk.json"

function load() {
    return readJSON(DB, {})
}

function save(data) {
    writeJSON(DB, data)
}

export function setAfk(sender, reason = "") {
    const db = load()

    db[sender] = {
        reason,

        time: Date.now()
    }

    save(db)
}

export function getAfk(sender) {
    return load()[sender] || null
}

export function isAfk(sender) {
    return !!getAfk(sender)
}

export function delAfk(sender) {
    const db = load()

    delete db[sender]

    save(db)
}

export function getAllAfk() {
    return load()
}
