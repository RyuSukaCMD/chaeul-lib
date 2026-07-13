// ═══════════════════════════════════════════════════════════
//  KATALOG IKAN — 8 rarity, ≥50 ikan per rarity, + mutation
// ═══════════════════════════════════════════════════════════

// Konfigurasi rarity: peluang (weight), rentang harga, jumlah button,
// dan phase (mythical+ pakai multi-phase).
export const RARITY = {
    common: {
        label: "Common",
        emoji: "⚪",
        weight: 4000,
        price: [20, 80],
        buttons: [1, 3],
        phases: 1,
        color: "abu"
    },
    uncommon: {
        label: "Uncommon",
        emoji: "🟢",
        weight: 2200,
        price: [80, 200],
        buttons: [2, 4],
        phases: 1
    },
    rare: {
        label: "Rare",
        emoji: "🔵",
        weight: 1100,
        price: [200, 500],
        buttons: [3, 5],
        phases: 1
    },
    legendary: {
        label: "Legendary",
        emoji: "🟣",
        weight: 400,
        price: [500, 1500],
        buttons: [4, 6],
        phases: 1
    },
    mythical: {
        label: "Mythical",
        emoji: "🟠",
        weight: 120,
        price: [1500, 4000],
        buttons: [4, 7],
        phases: [2, 3]
    },
    unreal: {
        label: "Unreal",
        emoji: "🔴",
        weight: 40,
        price: [4000, 10000],
        buttons: [5, 8],
        phases: [2, 4]
    },
    ephemeral: {
        label: "Ephemeral",
        emoji: "🌈",
        weight: 12,
        price: [10000, 30000],
        buttons: [6, 9],
        phases: [3, 4]
    },
    godly: {
        label: "Godly",
        emoji: "✨",
        weight: 3,
        price: [30000, 100000],
        buttons: [7, 10],
        phases: [3, 5]
    }
}

export const RARITY_ORDER = [
    "common",
    "uncommon",
    "rare",
    "legendary",
    "mythical",
    "unreal",
    "ephemeral",
    "godly"
]

// Rarity yang memakai sistem phase (dikirim button per-phase)
export const PHASE_RARITIES = ["mythical", "unreal", "ephemeral", "godly"]

// ─── Mutation (menambah nilai) ───
export const MUTATIONS = [
    { id: "shiny", name: "Shiny", emoji: "✨", mult: 2, chance: 8 },
    { id: "giant", name: "Giant", emoji: "🦣", mult: 2.5, chance: 5 },
    { id: "golden", name: "Golden", emoji: "🟡", mult: 3, chance: 3 },
    { id: "ancient", name: "Ancient", emoji: "🏺", mult: 4, chance: 1.5 },
    { id: "rainbow", name: "Rainbow", emoji: "🌈", mult: 5, chance: 0.5 }
]

