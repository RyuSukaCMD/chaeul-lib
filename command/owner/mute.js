import { mute, parseTime } from "../../lib/mute.js"

export default {
    command: ["mute"],

    owner: true,

    category: "Owner",

    description: "Mute User",

    async run({ m, args }) {
        const target =
            m.mentionedJid?.[0] ||
            m.quoted?.sender ||
            (args[0] ? args[0].replace(/\D/g, "") + "@s.whatsapp.net" : null)

        if (!target)
            return m.reply(
                `Contoh:

.mute @user 10m Spam`
            )

        const number = target.split("@")[0]

        const isOwner = global.owner.some((owner) => number === owner || number.startsWith(owner))

        if (isOwner) return m.reply("❌ Owner tidak dapat di-mute.")

        const duration = args[1] || "perm"

        const expired = parseTime(duration)

        if (expired === null)
            return m.reply(
                `Format waktu:

30s
10m
1h
1d
perm`
            )

        const reason = args.slice(2).join(" ") || "-"

        mute(
            number,

            expired,

            reason
        )

        return m.reply(
            `╭━━━〔 🔇 USER MUTED 〕━━━⬣

👤 User
${number}

⏳ Duration
${expired === 0 ? "Permanent" : duration}

📝 Reason
${reason}

╰━━━━━━━━━━━━━━━━━━⬣`
        )
    }
}
