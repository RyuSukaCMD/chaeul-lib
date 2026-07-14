import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import { getPlayer, addItem, removeItem, markQuestDone, ITEMS } from "../../lib/rpg.js"
import { QUESTS, getQuest, questStatus } from "../../lib/quest.js"

export default {
    command: ["quest", "rodquest", "quests", /^quest_claim:.+$/],

    category: "RPG",

    description: "Rod Quest — kumpulkan syarat untuk rod langka",

    async run({ sock, m, command }) {
        const me = await resolvePn(sock, m, m.sender)

        // ── Klaim reward quest ──
        if (command.startsWith("quest_claim:")) {
            const qid = command.split(":")[1]
            const q = getQuest(qid)
            if (!q) return m.reply(card("QUEST", "Quest tidak ditemukan.", { emoji: "📜" }))

            const status = questStatus(me).find((s) => s.quest.id === qid)
            if (status.done)
                return m.reply(card("QUEST", `Quest ${q.name} sudah selesai.`, { emoji: "✅" }))
            if (!status.claimable)
                return m.reply(card("QUEST", `Syarat ${q.name} belum lengkap.`, { emoji: "📜" }))

            // Konsumsi bahan (mis. holy string)
            for (const r of q.reqs) {
                if (r.consume) {
                    for (const [item, qty] of Object.entries(r.consume)) removeItem(me, item, qty)
                }
            }
            addItem(me, q.reward, 1)
            markQuestDone(me, qid)
            const rod = ITEMS[q.reward]

            await m.react("🎉")
            return m.reply(
                card(
                    "QUEST SELESAI!",
                    [
                        `${q.emoji} *${q.name}*`,
                        ``,
                        `🎁 Reward: ${rod.emoji} ${rod.name}`,
                        `🍀 Luck ${rod.luck} • 🎣 Reel ${rod.reel}`,
                        ``,
                        `Pakai rod: cek inventory & buy untuk equip.`
                    ],
                    { emoji: "🏆" }
                )
            )
        }

        // ── Tampilkan semua quest ──
        const statuses = questStatus(me)
        const lines = []
        for (const s of statuses) {
            const q = s.quest
            const badge = s.done ? "✅ SELESAI" : s.claimable ? "🎁 SIAP KLAIM" : "⏳ Berlangsung"
            lines.push(`${q.emoji} *${q.name}* — ${badge}`)
            lines.push(`   ${q.desc}`)
            for (const r of s.reqs) {
                lines.push(`   ${r.ok ? "✅" : "◻️"} ${r.label} (${r.progress})`)
            }
            lines.push(``)
        }

        // Tombol klaim untuk quest yang siap
        const claimable = statuses.filter((s) => s.claimable)
        const buttons = claimable.map((s) => ({
            type: "quick",
            text: `🎁 Klaim ${s.quest.name}`,
            id: `quest_claim:${s.quest.id}`
        }))

        return Button.menu({
            sock,
            m,
            body: card("ROD QUEST", lines, { emoji: "📜" }),
            footer: "© Chaeul RPG",
            lock: me,
            buttons: buttons.length ? buttons : undefined
        })
    }
}
