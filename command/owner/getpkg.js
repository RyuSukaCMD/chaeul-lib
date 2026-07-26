import fs from "fs"
import path from "path"
import { card } from "../../lib/ui.js"

const PKG_FILE = path.resolve("./package.json")

export default {
    command: ["getpkg"],

    owner: true,

    category: "Owner",

    description: "Ambil package.json (teks / file)",

    async run({ m, args }) {
        // -t (teks) / -f (file). Default: teks (package.json kecil).
        const flags = args.map((a) => String(a || "").toLowerCase())

        const junk = args.filter(
            (a) => !["-t", "--text", "-f", "--file"].includes(String(a || "").toLowerCase())
        )

        if (junk.length)
            return m.reply(
                card(
                    "GET PKG",
                    [
                        "Format:",
                        `${global.prefix}getpkg -t (teks)`,
                        `${global.prefix}getpkg -f (file)`
                    ],
                    { emoji: "📦", footer: "Tanpa flag = kirim sebagai teks." }
                )
            )

        const asFile = flags.includes("-f") || flags.includes("--file")

        if (!fs.existsSync(PKG_FILE))
            return m.reply(card("GET PKG", "❌ package.json tidak ditemukan.", { emoji: "📦" }))

        if (asFile) return m.sendDocument(PKG_FILE, "package.json", { mimetype: "application/json" })

        const code = fs.readFileSync(PKG_FILE, "utf8")

        return m.reply(`📦 *package.json*\n\n\`\`\`json\n${code}\n\`\`\``)
    }
}
