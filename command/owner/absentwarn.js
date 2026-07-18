import {
    addAbsentWarnGroup,
    delAbsentWarnGroup,
    listAbsentWarnGroups,
    getAbsentWarnHours,
    setAbsentWarnHours,
    startAbsentWarn
} from "../../lib/absentWarn.js"

function card(title, lines) {
    if (!Array.isArray(lines)) lines = [String(lines || "")]
    return `╭━━━〔 ⏰ ${title} 〕━━━⬣\n${lines.join("\n")}\n╰━━━━━━━━━━━━━━━━━━⬣`
}

export default {
    command: ["addadsentwarn", "addabsentwarn", "addabsenwarn", "delabsentwarn", "delabsenwarn", "setabsentime", "absentwarnlist"],
    category: "Owner",
    description: "Kelola grup warning absen server",
    owner: true,

    async run({ sock, m, command, args }) {
        startAbsentWarn(sock)

        if (command === "setabsentime") {
            const hours = Number(args[0])
            if (!hours || hours < 1) return m.reply(card("SET ABSEN TIME", [`Format: ${global.prefix}setabsentime <jam>`, `Contoh: ${global.prefix}setabsentime 3`]))
            const saved = setAbsentWarnHours(hours)
            return m.reply(card("SET ABSEN TIME", [`✅ Warning absen diset ke *${saved} jam* sebelum expired.`]))
        }

        if (command === "absentwarnlist") {
            const groups = listAbsentWarnGroups()
            return m.reply(card("ABSEN WARN LIST", [
                `Warn time : ${getAbsentWarnHours()} jam sebelum expired`,
                "",
                groups.length ? groups.map((g, i) => `${i + 1}. ${g}`).join("\n") : "Belum ada grup."
            ]))
        }

        if (!m.isGroup) return m.reply(card("ABSEN WARN", ["Command ini dipakai di grup yang mau diaktifkan/nonaktifkan warning."]))

        if (["addadsentwarn", "addabsentwarn", "addabsenwarn"].includes(command)) {
            addAbsentWarnGroup(m.chat)
            return m.reply(card("ABSEN WARN AKTIF", [
                "✅ Grup ini ditambahkan ke absen warn.",
                `User akan di-tag jika absen server expired dalam ${getAbsentWarnHours()} jam atau sudah expired.`,
                "",
                `Ubah waktu: ${global.prefix}setabsentime 3`,
                `Hapus grup: ${global.prefix}delabsentwarn`
            ]))
        }

        if (["delabsentwarn", "delabsenwarn"].includes(command)) {
            delAbsentWarnGroup(m.chat)
            return m.reply(card("ABSEN WARN NONAKTIF", ["✅ Grup ini dihapus dari absen warn."]))
        }
    }
}
