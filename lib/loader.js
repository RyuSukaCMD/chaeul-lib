import fs from "fs"
import path from "path"

class Loader {
    constructor() {
        this.plugins = new Map()
    }

    walk(dir) {
        const files = []

        if (!fs.existsSync(dir)) return files

        for (const file of fs.readdirSync(dir)) {
            const location = path.join(dir, file)

            const stat = fs.statSync(location)

            if (stat.isDirectory()) {
                files.push(...this.walk(location))
            } else if (file.endsWith(".js")) {
                files.push(location)
            }
        }

        return files
    }

    async load(dir = "./command") {
        this.plugins.clear()

        const files = this.walk(dir)

        for (const file of files) {
            try {
                const module = await import(path.resolve(file) + "?update=" + Date.now())

                this.plugins.set(
                    file,

                    module.default
                )

                console.log("[LOAD]", file)
            } catch (e) {
                console.error(e)
            }
        }
    }

    async reload(file = null) {
        if (!file) return await this.load()

        try {
            const module = await import(path.resolve(file) + "?update=" + Date.now())

            this.plugins.set(
                file,

                module.default
            )

            return true
        } catch (e) {
            console.error(e)

            return false
        }
    }

    get(command) {
        command = String(command).trim()

        for (const plugin of this.plugins.values()) {
            if (!Array.isArray(plugin.command)) continue

            for (const cmd of plugin.command) {
                if (typeof cmd === "string") {
                    if (cmd.toLowerCase() === command.toLowerCase()) return plugin
                } else if (cmd instanceof RegExp) {
                    cmd.lastIndex = 0

                    if (cmd.test(command)) return plugin
                }
            }
        }

        return null
    }

    /**
     * Cocokkan body sebagai BUTTON (hasil klik tombol/pilihan), BUKAN command
     * biasa yang diketik. Button ditandai dengan:
     *   - diawali prefix bot (mis. ".allmenu", ".menucat main"), ATAU
     *   - mengandung karakter id tombol ("_" / ":"), ATAU
     *   - cocok dengan entri command berupa RegExp (mis. /^kick_yes:.*​/)
     * Kata biasa seperti "menu" TIDAK dianggap button.
     */
    getButton(body) {
        let text = String(body).trim()
        if (!text) return null

        // Bersihkan lock suffix agar pencocokan button ID presisi
        text = text.replace(/\u200b#lock=\d+$/, "")

        const looksLikeId = (global.prefix && text.startsWith(global.prefix)) || /[_:]/.test(text)

        for (const plugin of this.plugins.values()) {
            if (!Array.isArray(plugin.command)) continue

            for (const cmd of plugin.command) {
                if (cmd instanceof RegExp) {
                    cmd.lastIndex = 0
                    if (cmd.test(text)) return plugin
                } else if (typeof cmd === "string" && looksLikeId) {
                    if (cmd.toLowerCase() === text.toLowerCase()) return plugin
                }
            }
        }

        return null
    }

    /**
     * Menghitung total command (nama string) dari seluruh plugin.
     * Regex (handler tombol) tidak dihitung sebagai command.
     */
    commandCount() {
        let count = 0
        for (const plugin of this.plugins.values()) {
            if (!Array.isArray(plugin.command)) continue
            for (const cmd of plugin.command) {
                if (typeof cmd === "string") count++
            }
        }
        return count
    }

    /**
     * Mengelompokkan command per-kategori untuk keperluan menu.
     * Mengembalikan: { [category]: [{ name, description, aliases }] }
     * (Command utama = alias pertama; hanya string yang diambil.)
     */
    byCategory() {
        const groups = {}

        for (const plugin of this.plugins.values()) {
            if (!Array.isArray(plugin.command)) continue

            const names = plugin.command.filter((c) => typeof c === "string")
            if (!names.length) continue

            const category = plugin.category || "Lainnya"
            if (!groups[category]) groups[category] = []

            groups[category].push({
                name: names[0],
                aliases: names.slice(1),
                description: plugin.description || ""
            })
        }

        return groups
    }
}

export default new Loader()
