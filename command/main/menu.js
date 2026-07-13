import Button from "../../lib/button.js"
import Loader from "../../lib/loader.js"
import { smallcaps as sc, greeting } from "../../lib/font.js"
import { getWeather } from "../../lib/weather.js"

import { resolvePn } from "../../lib/resolve.js"
import { isRegistered, getAllUsers } from "../../lib/register.js"
import { hasAccount, getBalance } from "../../lib/token.js"
import { getMarriage } from "../../lib/marriage.js"
import { getPartner } from "../../lib/partner.js"

// Ikon per kategori untuk daftar menu
const CAT_ICON = {
    Main: "🏠",
    AI: "🤖",
    Downloader: "📥",
    Misc: "🧩",
    Sticker: "🖼️",
    Relationship: "💞",
    Minecraft: "🎮",
    Group: "👥",
    RPG: "🎮",
    Owner: "👑"
}

// Uptime ringkas
function uptime(sec) {
    const d = Math.floor(sec / 86400)
    const h = Math.floor((sec % 86400) / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = Math.floor(sec % 60)
    return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`
}

export default {
    command: ["menu", "help"],

    category: "Main",

    description: "Menampilkan menu bot",

    free: true,

    async run({ sock, m, isCreator }) {
        await m.react("📖")

        const me = await resolvePn(sock, m, m.sender)
        const num = me.split("@")[0]

        const registered = isCreator || isRegistered(me)
        const balance = hasAccount(me) ? getBalance(me) : 0
        const role = isCreator ? "Owner" : registered ? "Member" : "Tamu"

        const marriage = getMarriage(me)
        const partner = getPartner(me)
        let rel = "Single"
        if (marriage) rel = "Menikah"
        else if (partner) rel = "Pacaran"

        // Data
        const w = await getWeather()
        const groups = Loader.byCategory()
        const totalCmd = Loader.commandCount()
        const totalUser = getAllUsers().length
        const greet = greeting()

        // Ping bot (proses)
        const t0 = Date.now()
        const pingBot = Math.max(1, Date.now() - t0)

        // ─── Header: thumbnail gambar (bukan location) ───
        // Pakai thumbnail dari config bila URL, jika tidak pakai file lokal.
        const image =
            global.thumbnail && global.thumbnail.startsWith("http")
                ? { url: global.thumbnail }
                : "./media/menu.jpg"

        // ─── Body (cuaca dipindah ke sini) ───
        const body =
            `${sc("Hai")} @${num}, ${sc("saya")} ${sc("Chaeul")} 💎 ${sc("siap melayani")} ✦\n\n` +
            `🌤️ ${sc(w.condition)} · 🌡️ ${w.temp} · 📍 ${sc(w.city)}`

        // ─── Footer (statistik) ───
        const footer =
            `◈ ${sc("USER")}\n` +
            `╸ @${num}\n` +
            `╸ ${sc("Role")} : ✦ ${sc(role)}\n` +
            `╸ ${sc("Token")} : ${balance} 🪙  ·  ${sc(rel)}\n\n` +
            `◈ ${sc("BOT")}\n` +
            `╸ ${sc("Chaeul")} 💎  ·  v${global.version}\n` +
            `╸ ${totalCmd} ${sc("perintah")}  ·  ${totalUser} ${sc("user")}\n` +
            `╸ ${sc("uptime")} ${uptime(process.uptime())}\n` +
            `╸ ${sc("ping bot")} : ${pingBot}ms`

        // ─── Section 1: Menu Utama ───
        const mainRows = [
            {
                title: `✦ ${sc("Semua Fitur")}`,
                description: sc("Tampilkan seluruh list perintah bot"),
                id: ".allmenu"
            },
            {
                title: `✦ ${sc("Profil Saya")}`,
                description: sc("Lihat statistik akun kamu"),
                id: ".profile"
            },
            {
                title: `✦ ${sc("Panduan Bot")}`,
                description: sc("Cara pakai bot, aturan, dan info fitur"),
                id: ".guide"
            },
            {
                title: `✦ ${sc("Kontak Owner")}`,
                description: sc("Info kontak pengembang bot"),
                id: ".owner"
            }
        ]

        // ─── Section 2: Kategori Fitur (termasuk Owner Menu dll) ───
        const order = Object.keys(groups).sort((a, b) => {
            if (a === "Main") return -1
            if (b === "Main") return 1
            if (a === "Owner") return 1
            if (b === "Owner") return -1
            return a.localeCompare(b)
        })

        const catRows = []
        for (const cat of order) {
            if (cat === "Owner" && !isCreator) continue
            const icon = CAT_ICON[cat] || "📁"
            catRows.push({
                title: `${icon} ${sc(cat)}`,
                description: `${groups[cat].length} ${sc("perintah")}`,
                id: `.menucat ${cat.toLowerCase()}`
            })
        }

        const sections = [
            { title: `✦ ${sc("MENU UTAMA")}`, rows: mainRows },
            { title: `✦ ${sc("KATEGORI FITUR")}`, rows: catRows }
        ]

        // ─── Quick buttons (langsung reply) ───
        const buttons = [
            { type: "quick", text: `✦ ${sc("Ping")}`, id: ".ping" },
            { type: "quick", text: `✦ ${sc("Profil")}`, id: ".profile" },
            { type: "quick", text: `✦ ${sc("Semua Menu")}`, id: ".allmenu" },
            { type: "quick", text: `✦ ${sc("Panduan")}`, id: ".guide" }
        ]
        if (global.link) {
            buttons.push({ type: "url", text: `✦ ${sc("Saluran Owner")}`, url: global.link })
        }

        return Button.menu({
            sock,
            m,
            image,
            body,
            footer,
            sections,
            buttons,
            mentions: [me],
            lock: me,

            // Gaya "cloud menu"
            greeting: `✦ ${greet.text} ${greet.emoji}, ${sc(role)}!!`,
            listTitle: `✦ ${sc("Buka Menu")}`,
            signup: true,
            tapTarget: {
                title: "✦",
                description: `Chaeul v${global.version}`,
                url: global.link || "",
                domain: "chaeul.bot"
            }
        })
    }
}
