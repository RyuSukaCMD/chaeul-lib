import fs from "fs"
import path from "path"
import { downloadMediaMessage } from "baileys"

const buffer = (file) => {
    // Buffer → langsung dipakai
    if (Buffer.isBuffer(file)) return file

    // Objek { url } atau { stream } → biarkan Baileys yang mengunduh
    if (file && typeof file === "object") return file

    // String path → baca dari filesystem
    return fs.readFileSync(file)
}

const download = (sock, message) =>
    downloadMediaMessage(
        message,
        "buffer",
        {},
        {
            logger: sock.logger,
            reuploadRequest: sock.updateMediaMessage
        }
    )

export default async function Client(sock, m) {
    /* ===========================
     * PROPERTY
     * =========================== */

    m.groupName = null

    if (m.isGroup) {
        try {
            const metadata = await sock.groupMetadata(m.chat)

            m.groupName = metadata.subject
        } catch {
            m.groupName = "Unknown"
        }
    }

    /* ===========================
     * DOWNLOAD
     * =========================== */

    m.download = () => download(sock, m)

    /* ===========================
     * QUOTED
     * =========================== */

    m.quoted = (() => {
        const ctx = m.msg?.contextInfo

        if (!ctx?.quotedMessage) return null

        const quoted = {
            message: ctx.quotedMessage,

            key: {
                remoteJid: m.chat,

                id: ctx.stanzaId,

                participant: ctx.participant
            }
        }

        quoted.type = Object.keys(ctx.quotedMessage)[0]

        quoted.msg = ctx.quotedMessage[quoted.type]

        // Pengirim pesan yang di-reply (dipakai .kick/.warn/.getpp/.marry dll).
        // ctx.participant bisa berupa @lid; simpan apa adanya, resolvePn akan
        // mengubah ke nomor asli saat dibutuhkan.
        quoted.sender = ctx.participant

        quoted.mimetype = quoted.msg?.mimetype

        quoted.seconds = quoted.msg?.seconds || 0

        quoted.download = () => download(sock, quoted)

        return quoted
    })()

    /* ===========================
     * SEND
     * =========================== */

    m.send = async (type, content, options = {}) => {
        const message =
            typeof type === "object"
                ? type
                : {
                      [type]: content,

                      ...options
                  }

        return await sock.sendMessage(
            m.chat,

            message,

            {
                quoted: m
            }
        )
    }
    m.reply = (text, options = {}) => m.send("text", text, options)

    m.react = (emoji) =>
        sock.sendMessage(
            m.chat,

            {
                react: {
                    text: emoji,

                    key: m.key
                }
            }
        )

    m.sendList = (
        title,

        text,

        sections,

        footer = global.footer || "",

        button = "Select"
    ) =>
        m.send({
            text,

            footer,

            buttons: [
                {
                    buttonId: "settings",

                    buttonText: {
                        displayText: button
                    },

                    type: 4,

                    nativeFlowInfo: {
                        name: "single_select",

                        paramsJson: JSON.stringify({
                            title,

                            sections
                        })
                    }
                }
            ],

            headerType: 1
        })
    m.sendImage = (image, caption = "", options = {}) =>
        m.send("image", buffer(image), {
            caption,
            ...options
        })

    m.sendVideo = (video, caption = "", options = {}) =>
        m.send("video", buffer(video), {
            caption,
            ...options
        })

    m.sendAudio = (audio, ptt = false, options = {}) =>
        m.send("audio", buffer(audio), {
            // mimetype WAJIB agar audio bisa diputar di WhatsApp
            mimetype: options.mimetype || "audio/mpeg",
            ptt,
            ...options
        })

    m.sendSticker = (sticker, options = {}) => m.send("sticker", sticker, options)

    m.sendDocument = (document, fileName = "file", options = {}) =>
        m.send("document", buffer(document), {
            fileName,
            ...options
        })

    m.sendFile = (file, options = {}) => {
        const ext = path.extname(file).toLowerCase()

        if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) return m.sendImage(file, "", options)

        if ([".mp4", ".mov", ".mkv"].includes(ext)) return m.sendVideo(file, "", options)

        if ([".mp3", ".ogg", ".wav"].includes(ext)) return m.sendAudio(file, false, options)

        return m.sendDocument(file, path.basename(file), options)
    }

    return m
}
