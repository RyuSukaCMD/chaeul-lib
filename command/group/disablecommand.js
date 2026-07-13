import Loader from "../../lib/loader.js"
import { card } from "../../lib/ui.js"
import { checkAdmin } from "../../lib/groupadmin.js"
import { disableCommand, enableCommand, isDisabled, isAdminOnly } from "../../lib/groupmanage.js"

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
                        !isEnable
                            ? `${global.prefix}disablecommand sticker admin  (khusus admin)`
                            : ``
                    ].filter(Boolean),
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
            if (!isDisabled(m.chat, target) && !isAdminOnly(m.chat, target)) {
                return m.reply(
                    card("ENABLE COMMAND", `Command "${target}" memang sudah aktif.`, {
                        emoji: "✅"
                    })
                )
            }
            enableCommand(m.chat, target)
            await m.react("✅")
            return m.reply(
                card("ENABLE COMMAND", `✅ Command *${target}* diaktifkan kembali.`, {
                    emoji: "✅"
                })
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
