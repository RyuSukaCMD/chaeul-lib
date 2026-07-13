import Loader from "../../lib/loader.js"
import { card } from "../../lib/ui.js"
import { checkAdmin } from "../../lib/groupadmin.js"
import {
    disableCommand,
    enableCommand,
    isDisabled,
    isAdminOnly,
    disableAll,
    enableAll,
    isAllDisabled,
    isAllowed
} from "../../lib/groupmanage.js"

// Command yang tidak boleh dimatikan (agar grup tetap bisa dikelola)
const PROTECTED = [
    "registergroup",
    "reggroup",
    "unregistergroup",
    "unregroup",
    "disablecommand",
    "enablecommand",
    "listdisablecommand",
    "listdisabledcommand"
]

export default {
    command: ["disablecommand", "disablecmd", "enablecommand", "enablecmd"],

    category: "Group",

    description: "Matikan/aktifkan command di grup (bisa 'admin' = khusus admin)",

    async run({ sock, m, command, args, isCreator }) {
        if (!m.isGroup) return m.reply("Command ini hanya untuk grup.")

        const { isAdmin } = await checkAdmin(sock, m, isCreator)
        if (!isAdmin) return m.reply(card("GROUP", "Khusus admin grup.", { emoji: "🔒" }))

        const isEnable = command === "enablecommand" || command === "enablecmd"
        const target = (args[0] || "").toLowerCase().replace(new RegExp(`^\\${global.prefix}`), "")
        const adminFlag = (args[1] || "").toLowerCase() === "admin"

        if (!target) {
            return m.reply(
                card(
                    isEnable ? "ENABLE COMMAND" : "DISABLE COMMAND",
                    [
                        `Contoh:`,
                        `${global.prefix}${command} sticker`,
                        `${global.prefix}${command} all  (semua command)`,
                        !isEnable
                            ? `${global.prefix}disablecommand sticker admin  (khusus admin)`
                            : ``
                    ].filter(Boolean),
                    { emoji: "⚙️" }
                )
            )
        }

        // ── ALL: matikan / aktifkan SEMUA command sekaligus ──
        if (target === "all") {
            if (isEnable) {
                if (!isAllDisabled(m.chat)) {
                    return m.reply(
                        card("ENABLE COMMAND", `Semua command memang sudah aktif.`, {
                            emoji: "✅"
                        })
                    )
                }
                enableAll(m.chat)
                await m.react("✅")
                return m.reply(
                    card("ENABLE COMMAND", `✅ SEMUA command diaktifkan kembali.`, {
                        emoji: "✅"
                    })
                )
            }

            disableAll(m.chat)
            await m.react("✅")
            return m.reply(
                card(
                    "DISABLE COMMAND",
                    [
                        `🚫 SEMUA command dimatikan di grup ini.`,
                        `Command group management tetap aktif`,
                        `agar grup bisa dipulihkan.`,
                        ``,
                        `💡 Bisa mengaktifkan 1 command tertentu:`,
                        `${global.prefix}enablecommand <command>`,
                        `(mis. ${global.prefix}enablecommand menu)`,
                        ``,
                        `Aktifkan semua lagi: ${global.prefix}enablecommand all`
                    ],
                    { emoji: "⚙️" }
                )
            )
        }

        // Validasi command ada
        if (!Loader.get(target)) {
            return m.reply(card("COMMAND", `Command "${target}" tidak ditemukan.`, { emoji: "⚙️" }))
        }

        if (PROTECTED.includes(target)) {
            return m.reply(
                card("COMMAND", `Command "${target}" tidak bisa diubah (dilindungi).`, {
                    emoji: "⚙️"
                })
            )
        }

        if (isEnable) {
            const allOff = isAllDisabled(m.chat)
            // Bila "disable all" TIDAK aktif & command memang sudah aktif → info
            if (!allOff && !isDisabled(m.chat, target) && !isAdminOnly(m.chat, target)) {
                return m.reply(
                    card("ENABLE COMMAND", `Command "${target}" memang sudah aktif.`, {
                        emoji: "✅"
                    })
                )
            }
            // Bila sudah di-whitelist saat disable all → info
            if (allOff && isAllowed(m.chat, target)) {
                return m.reply(
                    card(
                        "ENABLE COMMAND",
                        `Command "${target}" sudah di-whitelist (aktif meski disable all).`,
                        { emoji: "✅" }
                    )
                )
            }
            enableCommand(m.chat, target)
            await m.react("✅")
            return m.reply(
                card(
                    "ENABLE COMMAND",
                    allOff
                        ? [
                              `✅ Command *${target}* di-whitelist!`,
                              `Command ini tetap aktif walau *disable all* menyala.`
                          ]
                        : `✅ Command *${target}* diaktifkan kembali.`,
                    { emoji: "✅" }
                )
            )
        }

        // disable
        disableCommand(m.chat, target, adminFlag)
        await m.react("✅")
        return m.reply(
            card(
                "DISABLE COMMAND",
                adminFlag
                    ? [
                          `🔒 Command *${target}* kini KHUSUS ADMIN.`,
                          `Member biasa tidak bisa memakainya.`
                      ]
                    : [
                          `🚫 Command *${target}* dimatikan di grup ini.`,
                          `Aktifkan lagi: ${global.prefix}enablecommand ${target}`
                      ],
                { emoji: "⚙️" }
            )
        )
    }
}
