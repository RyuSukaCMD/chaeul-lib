import { getContentType } from "baileys"

export default async function Serialize(sock, m) {
    if (!m) return m

    /* ===========================
     * BASIC
     * =========================== */

    m.id = m.key.id

    m.chat = m.key.remoteJid

    m.fromMe = m.key.fromMe

    m.sender = m.key.participantAlt || m.key.participant || m.key.remoteJidAlt || m.key.remoteJid

    m.senderNumber = m.sender.split("@")[0].split(":")[0]

    m.pushName ||= "No Name"

    m.isGroup = m.chat.endsWith("@g.us")

    if (global.settings.autoread) {
        await sock.readMessages([m.key])
    }
    /* ===========================
     * MESSAGE
     * =========================== */

    m.type = getContentType(m.message)

    m.msg = m.message?.[m.type] || {}

    m.mime = m.msg?.mimetype || ""

    m.mimetype = m.mime

    m.isMedia = !!m.mime

    /* ===========================
     * BODY
     * =========================== */

    m.body =
        m.msg?.conversation ||
        m.msg?.text ||
        m.msg?.caption ||
        m.msg?.selectedButtonId ||
        m.msg?.selectedId ||
        m.msg?.templateButtonReplyMessage?.selectedId ||
        m.msg?.buttonsResponseMessage?.selectedButtonId ||
        m.msg?.listResponseMessage?.singleSelectReply?.selectedRowId ||
        m.msg?.singleSelectReply?.selectedRowId ||
        m.message?.templateButtonReplyMessage?.selectedId ||
        m.message?.buttonsResponseMessage?.selectedButtonId ||
        m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
        m.message?.conversation ||
        ""

    if (m.type === "interactiveResponseMessage") {
        try {
            const json = JSON.parse(
                m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson
            )

            m.body = json.id || json.selectedId || ""
        } catch {}
    }

    m.text = m.body

    /* ===========================
     * MENTION
     * =========================== */

    m.mentionedJid = m.msg?.contextInfo?.mentionedJid || []

    /* ===========================
     * QUOTED
     * =========================== */

    m.isQuoted = !!m.msg?.contextInfo?.quotedMessage

    return m
}
