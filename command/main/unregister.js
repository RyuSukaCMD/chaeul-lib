import { smallcaps as sc } from "../../lib/font.js"
import { resolvePn } from "../../lib/resolve.js"
import { isRegistered, getUser, unregisterUser, clearRegisterSession } from "../../lib/register.js"

export default {
    command: ["unregister", "unreg"],

    category: "Main",

    description: "Hapus registrasi (agar bisa daftar ulang)",

    free: true,

    async run({ sock, m }) {
        const me = await resolvePn(sock, m, m.sender)

        if (!isRegistered(me)) {
            return m.reply(
                `╭━━━〔 ✦ ${sc("UNREGISTER")} ✦ 〕━━━⬣\n` +
                    `${sc("Kamu belum terdaftar")}.\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }

        const user = getUser(me)

        // Unregister TANPA menghapus data: RPG (money/ikan/level), token, & relasi
        // tetap utuh. Hanya ditandai belum-terdaftar agar bisa daftar ulang.
        unregisterUser(me)
        clearRegisterSession(me)

        await m.react("✅")

        return m.reply(
            `╭─ ✦ ${sc("UNREGISTER BERHASIL")} ✦ ─⬣\n` +
                `│\n` +
                `│ ${sc("Kamu tidak lagi terdaftar")}.\n` +
                `│ ◦ ${sc("Nama sebelumnya")} : ${user.name || "-"}\n` +
                `│\n` +
                `│ ✅ ${sc("Progres RPG, saldo, ikan, & relasi")}\n` +
                `│    ${sc("TETAP AMAN")} — tidak dihapus.\n` +
                `│\n` +
                `│ ${sc("Daftar ulang kapan saja")}:\n` +
                `│ ${global.prefix}register\n` +
                `│\n` +
                `╰──────────────⬣`
        )
    }
}
