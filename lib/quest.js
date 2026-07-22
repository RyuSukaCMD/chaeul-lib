// ═══════════════════════════════════════════════════════════
//  ROD QUEST — progress dicatat otomatis setiap tangkapan.
//  Quest hanya satu yang aktif, lalu reward rod diklaim lewat .quest.
// ═══════════════════════════════════════════════════════════
import { getPlayer, getQStat, isQuestDone } from "./rpg.js"

// Definisi quest. requirements = [{ label, check(p) -> boolean, progress(p) -> "x/y" }]
export const QUESTS = [
    {
        id: "guitarrod",
        name: "Rock'in Guitar",
        emoji: "🎸",
        reward: "guitarrod",
        desc: "Rod bertenaga rock! (Luck 5.5, Reel 4)",
        reqs: [
            {
                label: "Dapatkan Holy String",
                check: (p) => (p.inventory?.holystring || 0) >= 1,
                progress: (p) => `${Math.min(1, p.inventory?.holystring || 0)}/1`,
                consume: { holystring: 1 }
            },
            {
                label: "Tangkap 1 Secret di Rock Island",
                check: (p, me) => getQStat(me, "secret@rock") >= 1,
                progress: (p, me) => `${Math.min(1, getQStat(me, "secret@rock"))}/1`
            },
            {
                label: "Miliki Rod Berlian",
                check: (p) => !!p.inventory?.diamondrod,
                progress: (p) => (p.inventory?.diamondrod ? "1/1" : "0/1")
            }
        ]
    },
    {
        id: "nightmarerod",
        name: "Nightmare Catcher",
        emoji: "🌙",
        reward: "nightmarerod",
        desc: "Rod dari mimpi buruk. (Luck 7.5, Reel 5)",
        reqs: [
            {
                label: "Tangkap 3 ikan Legendary bermutasi Ghost",
                check: (p, me) => getQStat(me, "mut:ghost@legendary") >= 3,
                progress: (p, me) => `${Math.min(3, getQStat(me, "mut:ghost@legendary"))}/3`
            },
            {
                label: "Tangkap 1 Secret di Haunted Sea",
                check: (p, me) => getQStat(me, "secret@haunted") >= 1,
                progress: (p, me) => `${Math.min(1, getQStat(me, "secret@haunted"))}/1`
            },
            {
                label: "Miliki Rod Rock'in Guitar",
                check: (p) => !!p.inventory?.guitarrod,
                progress: (p) => (p.inventory?.guitarrod ? "1/1" : "0/1")
            }
        ]
    },
    {
        id: "voidrod",
        name: "Void Reaper",
        emoji: "🕳️",
        reward: "voidrod",
        desc: "Rod dari kehampaan. (Luck 10, Reel 6)",
        reqs: [
            {
                label: "Tangkap The Drowned King (Haunted Sea)",
                check: (p, me) => getQStat(me, "fish:haunted_10") >= 1,
                progress: (p, me) => `${Math.min(1, getQStat(me, "fish:haunted_10"))}/1`
            },
            {
                label: "Tangkap 5 ikan Secret (total)",
                check: (p, me) => getQStat(me, "rarity:secret") >= 5,
                progress: (p, me) => `${Math.min(5, getQStat(me, "rarity:secret"))}/5`
            },
            {
                label: "Miliki Rod Nightmare Catcher",
                check: (p) => !!p.inventory?.nightmarerod,
                progress: (p) => (p.inventory?.nightmarerod ? "1/1" : "0/1")
            }
        ]
    },
    {
        id: "hellswand",
        name: "Hell's Wand",
        emoji: "🔥",
        reward: "hellswand",
        desc: "Tongkat dari gerbang neraka. (Luck 12, Reel 7)",
        reqs: [
            {
                label: "Tangkap 5 ikan di Hell's Gate",
                check: (p, me) => getQStat(me, "island:hells_gate") >= 5,
                progress: (p, me) => `${Math.min(5, getQStat(me, "island:hells_gate"))}/5`
            },
            {
                label: "Tangkap 1 ikan Abnormal di Hell's Gate",
                check: (p, me) => getQStat(me, "abnormal@hells_gate") >= 1,
                progress: (p, me) => `${Math.min(1, getQStat(me, "abnormal@hells_gate"))}/1`
            },
            {
                label: "Miliki Rod Void Reaper",
                check: (p) => !!p.inventory?.voidrod,
                progress: (p) => (p.inventory?.voidrod ? "1/1" : "0/1")
            }
        ]
    },
    {
        id: "heavenswand",
        name: "Heaven's Wand",
        emoji: "☁️",
        reward: "heavenswand",
        desc: "Tongkat dari gerbang surga. (Luck 15, Reel 8)",
        reqs: [
            {
                label: "Miliki Rod Hell's Wand",
                check: (p) => !!p.inventory?.hellswand,
                progress: (p) => (p.inventory?.hellswand ? "1/1" : "0/1")
            },
            {
                label: "Tangkap 3 ikan bermutasi Warped di Heaven's Gate",
                check: (p, me) => getQStat(me, "mut:warped@heavens_gate") >= 3,
                progress: (p, me) => `${Math.min(3, getQStat(me, "mut:warped@heavens_gate"))}/3`
            },
            {
                label: "Tangkap 1 ikan Abnormal di Heaven's Gate",
                check: (p, me) => getQStat(me, "abnormal@heavens_gate") >= 1,
                progress: (p, me) => `${Math.min(1, getQStat(me, "abnormal@heavens_gate"))}/1`
            }
        ]
    },
    {
        id: "infinityrod",
        name: "Infinity Rod",
        emoji: "♾️",
        reward: "infinityrod",
        desc: "Rod yang menembus batas waktu. (Luck 19, Reel 9)",
        reqs: [
            {
                label: "Miliki Rod Heaven's Wand",
                check: (p) => !!p.inventory?.heavenswand,
                progress: (p) => (p.inventory?.heavenswand ? "1/1" : "0/1")
            },
            {
                label: "Tangkap 2 ikan Extinct di Ancient Sea",
                check: (p, me) => getQStat(me, "extinct@ancient_sea") >= 2,
                progress: (p, me) => `${Math.min(2, getQStat(me, "extinct@ancient_sea"))}/2`
            },
            {
                label: "Tangkap 2 ikan bermutasi Flamed di Ancient Sea",
                check: (p, me) => getQStat(me, "mut:flamed@ancient_sea") >= 2,
                progress: (p, me) => `${Math.min(2, getQStat(me, "mut:flamed@ancient_sea"))}/2`
            }
        ]
    },
    {
        id: "exoticrod",
        name: "Exotic Rod",
        emoji: "🧬",
        reward: "exoticrod",
        desc: "Rod yang bereaksi dengan anomali. (Luck 24, Reel 10)",
        reqs: [
            {
                label: "Miliki Infinity Rod",
                check: (p) => !!p.inventory?.infinityrod,
                progress: (p) => (p.inventory?.infinityrod ? "1/1" : "0/1")
            },
            {
                label: "Tangkap 3 ikan Abnormal di Dimensional Rift",
                check: (p, me) => getQStat(me, "abnormal@dimensional_rift") >= 3,
                progress: (p, me) => `${Math.min(3, getQStat(me, "abnormal@dimensional_rift"))}/3`
            },
            {
                label: "Tangkap 1 ikan Extinct bermutasi Majestic di Dimensional Rift",
                check: (p, me) => getQStat(me, "mut:majestic@extinct@dimensional_rift") >= 1,
                progress: (p, me) =>
                    `${Math.min(1, getQStat(me, "mut:majestic@extinct@dimensional_rift"))}/1`
            }
        ]
    },
    {
        id: "charmerrod",
        name: "Charmer Rod",
        emoji: "💖",
        reward: "charmerrod",
        desc: "Rod terakhir yang memikat makhluk kosmik. (Luck 30, Reel 11)",
        reqs: [
            {
                label: "Miliki Exotic Rod",
                check: (p) => !!p.inventory?.exoticrod,
                progress: (p) => (p.inventory?.exoticrod ? "1/1" : "0/1")
            },
            {
                label: "Tangkap 3 ikan bermutasi Glitching di Nebula Gateway",
                check: (p, me) => getQStat(me, "mut:glitching@nebula_gateway") >= 3,
                progress: (p, me) => `${Math.min(3, getQStat(me, "mut:glitching@nebula_gateway"))}/3`
            },
            {
                label: "Tangkap 2 ikan Extinct di Nebula Gateway",
                check: (p, me) => getQStat(me, "extinct@nebula_gateway") >= 2,
                progress: (p, me) => `${Math.min(2, getQStat(me, "extinct@nebula_gateway"))}/2`
            },
            {
                label: "Tangkap 1 ikan bermutasi Majestic di Nebula Gateway",
                check: (p, me) => getQStat(me, "mut:majestic@nebula_gateway") >= 1,
                progress: (p, me) => `${Math.min(1, getQStat(me, "mut:majestic@nebula_gateway"))}/1`
            }
        ]
    }
]

