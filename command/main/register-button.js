import { getRegisterSession, setRegisterSession } from "../../lib/register.js"

export default {
    command: [/^reg_gender_(male|female)$/],

    category: "Main",

    description: "Register Gender Button Handler",

    free: true,

    async run({ m, command }) {
        const session = getRegisterSession(m.sender)

        // Tidak ada sesi atau bukan di tahap gender → abaikan
        if (!session || session.step !== "gender") return

        const gender = command === "reg_gender_male" ? "Laki-laki" : "Wanita"

        // Simpan gender → lanjut ke tahap UMUR
        setRegisterSession(m.sender, {
            step: "age",
            data: { ...session.data, gender }
        })

        return m.reply(
            `╭━━━〔 ✦ REGISTRASI ✦ 〕━━━⬣\n` +
                `Gender : ${gender} ✅\n\n` +
                `Langkah 3 dari 3\n\n` +
                `Silakan ketik *umur* kamu:\n` +
                `(contoh: 17)\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`
        )
    }
}
