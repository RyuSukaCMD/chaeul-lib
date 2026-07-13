// ═══════════════════════════════════════════════════════════
//  SISTEM ENCHANT ROD
//  - Enchant menempel di rod (1 enchant per rod, menimpa yg lama).
//  - Membutuhkan Enchant Stone sesuai tier:
//      common enchant  → common stone   (item id: "enchantstone")
//      uncommon enchant→ uncommon stone (item id: "enchantstone_uncommon")
//      rare enchant    → rare stone     (item id: "enchantstone_rare")
//  - Rare stone bisa didapat dari Sacred Jungle (chance saat mancing).
// ═══════════════════════════════════════════════════════════

// Item id enchant stone per tier.
export const STONE_ITEM = {
    common: "enchantstone",
    uncommon: "enchantstone_uncommon",
    rare: "enchantstone_rare"
}

export const STONE_INFO = {
    common: { name: "Enchant Stone (Common)", emoji: "🪨", item: STONE_ITEM.common },
    uncommon: { name: "Enchant Stone (Uncommon)", emoji: "💠", item: STONE_ITEM.uncommon },
    rare: { name: "Enchant Stone (Rare)", emoji: "🔮", item: STONE_ITEM.rare }
}

// Daftar enchant.
export const ENCHANTS = {
    goldhand: {
        id: "goldhand",
        name: "Gold Hand",
        tier: "common",
        emoji: "🫰",
        desc: "Menaikkan chance mutasi Gold (Golden) ikan.",
        effect: { goldMutBoost: 3 } // pengali chance mutasi golden
    },
    hopeful: {
        id: "hopeful",
        name: "Hopeful",
        tier: "common",
        emoji: "🍀",
        desc: "Chance +5% mendapat ikan yang belum ada di index (island).",
        effect: { newFishChance: 0.05 }
    },
    reefshouter: {
        id: "reefshouter",
        name: "Reef Shouter",
        tier: "uncommon",
        emoji: "📢",
        desc: "Menaikkan chance ikan langka di island Coral Reefs.",
        effect: { coralRareBoost: 2 } // luck tambahan khusus Coral Reefs
    },
    lightningreel: {
        id: "lightningreel",
        name: "Lightning Reel",
        tier: "uncommon",
        emoji: "⚡",
        desc: "Menaikkan kecepatan menangkap ikan sebesar 5%.",
        effect: { reelSpeed: 0.05 } // pengurangan waktu tunggu 5%
    },
    doublereel: {
        id: "doublereel",
        name: "Double Reel",
        tier: "rare",
        emoji: "🎣",
        desc: "Chance 8% menangkap 2 ikan sekaligus.",
        effect: { doubleCatch: 0.08 }
    }
}

export const ENCHANT_ORDER = ["goldhand", "hopeful", "reefshouter", "lightningreel", "doublereel"]

const TIER_LABEL = { common: "Common", uncommon: "Uncommon", rare: "Rare" }
const TIER_EMOJI = { common: "⚪", uncommon: "🟢", rare: "🔵" }

export function getEnchant(id) {
    return ENCHANTS[id] || null
}

export function enchantLabel(id) {
    const e = ENCHANTS[id]
    if (!e) return "-"
    return `${e.emoji} ${e.name}`
}

export function tierLabel(tier) {
    return `${TIER_EMOJI[tier] || ""} ${TIER_LABEL[tier] || tier}`
}

/**
 * Gabungkan efek enchant aktif player jadi objek buff.
 * @param {string|null} enchantId
 * @returns {{ goldMutBoost, newFishChance, coralRareBoost, reelSpeed, doubleCatch }}
 */
export function enchantEffect(enchantId) {
    const base = {
        goldMutBoost: 1,
        newFishChance: 0,
        coralRareBoost: 1,
        reelSpeed: 0,
        doubleCatch: 0
    }
    const e = ENCHANTS[enchantId]
    if (!e) return base
    return { ...base, ...e.effect }
}

export default {
    STONE_ITEM,
    STONE_INFO,
    ENCHANTS,
    ENCHANT_ORDER,
    getEnchant,
    enchantLabel,
    tierLabel,
    enchantEffect
}