// ─── Nama ikan kreatif per rarity ───
const NAMES = {
    common: [
        "Ikan Teri",
        "Ikan Mas",
        "Ikan Lele",
        "Ikan Nila",
        "Ikan Mujair",
        "Ikan Gurame",
        "Ikan Bandeng",
        "Ikan Kembung",
        "Ikan Sarden",
        "Ikan Kakap Kecil",
        "Ikan Betok",
        "Ikan Sepat",
        "Ikan Wader",
        "Ikan Tawes",
        "Ikan Patin",
        "Ikan Gabus",
        "Ikan Belanak",
        "Ikan Selar",
        "Ikan Layang",
        "Ikan Cakalang Muda",
        "Ikan Tongkol Kecil",
        "Ikan Kerapu Muda",
        "Ikan Baung",
        "Ikan Sidat Muda",
        "Ikan Kakap Merah Kecil",
        "Ikan Nilem",
        "Ikan Beloso",
        "Ikan Julung",
        "Ikan Petek",
        "Ikan Kapasan",
        "Ikan Biji Nangka",
        "Ikan Kuniran",
        "Ikan Ekor Kuning Muda",
        "Ikan Buntal Kecil",
        "Ikan Kepe-kepe",
        "Ikan Sumpit",
        "Ikan Glodok",
        "Ikan Blodok",
        "Ikan Sepatung",
        "Ikan Cere",
        "Ikan Cupang Liar",
        "Ikan Molly",
        "Ikan Guppy",
        "Ikan Platy",
        "Ikan Rasbora",
        "Ikan Zebra Kecil",
        "Ikan Neon Muda",
        "Ikan Bada",
        "Ikan Depik",
        "Ikan Rinuak",
        "Ikan Bilih"
    ],
    uncommon: [
        "Ikan Kakap Putih",
        "Ikan Bawal",
        "Ikan Kerapu",
        "Ikan Baronang",
        "Ikan Kuwe",
        "Ikan Tenggiri",
        "Ikan Kurisi",
        "Ikan Selar Bentong",
        "Ikan Layur",
        "Ikan Ekor Kuning",
        "Ikan Bawal Bintang",
        "Ikan Kakatua",
        "Ikan Napoleon Muda",
        "Ikan Kakap Batu",
        "Ikan Sunu",
        "Ikan Kakap Tanduk",
        "Ikan Lencam",
        "Ikan Kakap Gigi Anjing",
        "Ikan Bubara",
        "Ikan Talang",
        "Ikan Cendro",
        "Ikan Alu-alu",
        "Ikan Bandeng Laut",
        "Ikan Manyung",
        "Ikan Kakap Domba",
        "Ikan Kakap Bahu Hitam",
        "Ikan Kerong-kerong",
        "Ikan Beronang Lada",
        "Ikan Kakap Jenaha",
        "Ikan Kakap Merah",
        "Ikan Kakap Kuning",
        "Ikan Barakuda Muda",
        "Ikan Cermin",
        "Ikan Kakap Sirip Kuning",
        "Ikan Selar Kuning",
        "Ikan Gerot-gerot",
        "Ikan Swanggi",
        "Ikan Peperek",
        "Ikan Kuro",
        "Ikan Senangin",
        "Ikan Bawal Hitam",
        "Ikan Kembung Lelaki",
        "Ikan Tembang",
        "Ikan Lemuru",
        "Ikan Japuh",
        "Ikan Terubuk",
        "Ikan Bulu Ayam",
        "Ikan Golok-golok",
        "Ikan Parang-parang",
        "Ikan Julung Besar"
    ],
    rare: [
        "Ikan Marlin Muda",
        "Ikan Tuna Sirip Kuning",
        "Ikan Sailfish",
        "Ikan Dorado",
        "Ikan Wahoo",
        "Ikan Mahi-mahi",
        "Ikan Barramundi Raja",
        "Ikan Giant Trevally",
        "Ikan Amberjack",
        "Ikan Cobia",
        "Ikan Tuna Mata Besar",
        "Ikan Tuna Sirip Biru Muda",
        "Ikan Kingfish",
        "Ikan Snook",
        "Ikan Tarpon",
        "Ikan Permit",
        "Ikan Roosterfish",
        "Ikan Yellowtail",
        "Ikan Grouper Raksasa",
        "Ikan Napoleon",
        "Ikan Humphead",
        "Ikan Pari Elang",
        "Ikan Hiu Karang",
        "Ikan Hiu Sirip Hitam",
        "Ikan Hiu Sirip Putih",
        "Ikan Pari Manta Muda",
        "Ikan Belut Moray",
        "Ikan Kerapu Kertang",
        "Ikan Sunu Batik",
        "Ikan Kakap Merah Raja",
        "Ikan Tuna Albacore",
        "Ikan Skipjack Raja",
        "Ikan Bonito",
        "Ikan Marlin Hitam Muda",
        "Ikan Marlin Biru Muda",
        "Ikan Swordfish Muda",
        "Ikan Opah Muda",
        "Ikan Lampuki",
        "Ikan Layaran",
        "Ikan Setuhuk",
        "Ikan Jenahak Raja",
        "Ikan Kaci-kaci",
        "Ikan Kurau",
        "Ikan Belida",
        "Ikan Arwana Merah",
        "Ikan Arwana Emas",
        "Ikan Peacock Bass",
        "Ikan Toman Raja",
        "Ikan Belida Raksasa",
        "Ikan Tapah"
    ],
    legendary: [
        "Ikan Marlin Biru",
        "Ikan Marlin Hitam",
        "Ikan Swordfish",
        "Ikan Opah",
        "Ikan Tuna Sirip Biru",
        "Ikan Hiu Macan",
        "Ikan Hiu Banteng",
        "Ikan Hiu Mako",
        "Ikan Pari Manta",
        "Ikan Coelacanth Muda",
        "Ikan Oarfish",
        "Ikan Sturgeon Beluga",
        "Ikan Arapaima",
        "Ikan Alligator Gar",
        "Ikan Wels Catfish",
        "Ikan Mekong Raksasa",
        "Ikan Goliath Tigerfish",
        "Ikan Piraiba",
        "Ikan Redtail Raksasa",
        "Ikan Naga Laut",
        "Ikan Sunfish Raksasa",
        "Ikan Mola Mola",
        "Ikan Hiu Martil",
        "Ikan Hiu Perawat Raksasa",
        "Ikan Pari Listrik",
        "Ikan Belut Listrik Raja",
        "Ikan Anglerfish",
        "Ikan Viperfish",
        "Ikan Gulper Eel",
        "Ikan Fangtooth",
        "Ikan Dragonfish",
        "Ikan Barreleye",
        "Ikan Frilled Shark",
        "Ikan Megamouth",
        "Ikan Goblin Shark",
        "Ikan Lanternfish Raja",
        "Ikan Stonefish Raja",
        "Ikan Lionfish Raja",
        "Ikan Napoleon Raksasa",
        "Ikan Bumphead Raja",
        "Ikan Humphead Wrasse",
        "Ikan Potato Cod",
        "Ikan Queensland Grouper",
        "Ikan Giant Barb",
        "Ikan Siamese Carp",
        "Ikan Nile Perch Raja",
        "Ikan Taimen",
        "Ikan Muskellunge",
        "Ikan Sturgeon Putih",
        "Ikan Paddlefish"
    ],
    mythical: [
        "Leviathan Kecil",
        "Kraken Muda",
        "Hydra Laut",
        "Serpent Abyssal",
        "Naga Air Kuno",
        "Ikan Phoenix Laut",
        "Behemoth Samudra",
        "Charybdis Muda",
        "Scylla Laut",
        "Ikan Roh Laut",
        "Ikan Bulan Purba",
        "Ikan Matahari Terbenam",
        "Ikan Aurora",
        "Ikan Kabut Malam",
        "Ikan Bintang Jatuh",
        "Ikan Badai",
        "Ikan Gerhana",
        "Ikan Ombak Abadi",
        "Ikan Palung Gelap",
        "Ikan Cahaya Bulan",
        "Ikan Naga Perak",
        "Ikan Naga Zamrud",
        "Ikan Naga Safir",
        "Ikan Naga Rubi",
        "Ikan Pusaran Air",
        "Ikan Angin Topan",
        "Ikan Guruh",
        "Ikan Kilat Laut",
        "Ikan Kabut Es",
        "Ikan Api Laut",
        "Ikan Batu Karang Purba",
        "Ikan Mutiara Hitam",
        "Ikan Kerang Raksasa",
        "Ikan Terumbu Kuno",
        "Ikan Rahasia Laut",
        "Ikan Legenda Nelayan",
        "Ikan Penjaga Palung",
        "Ikan Ratu Laut",
        "Ikan Raja Samudra",
        "Ikan Bayangan Air",
        "Ikan Gaib",
        "Ikan Sirip Kristal",
        "Ikan Ekor Prisma",
        "Ikan Mata Bulan",
        "Ikan Nyala Laut",
        "Ikan Purnama",
        "Ikan Sabit Malam",
        "Ikan Fajar",
        "Ikan Senja Abadi",
        "Ikan Cakrawala"
    ],
    unreal: [
        "Titan Samudra",
        "Leviathan Agung",
        "Kraken Purba",
        "Naga Laut Abadi",
        "Serigala Laut Mistis",
        "Ikan Dimensi",
        "Ikan Void",
        "Ikan Antar-Ruang",
        "Ikan Kuantum",
        "Ikan Paradoks",
        "Ikan Fatamorgana",
        "Ikan Ilusi",
        "Ikan Mimpi",
        "Ikan Bayang Kosmik",
        "Ikan Nebula",
        "Ikan Galaksi",
        "Ikan Lubang Hitam",
        "Ikan Supernova",
        "Ikan Meteor",
        "Ikan Komet",
        "Ikan Pulsar",
        "Ikan Quasar",
        "Ikan Materi Gelap",
        "Ikan Energi Gelap",
        "Ikan Singularitas",
        "Ikan Waktu",
        "Ikan Ruang",
        "Ikan Eter",
        "Ikan Plasma",
        "Ikan Anti-Materi",
        "Ikan Prisma Kosmik",
        "Ikan Spektrum",
        "Ikan Frekuensi",
        "Ikan Gelombang Purba",
        "Ikan Resonansi",
        "Ikan Gema Abadi",
        "Ikan Vortex",
        "Ikan Pusaran Kosmik",
        "Ikan Horizon",
        "Ikan Batas Realita",
        "Ikan Fana",
        "Ikan Semesta",
        "Ikan Inti Bintang",
        "Ikan Zenith",
        "Ikan Nadir",
        "Ikan Astral",
        "Ikan Eteris",
        "Ikan Transenden",
        "Ikan Infinitas",
        "Ikan Absolut"
    ],
    ephemeral: [
        "Ikan Sekejap",
        "Ikan Fana Abadi",
        "Ikan Waktu Terhenti",
        "Ikan Detik Terakhir",
        "Ikan Momen Beku",
        "Ikan Kilasan",
        "Ikan Bayang Sesaat",
        "Ikan Jejak Cahaya",
        "Ikan Napas Terakhir",
        "Ikan Embun Pagi",
        "Ikan Titik Nol",
        "Ikan Batas Waktu",
        "Ikan Lorong Waktu",
        "Ikan Dimensi Kelima",
        "Ikan Ilusi Sempurna",
        "Ikan Mimpi Basah Laut",
        "Ikan Fatamorgana Agung",
        "Ikan Cermin Retak",
        "Ikan Pecahan Realita",
        "Ikan Serpihan Jiwa",
        "Ikan Roh Purba",
        "Ikan Arwah Samudra",
        "Ikan Sukma Laut",
        "Ikan Eter Murni",
        "Ikan Cahaya Abadi",
        "Ikan Kegelapan Murni",
        "Ikan Hampa",
        "Ikan Sunyi",
        "Ikan Senyap",
        "Ikan Ketiadaan",
        "Ikan Keabadian",
        "Ikan Kehampaan",
        "Ikan Batas Akhir",
        "Ikan Gerbang",
        "Ikan Portal",
        "Ikan Ambang",
        "Ikan Kilau Sekejap",
        "Ikan Fajar Palsu",
        "Ikan Senja Palsu",
        "Ikan Bintang Mati",
        "Ikan Sisa Ledakan",
        "Ikan Debu Kosmik",
        "Ikan Napas Semesta",
        "Ikan Detak Waktu",
        "Ikan Nadi Realita",
        "Ikan Getar Eter",
        "Ikan Bisik Void",
        "Ikan Gaung Abadi",
        "Ikan Sirna",
        "Ikan Musnah"
    ],
    godly: [
        "Ikan Dewa Laut",
        "Poseidon Kecil",
        "Ikan Neptunus",
        "Ikan Triton",
        "Ikan Tuhan Samudra",
        "Ikan Pencipta",
        "Ikan Alfa Omega",
        "Ikan Keabadian Ilahi",
        "Ikan Cahaya Ilahi",
        "Ikan Takdir",
        "Ikan Nasib",
        "Ikan Kehendak Semesta",
        "Ikan Sumber Kehidupan",
        "Ikan Awal Mula",
        "Ikan Akhir Zaman",
        "Ikan Singgasana Laut",
        "Ikan Mahkota Samudra",
        "Ikan Kitab Laut",
        "Ikan Sabda",
        "Ikan Firman Samudra",
        "Ikan Roh Kudus Laut",
        "Ikan Cahaya Pertama",
        "Ikan Kegelapan Awal",
        "Ikan Big Bang",
        "Ikan Penciptaan",
        "Ikan Kiamat",
        "Ikan Kebangkitan",
        "Ikan Surga",
        "Ikan Nirwana",
        "Ikan Kayangan",
        "Ikan Dewa Petir",
        "Ikan Dewa Badai",
        "Ikan Dewa Ombak",
        "Ikan Dewa Palung",
        "Ikan Dewi Bulan",
        "Ikan Dewa Matahari",
        "Ikan Dewa Bintang",
        "Ikan Dewa Kosmos",
        "Ikan Dewa Waktu",
        "Ikan Dewa Ruang",
        "Ikan Dewa Takdir",
        "Ikan Dewa Kehidupan",
        "Ikan Dewa Kematian",
        "Ikan Raja Para Dewa",
        "Ikan Titah Ilahi",
        "Ikan Kuasa Mutlak",
        "Ikan Yang Maha",
        "Ikan Tak Terbatas",
        "Ikan Puncak Segalanya",
        "Ikan Omnipoten"
    ]
}

