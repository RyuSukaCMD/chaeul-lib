import Loader from "./loader.js"
import Func from "./function.js"
import Logger from "./logger.js"
import fs from "fs"
import Button from "./button.js"

import {
    isRegistered,
    getRegisterSession,
    setRegisterSession,
    clearRegisterSession,
    saveUser
} from "./register.js"
import { hasAccount, getBalance, deductToken, ensureAccount, STARTER_TOKEN } from "./token.js"
import { isPremium } from "./premium.js"
import { enforceAntilink } from "./antilinkGuard.js"
import { getSession, deleteSession } from "./addcommand.js"
import { isMuted, getMute, unmute } from "./mute.js"
import { isBlacklist } from "../lib/blacklistgroup.js"
import { isAfk, getAfk, delAfk } from "./afk.js"

export default async function Handler(sock, m) {
    let body = m.body || ""

    // ─── Logger Chat ───
    Logger.chat(m)

    // ─── AFK Check (Self) ───
    if (isAfk(m.sender)) {
        const afk = getAfk(m.sender)
        const duration = Func.toTime(Date.now() - afk.time)
        delAfk(m.sender)
        await m.reply(
            `╭━━━〔 🌤️ AFK OFF 〕━━━⬣\n` +
                `┃\n` +
                `┃ Selamat datang kembali! 👋\n` +
                `┃\n` +
                `┃ 📝 Alasan  : ${afk.reason || "Tidak ada"}\n` +
                `┃ ⏱️ Durasi  : ${duration}\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`
        )
    }

    const sender = m.senderNumber || m.sender.split("@")[0]

    const isCreator = global.owner.some(
        (owner) => sender === owner || m.sender === owner || m.sender.startsWith(owner)
    )

    // ─── Antilink Guard (grup) ───
    // Cek SEMUA pesan di grup; hapus + warn + kick bila melanggar.
    // Dijalankan SEBELUM self-mode agar antilink tetap aktif walau bot self.
    try {
        const handled = await enforceAntilink(sock, m, { isCreator })
        if (handled) return
    } catch (e) {
        Logger.error(`antilink → ${e.message}`)
    }

    // ─── Self Mode ───
    if (global.settings?.public === false && !isCreator) return

    // ─── Session / Add Command ───
    const session = getSession(m.sender)
    if (session && !m.body.startsWith(global.prefix)) {
        try {
            fs.writeFileSync(session.file, m.body, "utf8")
            const ok = await Loader.reload(session.file)
            if (!ok) {
                fs.unlinkSync(session.file)
                deleteSession(m.sender)
                return m.reply(`❌ Syntax Error.\nCommand dibatalkan.`)
            }
            deleteSession(m.sender)
            return m.reply(`✅ Command berhasil ditambahkan.\n📁 ${session.file}`)
        } catch (e) {
            if (fs.existsSync(session.file)) fs.unlinkSync(session.file)
            deleteSession(m.sender)
            console.error(e)
            return m.reply(String(e))
        }
    }

    // ─── Registrasi Multi-step (input nama & umur) ───
    // Menangkap input teks saat user berada di tengah proses registrasi.
    const reg = getRegisterSession(m.sender)
    if (reg && !m.body.startsWith(global.prefix)) {
        const value = m.body.trim()

        // Batalkan registrasi
        if (value.toLowerCase() === "batal") {
            clearRegisterSession(m.sender)
            return m.reply(`❌ Registrasi dibatalkan.`)
        }

        // Tahap NAMA → simpan, lanjut pilih GENDER
        if (reg.step === "name") {
            if (!value) return m.reply(`Nama tidak boleh kosong. Ketik nama kamu:`)

            // Nama tidak boleh mengandung baris baru (newline)
            if (/[\r\n]/.test(value)) {
                return m.reply(
                    `Nama tidak boleh mengandung baris baru (enter).\n` +
                        `Ketik nama dalam satu baris:`
                )
            }

            // Batasi panjang nama agar wajar
            if (value.length > 30) {
                return m.reply(`Nama terlalu panjang (maks 30 karakter). Ketik ulang:`)
            }

            setRegisterSession(m.sender, {
                step: "gender",
                data: { ...reg.data, name: value }
            })

            return Button.menu({
                sock,
                m,
                body:
                    `╭━━━〔 ✦ REGISTRASI ✦ 〕━━━⬣\n` +
                    `Nama : ${value} ✅\n\n` +
                    `Langkah 2 dari 3\n\n` +
                    `Silakan pilih *gender* kamu:\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`,
                footer: "© Chaeul",
                lock: m.sender,
                buttons: [
                    { type: "quick", text: "👨 Laki-laki", id: "reg_gender_male" },
                    { type: "quick", text: "👩 Wanita", id: "reg_gender_female" }
                ]
            })
        }

        // Tahap UMUR → validasi, simpan user, beri token starter
        if (reg.step === "age") {
            const age = parseInt(value, 10)
            if (isNaN(age) || age < 1 || age > 100) {
                return m.reply(`Umur tidak valid (1-100). Ketik angka umur kamu (contoh: 17):`)
            }

            const user = saveUser(m.sender, {
                name: reg.data.name,
                gender: reg.data.gender,
                age
            })

            // Beri akun token + 30 token starter
            ensureAccount(m.sender)

            clearRegisterSession(m.sender)

            return m.reply(
                `╭━━━〔 ✅ REGISTRASI BERHASIL 〕━━━⬣\n` +
                    `👤 Nama   : ${user.name}\n` +
                    `⚧️ Gender : ${user.gender}\n` +
                    `🎂 Umur   : ${user.age}\n\n` +
                    `🪙 Kamu mendapat ${STARTER_TOKEN} token starter!\n\n` +
                    `Setiap command memerlukan 1 token.\n` +
                    `Cek sisa token: ${global.prefix}token\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }
    }

    // ─── Anti-usil: Button/Selection Lock ───
    // Tombol/pilihan yang dikunci punya penanda "\u200b#lock=<number>".
    // Hanya user yang dituju (pemilik) yang boleh menekannya.
    let rawBody = body
    const lockMatch = rawBody.match(/\u200b#lock=(\d+)$/)
    if (lockMatch) {
        const lockedNumber = lockMatch[1]
        const clickerNumber = (m.senderNumber || m.sender.split("@")[0]).split(":")[0]

        // Bersihkan penanda lock dari body agar command dikenali normal
        rawBody = rawBody.replace(/\u200b#lock=\d+$/, "")

        // Bukan pemilik → abaikan total (biar tidak bisa diganggu user lain)
        if (clickerNumber !== lockedNumber) return

        body = rawBody
        m.body = rawBody
    }

    // ─── Button & Command Detection ───
    // Ada 3 cara sebuah pesan dianggap perintah:
    //  1. Berprefix (mis. ".menu")
    //  2. Button (body cocok persis dgn plugin, mis. hasil klik tombol)
    //  3. Mode tanpa-prefix aktif & kata pertama cocok dengan sebuah command
    const hasPrefix = body.startsWith(global.prefix)

    // Deteksi button (klik tombol) — hanya id/regex tombol, bukan kata biasa
    let isButton = false
    if (!hasPrefix && body) {
        isButton = !!Loader.getButton(body)
    }

    // Deteksi command tanpa-prefix (hanya untuk command, bukan hal lain)
    let noPrefixCommand = false
    if (!hasPrefix && !isButton && global.noPrefix && body) {
        const firstWord = body.trim().split(/ +/).shift().toLowerCase()
        if (firstWord && Loader.get(firstWord)) noPrefixCommand = true
    }

    const isCommand = hasPrefix || noPrefixCommand

    if (!isCommand && !isButton) return

    // Potong prefix hanya bila memang berprefix
    const stripped = hasPrefix ? body.slice(global.prefix.length) : body

    const command = isButton ? body : stripped.trim().split(/ +/).shift().toLowerCase()

    const args = isButton ? [] : stripped.trim().split(/ +/).slice(1)

    const text = args.join(" ")

    // ─── Auto Presence ───
    if (global.settings?.autotyping) {
        await sock.sendPresenceUpdate("composing", m.chat)
    } else if (global.settings?.autovoice) {
        await sock.sendPresenceUpdate("recording", m.chat)
    }

    // ─── Load Plugin ───
    const plugin = Loader.get(command)

    // ─── Blacklist Group Check ───
    if (m.isGroup && !isCreator && isBlacklist(m.chat)) {
        if (global.settings?.autotyping || global.settings?.autovoice) {
            await sock.sendPresenceUpdate("paused", m.chat)
        }
    }

    // ─── Plugin Not Found ───
    if (!plugin) {
        if (global.settings?.autotyping || global.settings?.autovoice) {
            await sock.sendPresenceUpdate("paused", m.chat)
        }
        return
    }

    // ─── Register Gate ───
    // Semua command WAJIB registrasi lebih dulu KECUALI:
    //  - command register (+ alias daftar) & tombol pilihan gender
    //  - marry & partner (boleh dipakai tanpa register) + tombol-tombolnya
    // (Input teks nama/umur ditangani di blok registrasi multi-step di atas.)
    const registerWhitelist = [
        "register",
        "daftar",
        /^reg_gender_(male|female)$/,
        // Marry
        "marry",
        /^marry_(accept|decline|force):.*/,
        // Partner
        "partner",
        "pacar",
        "gandeng",
        /^partner_(accept|decline|force):.*/
    ]

    const bypassRegister = registerWhitelist.some((item) =>
        typeof item === "string" ? item === command : item.test(command)
    )

    if (!isCreator && !isRegistered(sender) && !bypassRegister) {
        if (global.settings?.autotyping || global.settings?.autovoice) {
            await sock.sendPresenceUpdate("paused", m.chat)
        }
        return Button.menu({
            sock,
            m,
            body:
                `╭━━━〔 ✦ WAJIB REGISTRASI ✦ 〕━━━⬣\n` +
                `┃\n` +
                `┃ Kamu belum terdaftar!\n` +
                `┃\n` +
                `┃ Daftar dulu untuk memakai\n` +
                `┃ seluruh fitur Chaeul dan\n` +
                `┃ dapatkan 30 token gratis. 🪙\n` +
                `┃\n` +
                `┃ Tekan tombol di bawah\n` +
                `┃ untuk memulai registrasi.\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`,
            footer: "© Chaeul",
            buttons: [
                {
                    type: "quick",
                    text: "📝 Register",
                    id: ".register"
                }
            ]
        })
    }

    // ─── Owner Only Check ───
    if (plugin.owner && !isCreator) {
        if (global.settings?.autotyping || global.settings?.autovoice) {
            await sock.sendPresenceUpdate("paused", m.chat)
        }
        return m.reply(global.mess.owner)
    }

    // ─── AFK Check (Mentions & Quoted) ───
    const targets = new Set()

    if (m.mentionedJid) {
        m.mentionedJid.forEach((jid) => targets.add(jid))
    }

    if (m.quoted?.sender) {
        targets.add(m.quoted.sender)
    }

    for (const jid of targets) {
        if (!isAfk(jid)) continue

        const afk = getAfk(jid)
        const duration = Func.toTime(Date.now() - afk.time)

        await m.reply(
            `╭━━━〔 🌙 USER SEDANG AFK 〕━━━⬣\n` +
                `┃\n` +
                `┃ 👤 @${jid.split("@")[0]}\n` +
                `┃ 📝 Alasan : ${afk.reason || "Tidak ada"}\n` +
                `┃ ⏱️ Sejak  : ${duration} lalu\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━⬣`,
            { mentions: [jid] }
        )
    }

    // ─── Token Gate (1 token per command) ───
    // Command yang GRATIS (tidak memotong token):
    //  - command dasar: menu, ping, register, daftar, token, help, allmenu
    //  - command relationship (plugin.free === true): marry, partner,
    //    divorce, couple, kiss, hug
    const freeCommands = [
        "menu",
        "allmenu",
        "help",
        "ping",
        "register",
        "daftar",
        "token",
        "tokens",
        "saldo"
    ]

    const isFree = plugin.free === true || freeCommands.includes(command)

    // Premium = token tak terbatas (tidak dipotong)
    const premium = isPremium(sender) || isPremium(m.sender)

    if (!isCreator && !isFree && !premium) {
        // Wajib punya akun token (dari registrasi) untuk memakai fitur berbayar.
        if (!hasAccount(sender)) {
            if (global.settings?.autotyping || global.settings?.autovoice) {
                await sock.sendPresenceUpdate("paused", m.chat)
            }
            return m.reply(
                `╭━━━〔 🪙 TOKEN 〕━━━⬣\n` +
                    `Kamu belum memiliki akun.\n\n` +
                    `Daftar dulu untuk mendapat\n` +
                    `${30} token starter:\n\n` +
                    `${global.prefix}register\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }

        // Coba potong 1 token (dari saldo pribadi / pool pasangan)
        const ok = deductToken(sender, 1)
        if (!ok) {
            if (global.settings?.autotyping || global.settings?.autovoice) {
                await sock.sendPresenceUpdate("paused", m.chat)
            }
            return m.reply(
                `╭━━━〔 🪙 TOKEN HABIS 〕━━━⬣\n` +
                    `Token kamu tidak cukup.\n\n` +
                    `Sisa : ${getBalance(sender)} token\n\n` +
                    `Setiap command memerlukan\n` +
                    `1 token.\n` +
                    `╰━━━━━━━━━━━━━━━━━━⬣`
            )
        }
    }

    // ─── Run Plugin ───
    const start = Date.now()
    try {
        await plugin.run({
            sock,
            m,
            body,
            command,
            args,
            text,
            Func,
            isCreator
        })
        Logger.command(m, command, Date.now() - start)
    } catch (e) {
        Logger.error(`${command} → ${e.message}`)
        console.error(e)
        m.reply(String(e))
    }

    // ─── Reset Presence ───
    if (global.settings?.autotyping || global.settings?.autovoice) {
        await sock.sendPresenceUpdate("paused", m.chat)
    }
}
