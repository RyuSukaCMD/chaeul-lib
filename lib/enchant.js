// ═══════════════════════════════════════════════════════════
//  SISTEM ENCHANT ROD (RANDOM)
//  - 1 jenis Enchant Stone (rarity EPIC), item id "enchantstone".
//    Didapat dengan MEMANCING di Sacred Jungle (muncul seperti ikan).
//  - Enchant bersifat RANDOM: pakai 1 stone → dapat enchant acak
//    (bobot: rarity lemah lebih sering muncul).
//  - 1 enchant per rod (menimpa yang lama, dengan konfirmasi).
//  - Enchant tampil di NAMA rod pada inventory.
// ═══════════════════════════════════════════════════════════

export const STONE_ITEM = "enchantstone"
export const STONE_INFO = {
    name: "Enchant Stone",
    emoji: "🔮",
    item: STONE_ITEM,
    rarity: "epic"
}

const TIER_LABEL = {
    common: "Common",
    uncommon: "Uncommon",
    rare: "Rare",
    epic: "Epic",
    legendary: "Legendary",
    mythical: "Mythical"
}
const TIER_EMOJI = {
    common: "⚪",
    uncommon: "🟢",
    rare: "🔵",
    epic: "🟣",
    legendary: "🟡",
    mythical: "🟠"
}

// Bobot roll per tier (lemah = lebih sering muncul).
const TIER_WEIGHT = {
    common: 4000,
    uncommon: 2500,
    rare: 1400,
    epic: 700,
    legendary: 300,
    mythical: 100
}

// Daftar enchant.
export const ENCHANTS = {
    // Common
    goldhand: {
        id: "goldhand",
        name: "Gold Hand",
        tier: "common",
        emoji: "🫰",
        desc: "Menaikkan chance mutasi Gold ikan.",
        effect: { goldMutBoost: 3 }
    },
    hopeful: {
        id: "hopeful",
        name: "Hopeful",
        tier: "common",
        emoji: "🍀",
        desc: "Chance +5% dapat ikan yang belum ada di index.",
        effect: { newFishChance: 0.05 }
    },
    steady: {
        id: "steady",
        name: "Steady Grip",
        tier: "common",
        emoji: "✊",
        desc: "Waktu tarik kail lebih lama sedikit (lebih mudah).",
        effect: { extraTime: 5000 }
    },
    // Uncommon
    reefshouter: {
        id: "reefshouter",
        name: "Reef Shouter",
        tier: "uncommon",
        emoji: "📢",
        desc: "Menaikkan chance ikan langka di Coral Reefs.",
        effect: { coralRareBoost: 2 }
    },
    lightningreel: {
        id: "lightningreel",
        name: "Lightning Reel",
        tier: "uncommon",
        emoji: "⚡",
        desc: "Kecepatan menangkap ikan +5%.",
        effect: { reelSpeed: 0.05 }
    },
    // Rare
    doublereel: {
        id: "doublereel",
        name: "Double Reel",
        tier: "rare",
        emoji: "🎣",
        desc: "Chance 8% menangkap 2 ikan sekaligus.",
        effect: { doubleCatch: 0.08 }
    },
    treasure: {
        id: "treasure",
        name: "Treasure Seeker",
        tier: "rare",
        emoji: "💰",
        desc: "Nilai jual ikan +15%.",
        effect: { sellBoost: 0.15 }
    },
    // Epic
    luckycharm: {
        id: "luckycharm",
        name: "Lucky Charm",
        tier: "epic",
        emoji: "🌟",
        desc: "Luck memancing +50% (ikan langka lebih sering).",
        effect: { luckBoost: 1.5 }
    },
    mutator: {
        id: "mutator",
        name: "Mutator",
        tier: "epic",
        emoji: "🧬",
        desc: "Semua chance mutasi ikan ×2.",
        effect: { mutationBoost: 2 }
    },
    // Legendary
    triplecatch: {
        id: "triplecatch",
        name: "Triple Reel",
        tier: "legendary",
        emoji: "🎏",
        desc: "Chance 6% menangkap 3 ikan sekaligus.",
        effect: { doubleCatch: 0.1, tripleChance: 0.06 }
    },
    goldrush: {
        id: "goldrush",
        name: "Gold Rush",
        tier: "legendary",
        emoji: "🤑",
        desc: "Nilai jual ikan +40%.",
        effect: { sellBoost: 0.4 }
    },
    // Mythical
    poseidon: {
        id: "poseidon",
        name: "Poseidon's Favor",
        tier: "mythical",
        emoji: "🔱",
        desc: "Luck ×2, mutasi ×2, dan +5% ikan baru. Berkah lautan!",
        effect: { luckBoost: 2, mutationBoost: 2, newFishChance: 0.05 }
    }
}

export const ENCHANT_ORDER = Object.keys(ENCHANTS)

export function getEnchant(id) {
    return ENCHANTS[id] || null
}
export function enchantLabel(id) {
    const e = ENCHANTS[id]
    if (!e) return "-"
    return `${e.emoji} ${e.name}`
}
export function enchantTierLabel(id) {
    const e = ENCHANTS[id]
    if (!e) return "-"
    return `${TIER_EMOJI[e.tier]} ${TIER_LABEL[e.tier]}`
}
export function tierLabel(tier) {
    return `${TIER_EMOJI[tier] || ""} ${TIER_LABEL[tier] || tier}`
}

/** Roll enchant acak berbobot (rarity lemah lebih sering). */
export function rollEnchant() {
    const entries = ENCHANT_ORDER.map((id) => [id, TIER_WEIGHT[ENCHANTS[id].tier] || 100])
    const sum = entries.reduce((s, [, w]) => s + w, 0)
    let roll = Math.random() * sum
    for (const [id, w] of entries) {
        roll -= w
        if (roll <= 0) return id
    }
    return ENCHANT_ORDER[0]
}

/** Gabungkan efek enchant aktif jadi objek buff. */
export function enchantEffect(enchantId) {
    const base = {
        goldMutBoost: 1,
        newFishChance: 0,
        coralRareBoost: 1,
        reelSpeed: 0,
        doubleCatch: 0,
        tripleChance: 0,
        sellBoost: 0,
        luckBoost: 1,
        mutationBoost: 1,
        extraTime: 0
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
    enchantTierLabel,
    tierLabel,
    rollEnchant,
    enchantEffect
}
