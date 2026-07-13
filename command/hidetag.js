export default {
    command: ["hidetag", "ht"],

    category: "Owner",

    owner: true,

    description: "Mention semua member",

    async run({ sock, m, text }) {
        if (!m.isGroup) return m.reply("❌ Command ini hanya bisa digunakan di grup...")

        if (!text) return m.reply("Contoh:\n.hidetag Halo semuanya!")

        const metadata = await sock.groupMetadata(m.chat)

        const mentions = metadata.participants.map((v) => v.id)

        await sock.sendMessage(
            m.chat,
            {
                text,
                mentions
            },
            {
                quoted: m
            }
        )
    }
}
