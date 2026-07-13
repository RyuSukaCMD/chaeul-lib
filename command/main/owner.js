export default {
    command: ["owner"],

    category: "Main",

    description: "Send owner contact",

    async run({ sock, m }) {
        const owners = global.owner.map((number) => {
            const jid = number.replace(/\D/g, "") + "@s.whatsapp.net"

            return {
                displayName: global.name || "Chaeul Owner",

                vcard: [
                    "BEGIN:VCARD",
                    "VERSION:3.0",
                    `FN:${global.name || "Chaeul Owner"}`,
                    `ORG:${global.name || "Chaeul"};`,
                    "TITLE:Bot Developer",
                    `TEL;type=CELL;type=VOICE;waid=${number.replace(/\D/g, "")}:${number.replace(/\D/g, "")}`,
                    "END:VCARD"
                ].join("\n")
            }
        })

        await m.reply(`╭──〔 👑 OWNER CONTACT 〕

Butuh bantuan, ingin melapor bug, atau ada pertanyaan?

Silakan hubungi owner melalui kontak di bawah ini.
Jangan ragu untuk menghubungi ya! 🤝

╰────────────`)

        await sock.sendMessage(
            m.chat,

            {
                contacts: {
                    displayName: `${owners.length} Owner Contact${owners.length > 1 ? "s" : ""}`,

                    contacts: owners
                }
            },

            {
                quoted: m
            }
        )
    }
}
