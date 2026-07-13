import { smallcaps as sc } from "../../lib/font.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { checkAdmin } from "../../lib/groupadmin.js"
import { setBypass } from "../../lib/antilink.js"

export default {
    command: ["bypassantilink", "bypass"],

    category: "Group",

    description: "Beri kuota bypass antilink ke user",

    async run({ sock, m, args, isCreator }) {
        if (!m.isGroup) return m.reply("Command ini hanya untuk grup.")

        const { isAdmin } = await checkAdmin(sock, m, isCreator)
        if (!isAdmin) return m.reply("Khusus admin grup.")

        // Target: mention → reply → nomor di argumen
        let rawTarget = m.mentionedJid?.[0] || m.quoted?.sender
        const numberArg = args.find((a) => /^\d{6,}$/.test(a.replace(/\D/g, "")))
        if (!rawTarget && numberArg) {
            rawTarget = numberArg.replace(/\D/g, "") + "@s.whatsapp.net"
        }
        const target = await resolvePn(sock, m, rawTarget)

        // Jumlah: argumen angka terakhir yang bukan nomor target
        const nums = args.filter((a) => /^\d+$/.test(a))
        const count = parseInt(nums[nums.length - 1], 10)

        if (!target || isNaN(count) || count < 0) {
            return m.reply(
                `╭─ ♻️ ${sc("BYPASS ANTILINK")} ─⬣\n` +
                    `│\n` +
                    `│ ${sc("Tag/nomor + jumlah bypass")}.\n` +
                    `│\n` +
                    `│ ${sc("Contoh")}:\n` +
                    `│ ${global.prefix}bypassantilink @user 5\n` +
                    `│ ${global.prefix}bypassantilink 628xxx 5\n` +
                    `╰──────────────⬣`
            )
        }

        const left = setBypass(m.chat, target, count)

        return m.reply(
            `╭─ ♻️ ${sc("BYPASS ANTILINK")} ─⬣\n` +
                `│\n` +
                `│ 👤 ${tag(target)}\n` +
                `│ ♻️ ${sc("Kuota bypass")} : ${left}\n` +
                `│\n` +
                `╰──────────────⬣`,
            { mentions: [target] }
        )
    }
}
