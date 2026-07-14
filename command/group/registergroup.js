import { card } from "../../lib/ui.js"
import { registerGroupCmd, unregisterGroupCmd, isGroupRegistered } from "../../lib/groupmanage.js"
import { pushGroup } from "../../lib/license.js"

export default {
    command: ["registergroup", "reggroup", "unregistergroup", "unregroup"],

    owner: true, // hanya owner bot

    category: "Group",

    description: "Aktif/nonaktifkan grup agar bisa memakai bot",

    async run({ sock, m, command }) {
        if (!m.isGroup) return m.reply("Command ini hanya untuk grup.")

        const isUnreg = command === "unregistergroup" || command === "unregroup"

        if (isUnreg) {
            if (!isGroupRegistered(m.chat)) {
                return m.reply(
                    card("UNREGISTER GROUP", "Grup ini memang belum terdaftar.", { emoji: "🔒" })
                )
            }
            unregisterGroupCmd(m.chat)
            await m.react("✅")
            return m.reply(
                card(
                    "UNREGISTER GROUP",
                    [
                        "✅ Grup dinonaktifkan.",
                        "",
                        "Semua fitur bot (command, welcome,",
                        "announcement) dimatikan di grup ini."
                    ],
                    { emoji: "🔒" }
                )
            )
        }

        // register
        if (isGroupRegistered(m.chat)) {
            return m.reply(
                card("REGISTER GROUP", "Grup ini sudah terdaftar & aktif. ✅", { emoji: "🔓" })
            )
        }
        registerGroupCmd(m.chat)
        await m.react("✅")

        // Push ke website (nama grup saja) — real-time
        try {
            const meta = await sock.groupMetadata(m.chat)
            pushGroup(m.chat, meta?.subject || "Grup", global.licenseInfo?.plan || "private")
        } catch {
            pushGroup(m.chat, "Grup", global.licenseInfo?.plan || "private")
        }

        return m.reply(
            card(
                "REGISTER GROUP",
                [
                    "✅ Grup berhasil diaktifkan!",
                    "",
                    "Sekarang member bisa memakai",
                    "seluruh fitur bot di grup ini. 🎉"
                ],
                { emoji: "🔓" }
            )
        )
    }
}
