import fs from "fs"
import path from "path"

const waiting = new Map()

function wib() {
    const d = new Date()
    const fmt = new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).formatToParts(d)
    const get = (t) => fmt.find((x) => x.type === t).value
    return `${get("year")}-${get("month")}-${get("day")}_${get("hour")}-${get("minute")}-${get("second")}`
}

function decodeWaCode(text) {
    if (!text) return ""
    // Decode WhatsApp code block formatting
    // Remove ```language\n ... \n``` pattern
    text = text.replace(/^```[a-zA-Z0-9]*\n?/gm, "")
    text = text.replace(/\n?```$/gm, "")
    text = text.replace(/```[a-zA-Z0-9]*\n?/g, "")
    // Also handle inline ```code```
    text = text.replace(/```([^`]+)```/g, "$1")
    // Decode zero-width characters that WA sometimes adds
    text = text.replace(/\u200B/g, "")
    text = text.replace(/\u200E/g, "")
    text = text.replace(/\u200F/g, "")
    text = text.replace(/\uFEFF/g, "")
    return text.trim()
}

export default {
    command: ["addlib"],
    owner: true,
    category: "Owner",
    description: "Tambah Library",
    async run({ sock, m, args }) {
        if (!args[0]) return m.reply(`Contoh:\n${global.prefix}addlib button.js`)

        const fileName = path.basename(args[0])
        const target = `./lib/${fileName}`
        const backupDir = "./libbackup"

        // ====== SUPPORT FILE & TEKS LANGSUNG (TANPA WAITING) ======
        // Jika user reply file .js langsung
        if (m.quoted?.mime === "application/javascript" || m.quoted?.fileName?.endsWith(".js")) {
            try {
                const buffer = await m.quoted.download()
                if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir)
                if (fs.existsSync(target)) {
                    fs.renameSync(target, `${backupDir}/${wib()}_${fileName}`)
                }
                fs.writeFileSync(target, buffer)
                return m.reply(`✅ Library berhasil disimpan.\n📁 ${fileName}`)
            } catch (e) {
                console.error(e)
                return m.reply(String(e))
            }
        }

        // Jika user paste teks langsung setelah command (args lebih dari 1 atau ada teks di body)
        const fullText = m.text || m.body || ""
        const commandPart = `${global.prefix}addlib ${fileName}`
        const pastedCode = fullText.slice(commandPart.length).trim()

        if (pastedCode) {
            try {
                const decoded = decodeWaCode(pastedCode)
                if (!decoded) return m.reply("❌ Kode kosong setelah decode.")

                if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir)
                if (fs.existsSync(target)) {
                    fs.renameSync(target, `${backupDir}/${wib()}_${fileName}`)
                }
                fs.writeFileSync(target, decoded, "utf8")
                return m.reply(`✅ Library berhasil disimpan.\n📁 ${fileName}`)
            } catch (e) {
                console.error(e)
                return m.reply(`❌ Gagal menyimpan library.\n${e.message}`)
            }
        }

        // ====== WAITING MODE (kirim file atau paste nanti) ======
        waiting.set(m.sender, {
            chat: m.chat,
            fileName,
            target,
            backupDir,
            expire: Date.now() + 60000
        })

        await m.reply(
            `📄 Kirim / Reply file *.js*\n` +
                `atau\n` +
                `📋 Paste kode JavaScript.\n` +
                `Nama file: ${fileName}\n` +
                `Timeout 60 detik.`
        )

        const listener = async ({ messages }) => {
            const state = waiting.get(m.sender)
            if (!state) return

            if (Date.now() > state.expire) {
                waiting.delete(m.sender)
                sock.ev.off("messages.upsert", listener)
                return
            }

            const msg = messages[0]
            if (!msg.message || msg.key.fromMe) return

            const sender = msg.key.participant || msg.key.remoteJid
            if (sender !== m.sender) return
            if (msg.key.remoteJid !== state.chat) return

            try {
                if (!fs.existsSync(state.backupDir)) fs.mkdirSync(state.backupDir)
                if (fs.existsSync(state.target)) {
                    fs.renameSync(state.target, `${state.backupDir}/${wib()}_${state.fileName}`)
                }

                if (msg.message.documentMessage) {
                    const doc = msg.message.documentMessage
                    if (!doc.fileName?.endsWith(".js")) return
                    const buffer = await sock.downloadMediaMessage(msg)
                    fs.writeFileSync(state.target, buffer)
                } else {
                    const rawCode =
                        msg.message.conversation ||
                        msg.message.extendedTextMessage?.text ||
                        msg.message.imageMessage?.caption ||
                        msg.message.videoMessage?.caption ||
                        ""

                    const code = decodeWaCode(rawCode)
                    if (!code) return

                    fs.writeFileSync(state.target, code, "utf8")
                }

                waiting.delete(m.sender)
                sock.ev.off("messages.upsert", listener)
                await sock.sendMessage(state.chat, {
                    text: `✅ Library berhasil disimpan.\n📁 ${state.fileName}`
                })
            } catch (e) {
                console.error(e)
                waiting.delete(m.sender)
                sock.ev.off("messages.upsert", listener)
                await sock.sendMessage(state.chat, {
                    text: `❌ Gagal menyimpan library.\n${e.message}`
                })
            }
        }

        sock.ev.on("messages.upsert", listener)
    }
}
