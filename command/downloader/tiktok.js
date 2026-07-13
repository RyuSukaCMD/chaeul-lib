import { resolvePn } from "../../lib/resolve.js"
import { tiktok } from "../../lib/downloader.js"
import { formatCount, formatDuration, tokenFooter } from "../../lib/dlformat.js"
import { hasAccount, getBalance, deductToken, addToken } from "../../lib/token.js"

const TT_REGEX = /tiktok\.com/i

function infoCaption(data, jid) {
    return (
        `╭━━━〔 🎵 TIKTOK DOWNLOADER 〕━━━⬣\n` +
        `┃\n` +
        `┃ 👤 Author\n` +
        `┃   ${data.author?.nickname || "-"} (@${data.author?.unique_id || "-"})\n` +
        `┃ 🌍 Region : ${data.region || "-"}\n` +
        `┃\n` +
        `┣━━━ 📊 STATISTIK ━━━\n` +
        `┃\n` +
        `┃ 👀 Views     : ${formatCount(data.play_count)}\n` +
        `┃ ❤️ Likes     : ${formatCount(data.digg_count)}\n` +
        `┃ 💬 Comments  : ${formatCount(data.comment_count)}\n` +
        `┃ 🔁 Shares    : ${formatCount(data.share_count)}\n` +
        `┃ ⭐ Favorites : ${formatCount(data.collect_count)}\n` +
        `┃ ⏱️ Durasi    : ${formatDuration(data.duration)}\n` +
        `┃\n` +
        `┣━━━ 🎶 MUSIC ━━━\n` +
        `┃ ${data.music_info?.title || "-"}\n` +
        `┃\n` +
        `┣━━━ 📝 CAPTION ━━━\n` +
        `┃ ${(data.title || "-").slice(0, 200)}\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣\n` +
        `${tokenFooter(jid)}`
    )
}

export default {
    command: ["tiktok", "tt", "ttdl"],

    category: "Downloader",

    description: "Download TikTok video (mp4)",

    // Gratis di gate handler; token dipotong manual saat download berhasil.
    free: true,

    async run({ sock, m, args }) {
        const url = args[0]

        if (!url || !TT_REGEX.test(url)) {
            return m.reply(
                `╭━━━〔 🎵 TIKTOK DOWNLOADER 〕━━━⬣\n` +
                    `Kirim link TikTok yang valid.\n\n` +
                    `Contoh:\n` +
                    `${global.prefix}tt https://vt.tiktok.com/xxxx\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }

        const user = await resolvePn(sock, m, m.sender)

        // Cek akun & token (1 token per download)
        if (!hasAccount(user)) {
            return m.reply(`Kamu belum terdaftar. Ketik ${global.prefix}register`)
        }
        if (!deductToken(user, 1)) {
            return m.reply(
                `╭━━━〔 🪙 TOKEN HABIS 〕━━━⬣\n` +
                    `Token kamu tidak cukup.\n` +
                    `Sisa : ${getBalance(user)} token\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }

        await m.react("🕒")

        try {
            const data = await tiktok(url)
            const caption = infoCaption(data, user)

            // TikTok downloader → hanya MP4 (video)
            const video = data.hdplay || data.play || data.wmplay

            if (video) {
                await m.send("video", { url: video }, { mimetype: "video/mp4", caption })
                return m.react("✅")
            }

            // Bila konten berupa slideshow/foto (tidak ada video)
            const images = data.images || data.image_post || data.photos || data.slideshow || []

            if (images.length) {
                await m.reply(caption)
                for (const img of images) {
                    await m.send("image", { url: img })
                }
                return m.react("✅")
            }

            throw new Error("Media video tidak ditemukan.")
        } catch (e) {
            // Refund token bila gagal
            addToken(user, 1)
            await m.react("❌")
            return m.reply(
                `╭━━━〔 ⚠️ GAGAL 〕━━━⬣\n` +
                    `${e.message}\n\n` +
                    `Token kamu dikembalikan.\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }
    }
}
