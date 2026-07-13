import Button from "../../lib/button.js"
import { smallcaps as sc } from "../../lib/font.js"
import { checkAdmin } from "../../lib/groupadmin.js"
import { getSettings, MODE_LABEL } from "../../lib/antilink.js"

const onoff = (v) => (v ? "✅ ON" : "❌ OFF")

export default {
    command: ["antilink"],

    category: "Group",

    description: "Menu pengaturan antilink (toggle)",

    async run({ sock, m, isCreator }) {
        if (!m.isGroup) return m.reply("Command ini hanya untuk grup.")

        const { isAdmin } = await checkAdmin(sock, m, isCreator)
        if (!isAdmin) return m.reply("Khusus admin grup.")

        const s = getSettings(m.chat)

        const body =
            `╭─ 🛡️ ${sc("ANTILINK")} ─⬣\n` +
            `│\n` +
            `│ ${MODE_LABEL.all} : ${onoff(s.all)}\n` +
            `│ ${MODE_LABEL.group} : ${onoff(s.group)}\n` +
            `│ ${MODE_LABEL.channel} : ${onoff(s.channel)}\n` +
            `│ ${MODE_LABEL.sosmed} : ${onoff(s.sosmed)}\n` +
            `│ ${MODE_LABEL.tagsw} : ${onoff(s.tagsw)}\n` +
            `│\n` +
            `│ ${sc("Pilih untuk toggle")} 👇\n` +
            `╰──────────────⬣`

        return Button.menu({
            sock,
            m,
            body,
            footer: "© Chaeul",
            lock: m.sender,
            sections: [
                {
                    title: `🛡️ ${sc("Toggle Antilink")}`,
                    rows: [
                        {
                            title: MODE_LABEL.all,
                            description: sc("Blokir semua jenis link"),
                            id: ".antilinkall"
                        },
                        {
                            title: MODE_LABEL.group,
                            description: sc("Blokir link grup WhatsApp"),
                            id: ".antilinkgb"
                        },
                        {
                            title: MODE_LABEL.channel,
                            description: sc("Blokir link channel WhatsApp"),
                            id: ".antilinkch"
                        },
                        {
                            title: MODE_LABEL.sosmed,
                            description: sc("Blokir link TikTok/IG/FB/X"),
                            id: ".antilinksosmed"
                        },
                        {
                            title: MODE_LABEL.tagsw,
                            description: sc("Blokir tag status (SW)"),
                            id: ".antitagsw"
                        }
                    ]
                }
            ]
        })
    }
}
