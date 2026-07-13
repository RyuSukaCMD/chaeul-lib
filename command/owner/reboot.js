export default {
    command: ["restartbot", "reboot"],

    category: "Owner",

    description: "Restart Bot",

    owner: true,

    async run({ m }) {
        await m.react("♻️")

        await m.reply(
            `╭━━━〔 ♻️ RESTART BOT 〕━━━⬣

Bot sedang melakukan restart...

Mohon tunggu beberapa saat.

╰━━━━━━━━━━━━━━━━━━⬣`
        )

        setTimeout(() => {
            process.exit(0)
        }, 1000)
    }
}
