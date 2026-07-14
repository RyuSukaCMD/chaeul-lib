// Helper untuk memilih ikan lewat button (dipakai gift & trade).
import { getPlayer } from "./rpg.js"
import { MUTATIONS, RARITY, fishDisplay } from "./fish.js"
import { getFishById } from "./island.js"

const MUT_MAP = Object.fromEntries(MUTATIONS.map((mt) => [mt.id, mt]))
export const PER_PAGE = 6

/** Daftar ikan (key inventory) yang dimiliki player + info tampilan. */
export function listOwnedFish(jid) {
    const p = getPlayer(jid)
    const out = []
    for (const [key, qty] of Object.entries(p.inventory || {})) {
        const base = key.split("#")[0]
        const mid = key.split("#")[1]
        const fish = getFishById(base)
        if (!fish) continue
        out.push({
            key,
            baseId: base,
            qty,
            fish,
            mutation: mid ? MUT_MAP[mid] : null,
            rarity: fish.rarity,
            label: fishDisplay(fish, mid ? MUT_MAP[mid] : null)
        })
    }
    // Urutkan berdasarkan rarity (tinggi dulu) lalu nama
    const order = Object.keys(RARITY)
    return out.sort(
        (a, b) =>
            order.indexOf(b.rarity) - order.indexOf(a.rarity) || a.label.localeCompare(b.label)
    )
}

/** Bangun rows untuk 1 halaman. rowId dibuat lewat makeId(item). */
export function pageRows(items, page, makeId) {
    const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE))
    page = Math.max(0, Math.min(page, totalPages - 1))
    const slice = items.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)
    const rows = slice.map((it) => ({
        title: `${it.label} ×${it.qty}`,
        description: `${RARITY[it.rarity].label} • tap untuk pilih`,
        id: makeId(it)
    }))
    return { rows, page, totalPages }
}

export default { PER_PAGE, listOwnedFish, pageRows }
