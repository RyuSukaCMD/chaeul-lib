// ═══════════════════════════════════════════════════════════
//  FISH CATALOG — 11 rarities, + mutations
//  (English names, includes fictional/legendary creatures)
// ═══════════════════════════════════════════════════════════

export const RARITY = {
    common: {
        label: "Common",
        emoji: "⚪",
        weight: 3500,
        price: [20, 80],
        buttons: [1, 3],
        phases: 1
    },
    uncommon: {
        label: "Uncommon",
        emoji: "🟢",
        weight: 3000,
        price: [80, 200],
        buttons: [2, 4],
        phases: 1
    },
    rare: {
        label: "Rare",
        emoji: "🔵",
        weight: 1800,
        price: [200, 500],
        buttons: [3, 5],
        phases: 1
    },
    epic: {
        label: "Epic",
        emoji: "🟣",
        weight: 1000,
        price: [500, 1200],
        buttons: [3, 6],
        phases: 1
    },
    legendary: {
        label: "Legendary",
        emoji: "🟡",
        weight: 500,
        price: [1200, 3500],
        buttons: [4, 6],
        phases: [2, 3]
    },
    mythical: {
        label: "Mythical",
        emoji: "🟠",
        weight: 220,
        price: [3500, 9000],
        buttons: [4, 7],
        phases: [3, 4]
    },
    secret: {
        label: "Secret",
        emoji: "⬛",
        weight: 80,
        price: [9000, 25000],
        buttons: [5, 8],
        phases: [4, 5]
    },
    ephemeral: {
        label: "Ephemeral",
        emoji: "🌈",
        weight: 25,
        price: [25000, 70000],
        buttons: [6, 9],
        phases: [5, 6]
    },
    unreal: {
        label: "Unreal",
        emoji: "🔴",
        weight: 8,
        price: [70000, 200000],
        buttons: [7, 10],
        phases: [6, 8]
    },
    abnormal: {
        label: "Abnormal",
        emoji: "🧬",
        weight: 3,
        price: [200000, 650000],
        buttons: [8, 11],
        phases: [7, 9]
    },
    extinct: {
        label: "Extinct",
        emoji: "🦴",
        weight: 0.8,
        price: [650000, 1800000],
        buttons: [9, 12],
        phases: [8, 10]
    }
}

export const RARITY_ORDER = [
    "common",
    "uncommon",
    "rare",
    "epic",
    "legendary",
    "mythical",
    "secret",
    "ephemeral",
    "unreal",
    "abnormal",
    "extinct"
]

// Rarity yang punya PHASE (legendary ke atas). Phase disembunyikan dari user.
export const PHASE_RARITIES = [
    "legendary",
    "mythical",
    "secret",
    "ephemeral",
    "unreal",
    "abnormal",
    "extinct"
]

export const MUTATIONS = [
    { id: "shiny", name: "Shiny", emoji: "✨", mult: 2, chance: 8 },
    { id: "giant", name: "Giant", emoji: "🦣", mult: 2.5, chance: 5 },
    { id: "golden", name: "Golden", emoji: "🟡", mult: 3, chance: 3 },
    { id: "ghost", name: "Ghost", emoji: "👻", mult: 3.5, chance: 2 },
    { id: "ancient", name: "Ancient", emoji: "🏺", mult: 4, chance: 1.5 },
    { id: "rainbow", name: "Rainbow", emoji: "🌈", mult: 5, chance: 0.5 },
    { id: "warped", name: "Warped", emoji: "🌀", mult: 6, chance: 1.2 },
    { id: "flamed", name: "Flamed", emoji: "🔥", mult: 7, chance: 0.9 },
    { id: "majestic", name: "Majestic", emoji: "👑", mult: 10, chance: 0.4 },
    { id: "glitching", name: "Glitching", emoji: "👾", mult: 15, chance: 0.15 }
]

export function rollMutation(bonus = 1) {
    const r = Math.random() * 100
    let acc = 0
    for (const mut of MUTATIONS) {
        acc += mut.chance * bonus
        if (r < acc) return mut
    }
    return null
}

export function fishValue(fish, mutation) {
    return mutation ? Math.round(fish.price * mutation.mult) : fish.price
}

export function fishDisplay(fish, mutation) {
    const rEmoji = RARITY[fish.rarity].emoji
    const mut = mutation ? `${mutation.emoji} ${mutation.name} ` : ""
    return `${rEmoji} ${fish.emoji} ${mut}${fish.name}`
}

export default {
    RARITY,
    RARITY_ORDER,
    PHASE_RARITIES,
    MUTATIONS,
    rollMutation,
    fishValue,
    fishDisplay
}
