import { askAI } from "../../lib/ai.js"
import { tokenFooter } from "../../lib/dlformat.js"
import { resolvePn } from "../../lib/resolve.js"

export default {
    command: ["ai", "starnova", "gpt"],

    category: "AI",

    description: "Tanya Starnova AI",

    async run({ sock, m, text }) {
        if (!text) {
            return m.reply(
                `╭━━━〔 🤖 STARNOVA AI 〕━━━⬣\n` +
                    `Masukkan pertanyaan kamu.\n\n` +
                    `Contoh:\n` +
                    `${global.prefix}ai apa itu black hole?\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }

        await m.react("🤖")

        try {
            const answer = await askAI(text)

            const me = await resolvePn(sock, m, m.sender)

            await m.reply(
                `╭━━━〔 🤖 STARNOVA AI 〕━━━⬣\n` +
                    `${answer}\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣\n` +
                    `${tokenFooter(me)}`
            )

            return m.react("✅")
        } catch (e) {
            await m.react("❌")
            return m.reply(
                `╭━━━〔 ⚠️ AI ERROR 〕━━━⬣\n` + `${e.message}\n` + `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }
    }
}