export function getQuest(id) {
    return QUESTS.find((q) => q.id === id) || null
}

/** Ringkasan progres 1 quest untuk ditampilkan singkat (dipakai saat mancing). */
export function questProgressLines(me, questId) {
    const q = getQuest(questId)
    if (!q) return []
    const p = getPlayer(me)
    return q.reqs.map((r) => `${r.check(p, me) ? "✅" : "◻️"} ${r.label} (${r.progress(p, me)})`)
}

/** Apakah semua syarat quest terpenuhi (siap klaim). */
export function isQuestComplete(me, questId) {
    const q = getQuest(questId)
    if (!q) return false
    const p = getPlayer(me)
    return q.reqs.every((r) => r.check(p, me))
}

/** Status quest untuk player: { quest, done, claimable, reqs:[{label,ok,progress}] }. */
export function questStatus(me) {
    const p = getPlayer(me)
    return QUESTS.map((q) => {
        const reqs = q.reqs.map((r) => ({
            label: r.label,
            ok: r.check(p, me),
            progress: r.progress(p, me)
        }))
        const allOk = reqs.every((r) => r.ok)
        const done = isQuestDone(me, q.id)
        return { quest: q, done, claimable: allOk && !done, reqs }
    })
}

export default { QUESTS, getQuest, questStatus }
