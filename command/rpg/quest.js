import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn } from "../../lib/resolve.js"
import {
    getPlayer,
    addItem,
    removeItem,
    markQuestDone,
    isQuestDone,
    getActiveQuest,
    setActiveQuest,
    ITEMS
} from "../../lib/rpg.js"
import { QUESTS, getQuest, questStatus, isQuestComplete } from "../../lib/quest.js"

export default {
    command: ["quest", "rodquest", "quests", /^quest_pick:.+$/, /^quest_claim:.+$/, "quest_stop"],

    category: "RPG",

    description: "Rod Quest — pilih quest, lalu progress-nya jalan tiap mancing",

    async run({ sock, m, command }) {
        const me = await resolvePn(sock, m, m.sender)

        // ── Pilih (aktifkan) quest ──
        if (command.startsWith("quest_pick:")) {
            const qid = command.split(":")[1]
            const q = getQuest(qid)
            if (!q) return m.reply(card("QUEST", "Quest tidak ditemukan.", { emoji: "📜" }))
            if (isQuestDone(me, qid))
                return m.reply(card("QUEST", `${q.name} sudah selesai.`, { emoji: "✅" }))
            setActiveQuest(me, qid)
            await m.react("🎯")
            return this.run({ sock, m, command: "quest" }) // tampilkan ulang
        }

        // ── Berhenti dari quest aktif ──
        if (command === "quest_stop") {
            setActiveQuest(me, null)
            await m.react("🛑")
            return this.run({ sock, m, command: "quest" })
        }

        // ── Klaim reward ──
        if (command.startsWith("quest_claim:")) {
            const qid = command.split(":")[1]
            const q = getQuest(qid)
            if (!q) return m.reply(card("QUEST", "Quest tidak ditemukan.", { emoji: "📜" }))
            if (isQuestDone(me, qid))
                return m.reply(card("QUEST", `${q.name} sudah selesai.`, { emoji: "✅" }))
            if (!isQuestComplete(me, qid))
                return m.reply(card("QUEST", `Syarat ${q.name} belum lengkap.`, { emoji: "📜" }))

            // Konsumsi bahan
            for (const r of q.reqs) {
                if (r.consume)
                    for (const [item, qty] of Object.entries(r.consume)) removeItem(me, item, qty)
            }
            addItem(me, q.reward, 1)
            markQuestDone(me, qid)
            if (getActiveQuest(me) === qid) setActiveQuest(me, null)
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
                        `Equip rod: cek ${global.prefix}inventory`
                    ],
                    { emoji: "🏆" }
                )
            )
        }

        // ── Menu utama: daftar quest + status ──
        const statuses = questStatus(me)
        const active = getActiveQuest(me)
        const lines = []
        const rows = []

        for (const s of statuses) {
            const q = s.quest
            const isActive = active === q.id
            const badge = s.done
                ? "✅ SELESAI"
                : s.claimable
                  ? "🎁 SIAP KLAIM"
                  : isActive
                    ? "🎯 AKTIF"
                    : "🔒 belum dipilih"
            lines.push(`${q.emoji} *${q.name}* — ${badge}`)
            lines.push(`   ${q.desc}`)
            if (isActive || s.claimable) {
                for (const r of s.reqs)
                    lines.push(`   ${r.ok ? "✅" : "◻️"} ${r.label} (${r.progress})`)
            }
            lines.push(``)

            if (!s.done) {
                rows.push({
                    title: `${isActive ? "🎯 " : ""}${q.emoji} ${q.name}`,
                    description: s.claimable
                        ? "Siap klaim!"
                        : isActive
                          ? "Sedang aktif"
                          : "Pilih untuk aktifkan",
                    id: `quest_pick:${q.id}`
                })
            }
        }

        lines.push(`ℹ️ Pilih 1 quest untuk diaktifkan. Progress`)
        lines.push(`jalan otomatis setiap kamu mancing.`)

        const buttons = []
        const claimable = statuses.find((s) => s.claimable)
        if (claimable)
            buttons.push({
                type: "quick",
                text: `🎁 Klaim ${claimable.quest.name}`,
                id: `quest_claim:${claimable.quest.id}`
            })
        if (active) buttons.push({ type: "quick", text: "🛑 Berhenti", id: "quest_stop" })

        return Button.menu({
            sock,
            m,
            body: card("ROD QUEST", lines, { emoji: "📜" }),
            footer: "© Chaeul RPG",
            lock: me,
            listTitle: "📜 Pilih Quest",
            sections: rows.length ? [{ title: "✦ DAFTAR QUEST", rows }] : undefined,
            buttons: buttons.length ? buttons : undefined
        })
    }
}
