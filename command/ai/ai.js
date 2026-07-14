import { card } from "../../lib/ui.js"
import { askAI, resetHistory, getHistory } from "../../lib/ai.js"
import { resolvePn } from "../../lib/resolve.js"

export default {
    command: ["ai", "starnova", "gpt", "tanya", "resetai"],

    category: "AI",

    description: "Ngobrol dengan Starnova AI (ada memori percakapan)",

    async run({ sock, m, command, text }) {
        const me = await resolvePn(sock, m, m.sender)

        // Reset memori percakapan
        if (command === "resetai" || text?.trim().toLowerCase() === "reset") {
            resetHistory(me)
            return m.reply(
                card("STARNOVA AI", "🧹 Memori percakapan dihapus. Mulai obrolan baru!", {
                    emoji: "🤖"
                })
            )
        }

        if (!text) {
            const hist = getHistory(me)
            return m.reply(
                card(
                    "STARNOVA AI",
                    [
                        `Tanya apa aja ke aku! 🤖`,
                        ``,
                        `Contoh:`,
                        `${global.prefix}ai apa itu black hole?`,
                        `${global.prefix}ai lanjutin ceritanya`,
                        ``,
                        hist.length
                            ? `💬 Ingatan aktif: ${hist.length / 2} obrolan`
                            : `💬 Belum ada obrolan`,
                        `Hapus memori: ${global.prefix}ai reset`
                    ],
                    { emoji: "🤖" }
                )
            )
        }

        await m.react("🤖")
        try {
            const answer = await askAI(text, { jid: me })
            await m.react("✅")
            return m.reply(card("STARNOVA AI", answer, { emoji: "🤖" }))
        } catch (e) {
            await m.react("❌")
            return m.reply(card("AI ERROR", e.message, { emoji: "⚠️" }))
        }
    }
}
