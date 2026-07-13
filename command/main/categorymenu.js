import Button from "../../lib/button.js"
import Loader from "../../lib/loader.js"
import { smallcaps as sc } from "../../lib/font.js"
import { resolvePn } from "../../lib/resolve.js"
import { fullWIB } from "../../lib/time.js"

const CAT_ICON = {
    main: "🏠",
    ai: "🤖",
    downloader: "📥",
    misc: "🧩",
    sticker: "🖼️",
    relationship: "💞",
    minecraft: "🎮",
    group: "👥",
    rpg: "🎮",
    minecraft: "🎮",
    owner: "👑"
}

// Alias command lama → nama kategori
const ALIAS = {
    ownermenu: "owner",
    downloadermenu: "downloader",
    aimenu: "ai",
    relationshipmenu: "relationship",
    miscmenu: "misc",
    stickermenu: "sticker",
    rpgmenu: "rpg",
    groupmenu: "group",
    mainmenu: "main"
}

export default {
    command: ["menucat", "allmenu", "listmenu", ...Object.keys(ALIAS)],

    category: "Main",

    description: "Menu per-kategori / seluruh command",

    free: true,

    async run({ sock, m, command, args, isCreator }) {
        const me = await resolvePn(sock, m, m.sender)

        const groups = Loader.byCategory()

        // Peta kategori case-insensitive
        const catMap = {}
        for (const k of Object.keys(groups)) catMap[k.toLowerCase()] = k

        // ═══════════ ALL MENU ═══════════
        if (command === "allmenu" || command === "listmenu") {
            await m.react("📜")

            const order = Object.keys(groups).sort((a, b) => {
                if (a === "Main") return -1
                if (b === "Main") return 1
                if (a === "Owner") return 1
                if (b === "Owner") return -1
                return a.localeCompare(b)
            })

            let text =
                `╭━━━━━━━━━━━━━━━━━━━⬣\n` +
                `┃  📜 *${sc("SEMUA FITUR")}* ${sc("Chaeul")}\n` +
                `┃  🕒 ${fullWIB()}\n` +
                `╰━━━━━━━━━━━━━━━━━━━⬣\n`

            for (const cat of order) {
                if (cat === "Owner" && !isCreator) continue
                const icon = CAT_ICON[cat.toLowerCase()] || "📁"
                text += `\n┏━━〔 ${icon} ${sc(cat)} · ${groups[cat].length} 〕\n`
                for (const it of groups[cat]) {
                    text += `┃ ◦ ${global.prefix}${it.name}\n`
                }
                text += `┗━━━━━━━━━━━━━⬣\n`
            }
            text += `\n💡 ${sc("Total")} ${Loader.commandCount()} ${sc("perintah aktif")}`

            return Button.menu({
                sock,
                m,
                body: text,
                footer: "© Chaeul",
                mentions: [me],
                lock: me,
                buttons: [{ type: "quick", text: `✦ ${sc("Menu Utama")}`, id: ".menu" }]
            })
        }

        // ═══════════ MENU PER-KATEGORI ═══════════
        // .menucat <kategori>  ATAU  alias (.ownermenu dll)
        let catKey
        if (command === "menucat") {
            catKey = (args[0] || "").toLowerCase()
        } else {
            catKey = ALIAS[command]
        }

        const realCat = catMap[catKey]

        if (!realCat) {
            return m.reply(
                `╭━━━〔 📂 ${sc("KATEGORI")} 〕━━━⬣\n` +
                    `${sc("Kategori tidak ditemukan")}.\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }

        // Kategori Owner hanya untuk owner
        if (realCat === "Owner" && !isCreator) {
            return m.reply(global.mess.owner)
        }

        await m.react("📂")

        const items = groups[realCat] || []
        const icon = CAT_ICON[realCat.toLowerCase()] || "📁"

        let list = ""
        for (const it of items) {
            const alias = it.aliases.length ? `  ⌁ ${it.aliases.join(", ")}` : ""
            list += `┃ ◦ *${global.prefix}${it.name}*${alias}\n`
            if (it.description) list += `┃    ↳ ${it.description}\n`
        }
        if (!items.length) list = `┃ ${sc("Belum ada command")}.\n`

        const body =
            `╭━━━━━━━━━━━━━━━━━━━⬣\n` +
            `┃  ${icon} *${sc(realCat.toUpperCase() + " MENU")}*\n` +
            `┃  🕒 ${fullWIB()}\n` +
            `┣━━━━━━━━━━━━━━━━━━━⬣\n` +
            list +
            `┗━━ ${items.length} ${sc("perintah")} ━━⬣`

        return Button.menu({
            sock,
            m,
            body,
            footer: "© Chaeul",
            mentions: [me],
            lock: me,
            buttons: [{ type: "quick", text: `✦ ${sc("Menu Utama")}`, id: ".menu" }]
        })
    }
}
