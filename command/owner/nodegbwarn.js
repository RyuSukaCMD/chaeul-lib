import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import {
    isWarnTarget,
    setWarnTarget,
    unsetWarnTarget,
    getWarnTargets,
    getWatcherInfo,
    getNotifBlacklist,
    getLastStatus,
    runNodeCheckOnce
} from "../../lib/nodewatcher.js"

const LOCK_RX = /​#lock=\d+$/
const cleanBody = (m) => String(m.body || "").replace(LOCK_RX, "").trim()

const ICON = { online: "🟢", offline: "🔴", maintenance: "🟡" }
const LABEL = { online: "ONLINE", offline: "OFFLINE", maintenance: "MAINTENANCE" }

const formatTime = (ts) =>
    ts ? new Date(ts).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "_belum pernah_"

export default {
    command: [
        "nodegbwarn",
        "nodewarn",
        /^nodegbwarn_(set|unset|check)$/
    ],

    owner: true,

    category: "Owner",

    description: "Atur grup penerima notifikasi perubahan status node (mati/nyala/maintenance)",

    async run({ sock, m, args }) {
        // ─── Router klik button (lock suffix sudah dipotong) ───
        const body = cleanBody(m)
        if (body === "nodegbwarn_set") return await doSet(sock, m)
        if (body === "nodegbwarn_unset") return await doUnset(sock, m)
        if (body === "nodegbwarn_check") return await doCheckNow(sock, m)

        // ─── Via argumen teks ───
        const sub = (args[0] || "").toLowerCase()
        if (sub === "set" || sub === "on" || sub === "aktif") return await doSet(sock, m)
        if (sub === "unset" || sub === "off" || sub === "del" || sub === "hapus" || sub === "nonaktif") return await doUnset(sock, m)
        if (sub === "check" || sub === "cek" || sub === "now") return await doCheckNow(sock, m)

        // ─── Status + tombol set/unset ───
        const info = getWatcherInfo()
        const blacklist = getNotifBlacklist()
        const lastStatus = getLastStatus()
        const active = isWarnTarget(m.chat)
        const nodeEntries = Object.values(lastStatus)

        return Button.menu({
            sock,
            m,
            body: card("NODE STATUS WARNING", [
                "🔔 Sistem pemantau status node otomatis.",
                "Bot mengecek *seluruh node* setiap " + info.intervalText,
                "dan mengirim notifikasi bila status berubah",
                "(🟢 nyala / 🔴 mati / 🟡 maintenance).",
                "",
                "─────────────────",
                "",
                `📍 Chat ini: ${active ? "✅ TERDAFTAR sebagai target" : "❌ BUKAN target"}`,
                `👥 Total target: *${getWarnTargets().length}* grup`,
                `⏱️ Interval cek: ${info.intervalText}`,
                `🔕 Blacklist notif: *${blacklist.length}* node (${global.prefix}blnotif)`,
                "",
                "─────────────────",
                "",
                `🕒 Cek terakhir: ${formatTime(info.lastCheckAt)}`,
                nodeEntries.length
                    ? `🖥️ Kondisi terakhir: ${nodeEntries.map((n) => `${ICON[n.state] || "⚪"} ${n.name}`).join(" • ")}`
                    : "🖥️ Kondisi terakhir: _belum ada data_",
                "",
                "─────────────────",
                "",
                "*Kelola dengan tombol di bawah, atau:*",
                `${global.prefix}nodegbwarn set`,
                `${global.prefix}nodegbwarn unset`,
                `${global.prefix}nodegbwarn check`,
                `${global.prefix}blnotif <node_id>`,
                "",
                "_Tombol terkunci — hanya bisa kamu yang klik._"
            ], { emoji: "🔔" }),
            footer: "© Chaeul",
            lock: m.sender,
            buttons: [
                { type: "quick", text: "✅ Set Group Ini", id: "nodegbwarn_set" },
                { type: "quick", text: "❌ Unset Group Ini", id: "nodegbwarn_unset" },
                { type: "quick", text: "🔄 Cek Sekarang", id: "nodegbwarn_check" }
            ]
        })
    }
}

