// ═══════════════════════════════════════════════════════════
//  ROD QUEST — chance kecil dapat bahan langka (holy string dll)
//  saat mancing, lalu klaim rod lewat .quest bila syarat terpenuhi.
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
