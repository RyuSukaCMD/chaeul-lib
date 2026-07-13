import { readJSON, writeJSON } from "./db.js"

const DB = "./database/blacklistgroup.json"

function load() {
    return readJSON(DB, [])
}

function save(data) {
    writeJSON(DB, data)
}

export function isBlacklist(chat) {
    return load().includes(chat)
}

export function addBlacklist(chat) {
    const db = load()

    if (!db.includes(chat)) {
        db.push(chat)

        save(db)
    }
}

export function delBlacklist(chat) {
    save(load().filter((id) => id !== chat))
}

export function getBlacklist() {
    return load()
}
