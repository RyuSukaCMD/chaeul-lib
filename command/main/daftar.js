import { isRegistered, startRegister } from "../../lib/register.js"

export default {
    command: ["register", "daftar"],

    category: "Main",

    description: "Registrasi akun (nama, gender, umur) + 30 token starter",

    // Registrasi gratis (tidak potong token)
    free: true,

    async run({ m }) {
        if (isRegistered(m.sender)) {
            return m.reply(
                `╭━━━〔 ✦ REGISTRASI ✦ 〕━━━⬣\n` +
                    `✅ Kamu sudah terdaftar.\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }

        // Mulai sesi registrasi → menunggu input NAMA
        startRegister(m.sender)

        return m.reply(
            `╭━━━〔 ✦ REGISTRASI ✦ 〕━━━⬣\n` +
                `Selamat datang! 👋\n\n` +
                `Langkah 1 dari 3\n\n` +
                `Silakan ketik *nama* kamu:\n\n` +
                `(ketik "batal" untuk membatalkan)\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`
        )
    }
}
