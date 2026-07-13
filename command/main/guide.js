import { smallcaps as sc } from "../../lib/font.js"

export default {
    command: ["guide", "panduan", "help2"],

    category: "Main",

    description: "Panduan penggunaan bot",

    free: true,

    async run({ m }) {
        await m.react("📖")

        return m.reply(
            `╭─ ✦ ${sc("PANDUAN BOT")} ✦ ─⬣\n` +
                `│\n` +
                `│ ${sc("Selamat datang di Chaeul")}!\n` +
                `│\n` +
                `│ 📝 ${sc("REGISTRASI")}\n` +
                `│ ${sc("Ketik")} ${global.prefix}register ${sc("untuk daftar")}\n` +
                `│ (${sc("nama, gender, umur")}) & ${sc("dapat")}\n` +
                `│ 30 ${sc("token gratis")}.\n` +
                `│ ${sc("Ulang daftar")}: ${global.prefix}unregister\n` +
                `│\n` +
                `│ 🪙 ${sc("TOKEN")}\n` +
                `│ ${sc("Setiap perintah memakai")} 1 token,\n` +
                `│ ${sc("kecuali menu, ping, register,")}\n` +
                `│ ${sc("token, daily & fitur relationship")}.\n` +
                `│ ${sc("Klaim harian")}: ${global.prefix}daily (+30 🪙)\n` +
                `│\n` +
                `│ 💞 ${sc("RELATIONSHIP")}\n` +
                `│ ${global.prefix}marry, ${global.prefix}partner, ${global.prefix}couple,\n` +
                `│ ${global.prefix}kiss, ${global.prefix}hug, ${global.prefix}divorce\n` +
                `│ ${sc("Token pasangan digabung")}.\n` +
                `│\n` +
                `│ 📥 ${sc("LAINNYA")}\n` +
                `│ ${global.prefix}menu → ${sc("lihat semua fitur")}\n` +
                `│ ${global.prefix}profile → ${sc("statistik akun")}\n` +
                `│\n` +
                `╰──────────────⬣`
        )
    }
}
