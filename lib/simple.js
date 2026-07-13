import Handler from "./handler.js"
import fs from "fs"

export default async function simple(sock, m) {
    try {
        if (!m?.message) return

        if (global.autoRead) await sock.readMessages([m.key])

        await Handler(sock, m)
    } catch (e) {
        console.log(e)
    }
}
