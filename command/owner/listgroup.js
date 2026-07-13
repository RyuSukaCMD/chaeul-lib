export default {
    command: ["listgroup", "listgroups", "groups"],

    owner: true,

    category: "Owner",

    description: "Menampilkan daftar grup bot",

    async run({ sock, m }) {
        await m.react("🕒")

        let groups
        try {
            groups = await sock.groupFetchAllParticipating()
        } catch (e) {
            return m.reply(`❌ Gagal mengambil daftar grup.\n${e.message}`)
        }

        const list = Object.values(groups || {})

        if (!list.length) {
            return m.reply(
                `╭━━━〔 👥 LIST GROUP 〕━━━⬣\n` +
                    `Bot belum tergabung di grup\n` +
                    `mana pun.\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }

        // Urutkan berdasar jumlah member (terbanyak dulu)
        list.sort((a, b) => (b.participants?.length || 0) - (a.participants?.length || 0))

        let text = `╭━━━〔 👥 LIST GROUP 〕━━━⬣\n\n`

        let no = 1
        for (const g of list) {
            text += `${no++}. ${g.subject || "Unknown"}\n`
            text += `   └ 👤 ${g.participants?.length || 0} member\n`
            text += `   └ 🆔 ${g.id}\n\n`
        }

        text += `━━━━━━━━━━━━━━━━━━\n`
        text += `📊 Total : ${list.length} grup\n`
        text += `╰━━━━━━━━━━━━━━━━━━⬣`

        await m.react("✅")

        return m.reply(text)
    }
}
