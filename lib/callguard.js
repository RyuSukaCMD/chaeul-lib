import { card } from "./ui.js"

// ═══════════════════════════════════════════════════════════
//  CALL GUARD — tolak panggilan masuk saat setting blockcall ON.
//
//  Repo ini hanya berisi lib/ + command/ (index.js utama ada di bot
//  induk), jadi listener event "call" DIPASANG dari sini melalui
//  lazy-start di handler — cukup sekali per koneksi.
//
//  Perilaku saat aktif:
//   • panggilan (voice/video) langsung DITOLAK
//   • penelepon dikirimi peringatan SEKALI
//   • nomor penelepon di-BLOCK (non-owner)
// ═══════════════════════════════════════════════════════════

let started = false

export function startCallGuard(sock) {
    if (started || !sock?.ev?.on) return
    started = true

    const warned = new Set() // nomor yang sudah dikirimi peringatan

    sock.ev.on("call", async (calls) => {
        try {
            if (!global.settings?.blockcall) return

            for (const call of calls || []) {
                if (call?.status !== "offer") continue

                const from = call.from
                if (!from) continue

                const num = String(from).split("@")[0].split(":")[0]
                const isOwner = (global.owner || []).some(
                    (o) => num === o || String(from).startsWith(o)
                )
                if (isOwner) continue

                try {
                    await sock.rejectCall?.(call.id, from)
                } catch {}

                if (!warned.has(num)) {
                    warned.add(num)
                    try {
                        await sock.sendMessage(from, {
                            text: card(
                                "CALL BLOCKED",
                                [
                                    "📵 Bot tidak menerima panggilan.",
                                    "Nomor kamu telah diblokir otomatis."
                                ],
                                { emoji: "📞" }
                            )
                        })
                    } catch {}
                }

                try {
                    await sock.updateBlockStatus?.(from, "block")
                } catch {}

                console.log(`[CallGuard] Panggilan dari ${num} ditolak + diblokir.`)
            }
        } catch (e) {
            console.log(`[CallGuard] Error: ${e?.message || e}`)
        }
    })
}

export default { startCallGuard }
