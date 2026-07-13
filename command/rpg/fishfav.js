import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, isFav, addFav, removeFav } from "../../lib/rpg.js"
import { MUTATIONS } from "../../lib/fish.js"
import { getFishById } from "../../lib/island.js"
import { RARITY } from "../../lib/fish.js"

const PER_PAGE = 5
const MUT_MAP = Object.fromEntries(MUTATIONS.map((mt) => [mt.id, mt]))

// Simpan message key terakhir per-user agar bisa dihapus saat pindah page.
const lastMsg = new Map() // number -> messageKey

// Kumpulkan daftar ikan unik (id) yang dimiliki player (tanpa duplikat mutation).
function ownedFishIds(p) {
    const seen = new Set()
    const list = []
    for (const key of Object.keys(p.inventory || {})) {
        const fid = key.split("#")[0]
        const fish = getFishById(fid)
        if (fish && !seen.has(fid)) {
            seen.add(fid)
            list.push(fish)
        }
    }
    // Urutkan: favorit dulu, lalu by index
    return list.sort((a, b) => a.island.localeCompare(b.island) || a.index - b.index)
}

async function render(sock, m, me, page) {
    const p = getPlayer(me)
    const fishes = ownedFishIds(p)
    const totalPages = Math.max(1, Math.ceil(fishes.length / PER_PAGE))
    page = Math.max(0, Math.min(page, totalPages - 1))

    // Hapus pesan sebelumnya (biar chat bersih saat next/prev)
    const prevKey = lastMsg.get(me)
    if (prevKey) {
        try {
            await sock.sendMessage(m.chat, { delete: prevKey })
        } catch {}
        lastMsg.delete(me)
    }

    if (!fishes.length) {
        return m.reply(
            card(
                "FISH FAVORITE",
                [`Kamu belum punya ikan.`, `Mancing dulu: ${global.prefix}mancing`],
                {
                    emoji: "⭐"
                }
            )
        )
    }

    const slice = fishes.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)

    const rows = slice.map((f) => {
        const fav = isFav(me, f.id)
        const rar = RARITY[f.rarity]
        return {
            title: `${fav ? "⭐" : "☆"} ${rar.emoji} ${f.emoji} ${f.name}`,
            description: `${rar.label} • ${fav ? "Favorit — tap untuk hapus" : "Tap untuk favoritkan"}`,
            id: `fav_toggle:${f.id}:${page}`
        }
    })

    const navButtons = []
    if (page > 0) navButtons.push({ type: "quick", text: "⬅️ Prev", id: `fav_page:${page - 1}` })
    if (page < totalPages - 1)
        navButtons.push({ type: "quick", text: "Next ➡️", id: `fav_page:${page + 1}` })

    const favCount = fishes.filter((f) => isFav(me, f.id)).length

    const sent = await Button.menu({
        sock,
        m,
        body: card(
            "FISH FAVORITE",
            [
                `⭐ Favorit melindungi ikan dari ${global.prefix}sell.`,
                `Total favorit: ${favCount}`,
                ``,
                `📄 Halaman ${page + 1}/${totalPages}`,
                `Tap ikan untuk favorite/unfavorite.`
            ],
            { emoji: "⭐" }
        ),
        footer: "© Chaeul RPG",
        lock: me,
        listTitle: "⭐ Pilih Ikan",
        sections: [{ title: `✦ IKAN (Hal ${page + 1}/${totalPages})`, rows }],
        buttons: navButtons
    })

    // Simpan key pesan baru untuk dihapus di navigasi berikutnya
    if (sent?.key) lastMsg.set(me, sent.key)
    return sent
}

export default {
    command: ["fishfav", "favfish", "fav", /^fav_page:.+$/, /^fav_toggle:.+$/],

    category: "RPG",

    description: "Favorite ikan agar tidak terjual (5/halaman, bisa hapus dari UI)",

    async run({ sock, m, command }) {
        const me = await resolvePn(sock, m, m.sender)

        // Pindah halaman
        if (command.startsWith("fav_page:")) {
            const page = Number(command.split(":")[1]) || 0
            return render(sock, m, me, page)
        }

        // Toggle favorite lalu render ulang halaman yang sama
        if (command.startsWith("fav_toggle:")) {
            const [, fid, pageStr] = command.split(":")
            const page = Number(pageStr) || 0
            if (isFav(me, fid)) removeFav(me, fid)
            else addFav(me, fid)
            return render(sock, m, me, page)
        }

        // Menu utama (halaman 0)
        return render(sock, m, me, 0)
    }
}
