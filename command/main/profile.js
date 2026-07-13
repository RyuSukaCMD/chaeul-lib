import { smallcaps as sc } from "../../lib/font.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { isRegistered, getUser } from "../../lib/register.js"
import { hasAccount, getBalance, getMate } from "../../lib/token.js"
import { getMarriage } from "../../lib/marriage.js"
import { getPartner } from "../../lib/partner.js"

export default {
    command: ["profile", "profil", "me"],

    category: "Main",

    description: "Lihat statistik akun kamu",

    free: true,

    async run({ sock, m }) {
        // Boleh cek diri sendiri atau user yang di-tag / reply
        const rawTarget = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
        const who = await resolvePn(sock, m, rawTarget)

        if (!isRegistered(who)) {
            return m.reply(
                `╭━━━〔 👤 ${sc("PROFIL")} 〕━━━⬣\n` +
                    `${tag(who)} ${sc("belum terdaftar")}.\n\n` +
                    `${sc("Daftar")}: ${global.prefix}register\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`,
                { mentions: [who] }
            )
        }

        const user = getUser(who) || {}

        // Dukung skema lama (username) & baru (name/gender/age)
        const nama = user.name || user.username || "-"
        const gender = user.gender || "-"
        const umur = user.age != null ? `${user.age} ${sc("tahun")}` : "-"

        const balance = hasAccount(who) ? getBalance(who) : 0
        const mate = getMate(who)

        const marriage = getMarriage(who)
        const partner = getPartner(who)

        let rel = sc("Single") + " 🍃"
        if (marriage) rel = `${sc("Menikah")} 💍 ${tag(marriage.partner)}`
        else if (partner) rel = `${sc("Pacaran")} 💕 ${tag(partner.partner)}`

        const isOwner = global.owner?.some((o) => who.includes(o.replace(/\D/g, "")))
        const role = isOwner ? sc("Owner") + " 👑" : sc("Member") + " ✅"

        await m.react("👤")

        return m.reply(
            `╭─ 👤 ${sc("PROFIL SAYA")} ─⬣\n` +
                `│\n` +
                `│ ${sc("Nama")}   : ${nama}\n` +
                `│ ${sc("Gender")} : ${gender}\n` +
                `│ ${sc("Umur")}   : ${umur}\n` +
                `│ ${sc("Role")}   : ${role}\n` +
                `│\n` +
                `│ ${sc("Token")}  : ${balance} 🪙${mate ? " " + sc("(bersama)") : ""}\n` +
                `│ ${sc("Relasi")} : ${rel}\n` +
                `│\n` +
                `╰──────────────⬣`,
            { mentions: [who, marriage?.partner, partner?.partner].filter(Boolean) }
        )
    }
}