// ─── SET: jadikan chat ini target notifikasi ───
async function doSet(sock, m) {
    if (isWarnTarget(m.chat)) {
        return m.reply(card("SUDAH TERDAFTAR", [
            "ℹ️ Chat ini *sudah terdaftar* sebagai target notifikasi node.",
            "",
            `Ketik ${global.prefix}nodegbwarn unset untuk berhenti.`
        ], { emoji: "🔔" }))
    }

    const res = setWarnTarget(m.chat, m.sender)

    return Button.menu({
        sock,
        m,
        body: card("TARGET DISET", [
            "✅ Chat ini sekarang menerima *Node Status Warning*.",
            "",
            "Bot akan mengirim notifikasi ke sini bila ada node",
            "yang berubah status (🟢 nyala / 🔴 mati / 🟡 maintenance).",
            "",
            `👥 Total target: *${res.total}* grup`,
            "",
            `_Cek berkala tiap ${getWatcherInfo().intervalText}._`
        ], { emoji: "✅" }),
        footer: "© Chaeul",
        lock: m.sender,
        buttons: [
            { type: "quick", text: "❌ Unset Group Ini", id: "nodegbwarn_unset" },
            { type: "quick", text: "🔄 Cek Sekarang", id: "nodegbwarn_check" }
        ]
    })
}

// ─── UNSET: cabut chat ini dari target ───
async function doUnset(sock, m) {
    const res = unsetWarnTarget(m.chat)

    if (!res.removed) {
        return m.reply(card("BELUM TERDAFTAR", [
            "ℹ️ Chat ini *bukan* target notifikasi node.",
            "",
            `Ketik ${global.prefix}nodegbwarn set untuk mendaftarkan.`
        ], { emoji: "🔔" }))
    }

    return m.reply(card("TARGET DICABUT", [
        "❌ Chat ini *tidak lagi* menerima notifikasi status node.",
        "",
        `👥 Sisa target: *${res.total}* grup`,
        "",
        `_Daftarkan lagi dengan ${global.prefix}nodegbwarn set._`
    ], { emoji: "❌" }))
}

// ─── CHECK: cek seluruh node sekarang + laporkan ───
async function doCheckNow(sock, m) {
    await m.reply("🔍 Mengecek seluruh node...")

    let result
    try {
        result = await runNodeCheckOnce(sock)
    } catch (error) {
        return m.reply(card("ERROR", [
            "❌ Gagal mengecek node.",
            "",
            `*Error:* ${error.message}`,
            "",
            "_Pastikan panel sudah diset (.setpterodactyl)._"
        ], { emoji: "❌" }))
    }

    const states = Object.values(result.states)
    const bl = new Set(getNotifBlacklist())

    const nodeLines = states.length
        ? states.map((n) => {
            const blMark = bl.has(String(n.id)) ? " 🔕" : ""
            return `├ ${ICON[n.state] || "⚪"} ${n.name} (${n.id}) — ${LABEL[n.state] || n.state}${blMark}`
          })
        : ["├ _tidak ada node_"]

    const changeLines = result.changes.length
        ? [
              "⚠️ *Perubahan terdeteksi:*",
              ...result.changes.map((c) => `├ ${ICON[c.from]} ${LABEL[c.from]} → ${ICON[c.to]} ${LABEL[c.to]} : ${c.name}${bl.has(String(c.id)) ? " 🔕(tidak dinotifkan)" : ""}`),
              ""
          ]
        : ["✅ Tidak ada perubahan — semua status stabil.", ""]

    return m.reply(card("NODE CHECK", [
        result.baseline ? "🆕 Baseline awal dibuat (cek pertama)." : "🔍 Hasil pengecekan baru saja:",
        "",
        ...changeLines,
        "🖥️ *Kondisi seluruh node:*",
        ...nodeLines,
        "",
        `👥 Target notif: *${result.targets.length}* grup • 🔕 BL: *${bl.size}* node`,
        `⏭️ Cek otomatis berikutnya dalam ${getWatcherInfo().intervalText}`
    ], { emoji: "🔍" }))
}
