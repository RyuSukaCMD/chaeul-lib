import Button from "../../lib/button.js"

export default {
    command: ["kick", /^kick_yes:.*/, /^kick_no:.*/],

    owner: true,

    category: "Owner",

    description: "Kick Member",

    async run({
        sock,

        m,

        command
    }) {
        if (!m.isGroup) return m.reply("Command ini hanya bisa digunakan di grup.")

        const metadata = await sock.groupMetadata(m.chat)

        const bot = metadata.participants.find(
            (p) =>
                p.id === sock.user.lid ||
                p.phoneNumber ===
                    sock.user.id.replace(
                        /:\d+/g,

                        ""
                    )
        )

        if (!bot?.admin) return m.reply("Bot harus menjadi admin.")

        if (command.startsWith("kick_no:")) {
            const executor = command.slice(8)

            if (executor !== m.sender) return

            return m.reply("✅ Kick dibatalkan.")
        }

        if (command.startsWith("kick_yes:")) {
            const [target, executor] = command

                .slice(9)

                .split("|")

            if (executor !== m.sender) return

            const participant = metadata.participants.find((p) => p.id === target)

            if (!participant) return m.reply("Participant tidak ditemukan.")

            if (participant.admin) return m.reply("Tidak bisa kick admin.")

            try {
                await sock.groupParticipantsUpdate(
                    m.chat,

                    [participant.id],

                    "remove"
                )
            } catch (e) {
                console.error(e)

                return m.reply(String(e.message))
            }

            return m.reply(
                `✅ Berhasil mengeluarkan

@${participant.phoneNumber.split("@")[0]}`,

                {
                    mentions: [participant.phoneNumber]
                }
            )
        }

        const target = m.mentionedJid?.[0] || m.quoted?.sender

        if (!target)
            return m.reply(
                `Reply atau tag member yang ingin di-kick.

Contoh:

.kick @user`
            )

        const participant = metadata.participants.find((p) => p.id === target)

        if (!participant) return m.reply("Participant tidak ditemukan.")

        if (participant.admin) return m.reply("Tidak bisa kick admin.")

        return Button.menu({
            sock,

            m,

            body: `╭━━━〔 ⚠️ KICK MEMBER 〕━━━⬣

Apakah kamu yakin ingin
mengeluarkan

@${participant.phoneNumber.split("@")[0]}

dari grup ini?

╰━━━━━━━━━━━━━━━━━━⬣`,

            footer: "Chaeul",

            mentions: [participant.phoneNumber],

            buttons: [
                {
                    type: "quick",

                    text: "✅ Yes",

                    id: `kick_yes:${participant.id}|${m.sender}`
                },

                {
                    type: "quick",

                    text: "❌ No",

                    id: `kick_no:${m.sender}`
                }
            ]
        })
    }
}
