import { smallcaps as sc } from "../../lib/font.js"
import { resolvePn } from "../../lib/resolve.js"
import { isRegistered, getUser, deleteUser, clearRegisterSession } from "../../lib/register.js"
import { delToken } from "../../lib/token.js"
import { getMarriage, removeMarriage } from "../../lib/marriage.js"
import { getPartner, removePartner } from "../../lib/partner.js"

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

        // Bereskan relasi bila ada (agar pasangan tidak menggantung)
        if (getMarriage(me)) removeMarriage(me)
        if (getPartner(me)) removePartner(me)

        // Hapus data user, akun token, dan sesi registrasi yang tersisa
        deleteUser(me)
        delToken(me)
        clearRegisterSession(me)

        await m.react("✅")

        return m.reply(
            `╭─ ✦ ${sc("UNREGISTER BERHASIL")} ✦ ─⬣\n` +
                `│\n` +
                `│ ${sc("Data akun dihapus")}:\n` +
                `│ ◦ ${sc("Nama")} : ${user.name || "-"}\n` +
                `│ ◦ ${sc("Token & relasi direset")}\n` +
                `│\n` +
                `│ ${sc("Daftar ulang")}:\n` +
                `│ ${global.prefix}register\n` +
                `│\n` +
                `╰──────────────⬣`
        )
    }
}
