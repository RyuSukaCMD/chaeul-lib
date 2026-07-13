import { smallcaps as sc } from "../../lib/font.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { checkAdmin } from "../../lib/groupadmin.js"
import { addWarn, reduceWarn, resetWarn, listWarn, getWarn, WARN_LIMIT } from "../../lib/warn.js"

async function pickTarget(sock, m, args) {
    let raw = m.mentionedJid?.[0] || m.quoted?.sender
    if (!raw) {
        const num = args.find((a) => /^\d{6,}$/.test(a.replace(/\D/g, "")))
        if (num) raw = num.replace(/\D/g, "") + "@s.whatsapp.net"
    }
    return raw ? await resolvePn(sock, m, raw) : null
}

export default {
    command: ["warn", "unwarn", "delwarn", "resetwarn", "warnlist", "listwarn"],

    category: "Group",

    description: "Kelola peringatan (warn) member grup",

    async run({ sock, m, command, args, isCreator }) {
        if (!m.isGroup) return m.reply("Command ini hanya untuk grup.")

        const { isAdmin, isBotAdmin, metadata } = await checkAdmin(sock, m, isCreator)
        if (!isAdmin) return m.reply("Khusus admin grup.")

        // ── LIST ──
        if (command === "warnlist" || command === "listwarn") {
            const list = listWarn(m.chat)
            if (!list.length) {
                return m.reply(
                    `╭─ ⚠️ ${sc("WARN LIST")} ─⬣\n│\n│ ${sc("Belum ada warn")}.\n│\n╰──────────────⬣`
                )
            }
            const mentions = list.map((x) => `${x.number}@s.whatsapp.net`)
            let text = `╭─ ⚠️ ${sc("WARN LIST")} ─⬣\n│\n`
            list.forEach((x, i) => {
                text += `│ ${i + 1}. @${x.number} — ${x.count}/${WARN_LIMIT}\n`
            })
            text += `│\n╰──────────────⬣`
            return m.reply(text, { mentions })
        }

        // ── perlu target ──
        const target = await pickTarget(sock, m, args)
        if (!target) {
            return m.reply(
                `╭─ ⚠️ ${sc("WARN")} ─⬣\n│\n│ ${sc("Tag/reply/nomor user")}.\n│\n│ ${sc("Contoh")}: ${global.prefix}${command} @user\n╰──────────────⬣`
            )
        }

        if (command === "resetwarn") {
            resetWarn(m.chat, target)
            return m.reply(`✅ ${sc("Warn")} ${tag(target)} ${sc("direset")}.`, {
                mentions: [target]
            })
        }

        if (command === "unwarn" || command === "delwarn") {
            const left = reduceWarn(m.chat, target, 1)
            return m.reply(`✅ ${tag(target)} — ${sc("warn")}: ${left}/${WARN_LIMIT}`, {
                mentions: [target]
            })
        }

        // command === "warn"
        const count = addWarn(m.chat, target, 1)

        // Kick bila mencapai batas
        if (count >= WARN_LIMIT) {
            if (!isBotAdmin) {
                return m.reply(
                    `⚠️ ${tag(target)} ${sc("mencapai")} ${WARN_LIMIT} warn,\n` +
                        `${sc("tapi bot bukan admin (tidak bisa kick)")}.`,
                    { mentions: [target] }
                )
            }
            try {
                const part = metadata?.participants.find(
                    (p) => p.id === target || p.phoneNumber === target
                )
                await sock.groupParticipantsUpdate(m.chat, [part?.id || target], "remove")
                resetWarn(m.chat, target)
                return m.reply(
                    `🚫 ${tag(target)} ${sc("dikeluarkan")} (${WARN_LIMIT}/${WARN_LIMIT} warn).`,
                    { mentions: [target] }
                )
            } catch {
                return m.reply(`⚠️ ${sc("Gagal kick")} ${tag(target)}.`, { mentions: [target] })
            }
        }

        return m.reply(
            `⚠️ ${tag(target)} ${sc("diberi peringatan")}.\n` +
                `${sc("Warn")}: ${count}/${WARN_LIMIT}`,
            { mentions: [target] }
        )
    }
}