const EMOJI = {
    common: "🐟",
    uncommon: "🐠",
    rare: "🐡",
    legendary: "🦈",
    mythical: "🐉",
    unreal: "🌌",
    ephemeral: "🌈",
    godly: "✨"
}

// Build daftar ikan lengkap dengan id, harga, rarity
function buildCatalog() {
    const list = []
    for (const rarity of RARITY_ORDER) {
        const [minP, maxP] = RARITY.rarity ? [0, 0] : [0, 0]
        const cfg = RARITY[rarity]
        const names = NAMES[rarity]
        names.forEach((name, i) => {
            // Harga skala dalam rentang rarity berdasarkan indeks
            const t = names.length > 1 ? i / (names.length - 1) : 0
            const price = Math.round(cfg.price[0] + (cfg.price[1] - cfg.price[0]) * t)
            list.push({
                id: `${rarity}_${i}`,
                name,
                rarity,
                price,
                emoji: EMOJI[rarity]
            })
        })
    }
    return list
}

export const FISH = buildCatalog()

const byRarity = {}
for (const f of FISH) {
    ;(byRarity[f.rarity] ||= []).push(f)
}

/** Roll rarity berdasarkan weight (dipengaruhi luck rod untuk rarity tinggi). */
export function rollRarity(luck = 1) {
    // luck menaikkan weight rarity tinggi sedikit
    const entries = RARITY_ORDER.map((r) => {
        let w = RARITY[r].weight
        if (["mythical", "unreal", "ephemeral", "godly"].includes(r)) w *= luck
        return [r, w]
    })
    const total = entries.reduce((s, [, w]) => s + w, 0)
    let roll = Math.random() * total
    for (const [r, w] of entries) {
        roll -= w
        if (roll <= 0) return r
    }
    return "common"
}

/** Ambil ikan acak dari sebuah rarity. */
export function randomFishOf(rarity) {
    const pool = byRarity[rarity] || byRarity.common
    return pool[Math.floor(Math.random() * pool.length)]
}

/** Roll mutation (atau null). */
export function rollMutation() {
    const r = Math.random() * 100
    let acc = 0
    for (const mut of MUTATIONS) {
        acc += mut.chance
        if (r < acc) return mut
    }
    return null
}

/** Hitung nilai ikan setelah mutation. */
export function fishValue(fish, mutation) {
    const base = fish.price
    return mutation ? Math.round(base * mutation.mult) : base
}

/** Nama tampilan lengkap dgn mutation & rarity emoji. */
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
    FISH,
    rollRarity,
    randomFishOf,
    rollMutation,
    fishValue,
    fishDisplay
}
