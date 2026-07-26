import fs from "fs"
import path from "path"
import { card } from "../../lib/ui.js"

const LIB_DIR = path.resolve("./lib")

// Batas aman karakter pesan teks WhatsApp (~65k, ambil margin aman)
const TEXT_LIMIT = 55000

// Pisahkan flag -t (teks) / -f (file) dari nama file
function parseArgs(args) {
    let mode = null
    const names = []

    for (const raw of args) {
        const flag = String(raw || "").toLowerCase()

        if (flag === "-t" || flag === "--text") mode = "text"
        else if (flag === "-f" || flag === "--file") mode = "file"
        else names.push(raw)
    }

    return { mode, name: names.join(" ").trim() }
}

export default {
    command: ["getlib"],

    owner: true,

    category: "Owner",

    description: "Ambil library dari folder lib (teks / file)",

    async run({ m, args }) {
        const { mode, name } = parseArgs(args)

        if (!name)
            return m.reply(
                card(
                    "GET LIB",
                    [
                        "Format:",
                        `${global.prefix}getlib <namafile> -t (teks)`,
                        `${global.prefix}getlib <namafile> -f (file)`,
                        "",
                        "Contoh:",
                        `${global.prefix}getlib pterodactyl -f`
                    ],
                    { emoji: "📚", footer: "Tanpa flag = kirim sebagai file." }
                )
            )

        // Amankan path: hanya file .js langsung di dalam lib/ (anti traversal ../)
        const fileName = path.basename(name.replace(/\.js$/i, "")) + ".js"

        const file = path.join(LIB_DIR, fileName)

        if (!file.startsWith(LIB_DIR))
            return m.reply(card("GET LIB", "❌ Path tidak valid.", { emoji: "📚" }))

        if (!fs.existsSync(file) || !fs.statSync(file).isFile())
            return m.reply(
                card("GET LIB", ["❌ Library tidak ditemukan.", `📁 ${fileName}`], {
                    emoji: "📚",

                    footer: `Cek daftar dengan ${global.prefix}listlib`
                })
            )

        const sendAsText = mode === "text"

        if (sendAsText) {
            const code = fs.readFileSync(file, "utf8")

            if (code.length > TEXT_LIMIT)
                return m.reply(
                    card(
                        "GET LIB",
                        [
                            `⚠️ File terlalu panjang untuk teks (${code.length} karakter).`,

                            `📁 ${fileName}`
                        ],
                        { emoji: "📚", footer: `Gunakan ${global.prefix}getlib ${fileName} -f` }
                    )
                )

            return m.reply(`📄 *${fileName}*\n\n\`\`\`javascript\n${code}\n\`\`\``)
        }

        // Default / -f : kirim sebagai dokumen
        return m.sendDocument(file, fileName, { mimetype: "text/javascript" })
    }
}
