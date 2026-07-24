import { card } from "../../lib/ui.js"
import {
    getNotifBlacklist,
    isNotifBlacklisted,
    addNotifBlacklist,
    removeNotifBlacklist,
    getLastStatus
} from "../../lib/nodewatcher.js"
import { getNode } from "../../lib/pterodactyl.js"

const ICON = { online: "🟢", offline: "🔴", maintenance: "🟡" }
const LABEL = { online: "ONLINE", offline: "OFFLINE", maintenance: "MAINTENANCE" }

// Node masuk sini → tetap dilacak, tapi perubahan statusnya TIDAK dikirim
// sebagai notifikasi Node Status Warning. Toggle: ketik lagi utk mencabut.
export default {
    command: ["blnotif", "blwarn", "mutenode"],

    owner: true,

    category: "Owner",

    description: "Blacklist node dari notifikasi Node Status Warning (toggle)",

    async run({ sock, m, args }) {
        const sub = (args[0] || "").toLowerCase()
        const blacklist = getNotifBlacklist()
        const lastStatus = getLastStatus()

        const nodeName = async (id) => {
            const known = lastStatus[String(id)]?.name
            if (known) return known
            try {
                const node = await getNode(id)
                return node?.name ?? node?.attributes?.name ?? `Node ${id}`
            } catch {
                return `Node ${id}`
            }
        }

        // ─── List ───
        if (!sub || sub === "list" || sub === "daftar") {
            const lines = []
            if (blacklist.length === 0) {
                lines.push("├ _Kosong — semua node dinotifkan._")
            } else {
                for (const id of blacklist) {
                    const st = lastStatus[id]
                    lines.push(`├ 🔕 ${await nodeName(id)} (${id})${st ? ` — ${ICON[st.state] || "⚪"} ${LABEL[st.state] || st.state}` : ""}`)
                }
            }

            return m.reply(card("NOTIF BLACKLIST", [
                "🔕 Node di daftar ini *tidak mengirim notifikasi*",
                "saat statusnya berubah (mati/nyala/maintenance).",
                "Statusnya tetap dilacak di background.",
                "",
                "─────────────────",
                "",
                ...lines,
                "",
                "─────────────────",
                "",
                "*Cara pakai:*",
                `${global.prefix}blnotif <node_id> — tambah/hapus (toggle)`,
                `${global.prefix}blnotif rm <node_id> — hapus`,
                `${global.prefix}nodegbwarn — kelola grup target`
            ], { emoji: "🔕" }))
        }

        // ─── rm <id> ───
        if (sub === "rm" || sub === "del" || sub === "hapus" || sub === "remove") {
            const id = String(args[1] || "").trim()
            if (!id) return m.reply(card("ERROR", [`❌ Masukkan ID node. Contoh: ${global.prefix}blnotif rm 3`], { emoji: "❌" }))
            if (!isNotifBlacklisted(id)) {
                return m.reply(card("TIDAK ADA", [`ℹ️ Node *${id}* memang tidak ada di blacklist notif.`], { emoji: "ℹ️" }))
            }
            removeNotifBlacklist(id)
            return m.reply(card("BLNOTIF DICABUT", [
                `🔔 Node *${await nodeName(id)}* (ID: ${id}) dihapus dari blacklist notif.`,
                "",
                "Perubahan statusnya akan dinotifkan lagi.",
                "",
                `🔕 Sisa blacklist: *${getNotifBlacklist().length}* node`
            ], { emoji: "🔔" }))
        }

        // ─── <id> → toggle ───
        const id = String(args[0] || "").trim()
        if (!/^\d+$/.test(id)) {
            return m.reply(card("ERROR", [
                "❌ ID node tidak valid.",
                "",
                `Contoh: ${global.prefix}blnotif 3`,
                `Atau: ${global.prefix}blnotif list`
            ], { emoji: "❌" }))
        }

        const name = await nodeName(id)

        if (isNotifBlacklisted(id)) {
            removeNotifBlacklist(id)
            return m.reply(card("BLNOTIF DICABUT", [
                `🔔 Node *${name}* (ID: ${id}) dikeluarkan dari blacklist.`,
                "",
                "Perubahan statusnya akan dinotifkan lagi.",
                "",
                `🔕 Sisa blacklist: *${getNotifBlacklist().length}* node`,
                "",
                `_Toggle lagi: ${global.prefix}blnotif ${id}_`
            ], { emoji: "🔔" }))
        }

        addNotifBlacklist(id)
        return m.reply(card("BLNOTIF DITAMBAH", [
            `🔕 Node *${name}* (ID: ${id}) diblacklist dari notifier.`,
            "",
            "Perubahan statusnya *tidak akan dikirim* sebagai notifikasi.",
            "(statusnya tetap dilacak di background)",
            "",
            `🔕 Total blacklist: *${getNotifBlacklist().length}* node`,
            "",
            `_Cabut: ${global.prefix}blnotif ${id} (lagi)_`
        ], { emoji: "🔕" }))
    }
}
