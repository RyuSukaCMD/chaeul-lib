import Button from "../../lib/button.js"
import { getSettingToggles } from "../../lib/settings.js"

export default {
    command: ["settings"],

    category: "Owner",

    description: "Bot Settings",

    owner: true,

    async run({ sock, m }) {
        // Pastikan objek setting selalu ada + nilai toggle terkini (restart-safe).
        global.settings ||= {}
        const toggles = getSettingToggles()
        Object.assign(global.settings, toggles)

        const body = `
『 ⚙️ *Chaeul SETTINGS* 』

Kelola konfigurasi bot dengan mudah.

╭──〔 🤖 BOT MODE 〕
│
├ 🌐 Public : ${global.settings.public ? "✅" : "❌"}
├ 🔒 Self : ${!global.settings.public ? "✅" : "❌"}
╰──────────────

╭──〔 ⚙️ AUTOMATION 〕
│
├ 📖 Auto Read : ${global.settings.autoread ? "✅ ON" : "❌ OFF"}
├ ⌨️ Auto Typing : ${global.settings.autotyping ? "✅ ON" : "❌ OFF"}
├ 🎙️ Auto Voice : ${global.settings.autovoice ? "✅ ON" : "❌ OFF"}
╰──────────────

╭──〔 🛡️ SECURITY 〕
│
├ 👥 Group Only : ${global.settings.grouponly ? "✅ ON" : "❌ OFF"}
├ 🚷 Block Private Chat : ${global.settings.blockpc ? "✅ ON" : "❌ OFF"}
├ 📵 Block Call : ${global.settings.blockcall ? "✅ ON" : "❌ OFF"}
╰──────────────

Silahkan pilih pengaturan dibawah.
`

        const sections = [
            {
                title: "🤖 Bot Mode",

                rows: [
                    {
                        title: "🌐 Public",

                        description: "Enable Public Mode",

                        id: ".public"
                    },

                    {
                        title: "🔒 Self",

                        description: "Enable Self Mode",

                        id: ".self"
                    }
                ]
            },

            {
                title: "⚙️ Automation",

                rows: [
                    {
                        title: "📖 Auto Read",

                        description: global.settings.autoread
                            ? "Disable Auto Read"
                            : "Enable Auto Read",

                        id: ".autoread"
                    },

                    {
                        title: "⌨️ Auto Typing",

                        description: global.settings.autotyping
                            ? "Disable Auto Typing"
                            : "Enable Auto Typing",

                        id: ".autotyping"
                    },

                    {
                        title: "🎙️ Auto Voice",

                        description: global.settings.autovoice
                            ? "Disable Auto Voice"
                            : "Enable Auto Voice",

                        id: ".autovoice"
                    }
                ]
            },

            {
                title: "🛡️ Security",

                rows: [
                    {
                        title: "👥 Group Only",

                        description: global.settings.grouponly
                            ? "Disable Group Only (bot respon PC lagi)"
                            : "Enable Group Only (bot hanya respon di grup)",

                        id: ".grouponly"
                    },

                    {
                        title: "🚷 Block Private Chat",

                        description: global.settings.blockpc
                            ? "Disable Block PC (chat PC diizinkan)"
                            : "Enable Block PC (chat PC = auto block)",

                        id: ".blockpc"
                    },

                    {
                        title: "📵 Block Call",

                        description: global.settings.blockcall
                            ? "Disable Block Call (panggilan dibiarkan)"
                            : "Enable Block Call (panggilan ditolak + block)",

                        id: ".blockcall"
                    }
                ]
            }
        ]

        await Button.menu({
            sock,

            m,

            image: "./media/menu.jpg",

            body,

            footer: "© Chaeul",

            lock: m.sender,

            sections,

            buttons: [
                {
                    type: "quick",

                    text: "🏠 Menu",

                    id: ".menu"
                },

                {
                    type: "quick",

                    text: "📊 Ping",

                    id: ".ping"
                },

                {
                    type: "url",

                    text: "🌐 Website",

                    url: "https://google.com"
                }
            ]
        })
    }
}
