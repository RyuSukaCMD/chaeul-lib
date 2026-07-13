import Button from "../../lib/button.js"

export default {
    command: ["settings"],

    category: "Owner",

    description: "Bot Settings",

    owner: true,

    async run({ sock, m }) {
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
