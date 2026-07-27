import { card } from "./ui.js"
import { logCall } from "./pclog.js"
import { toDisplay, toIntl } from "./phone.js"
import { isOwnerNumber } from "./access.js"

// ═══════════════════════════════════════════════════════════
//  CALL GUARD — tolak & block panggilan masuk saat blockcall ON.
//
//  Perilaku:
//   • HANYA panggilan TERBARU yang diproses. Event "call" dari
//     Baileys dikirim berulang untuk satu panggilan yang sama
//     (offer → ringing → terminate); tanpa dedup, satu panggilan
//     bisa tercatat & diblokir berkali-kali.
//   • Saat blockcall ON: panggilan langsung DITOLAK lalu penelepon
//     LANGSUNG DIBLOCK (tidak menunggu apa pun).
//   • Nomor dicatat ke calllog.json dalam format +62xxx.
//   • Owner tidak pernah diblokir.
// ═══════════════════════════════════════════════════════════

let started = false

// id panggilan yang sudah diproses (dedup) — dibatasi agar tidak bocor.
const handledCalls = new Map() // callId -> timestamp
const HANDLED_TTL = 5 * 60 * 1000

// Nomor yang sudah dikirimi peringatan (sekali saja).
const warned = new Set()

function alreadyHandled(callId) {
    const now = Date.now()

    // Bersihkan entri lama.
    for (const [id, at] of handledCalls) {
        if (now - at > HANDLED_TTL) handledCalls.delete(id)
    }

    if (handledCalls.has(callId)) return true
    handledCalls.set(callId, now)
    return false
}

export function startCallGuard(sock) {
    if (started || !sock?.ev?.on) return
    started = true

    sock.ev.on("call", async (calls) => {
        try {
            const list = Array.isArray(calls) ? calls : [calls]
            if (!list.length) return

            // Ambil hanya penawaran panggilan (offer) — status lain adalah
            // lanjutan dari panggilan yang sama.
            const offers = list.filter((c) => c && c.status === "offer" && c.from)
            if (!offers.length) return

            // Urutkan dari yang PALING BARU, lalu proses satu per nomor.
            offers.sort((a, b) => Number(b.date || 0) - Number(a.date || 0))

            const seenNumbers = new Set()

            for (const call of offers) {
                const from = call.from
                const num = toIntl(from)
                if (!num) continue

                // Hanya panggilan TERBARU per nomor dalam satu batch event.
                if (seenNumbers.has(num)) continue
                seenNumbers.add(num)

                // Dedup lintas event untuk panggilan yang sama.
                const callId = call.id ? `${num}:${call.id}` : `${num}:${call.date || Date.now()}`
                if (alreadyHandled(callId)) continue

                const owner = isOwnerNumber(from)
                const active = !!global.settings?.blockcall
                const action = active && !owner ? "rejected+blocked" : "observed"

                // Selalu dicatat (fitur ON maupun OFF), format +62xxx.
                try {
                    logCall(from, { action, isVideo: !!call.isVideo })
                } catch {}

                if (!active || owner) continue

                // 1) Tolak panggilan.
                try {
                    await sock.rejectCall?.(call.id, from)
                } catch {}

                // 2) LANGSUNG block penelepon.
                try {
                    await sock.updateBlockStatus?.(from, "block")
                } catch {}

                // 3) Peringatan sekali (setelah block, best-effort).
                if (!warned.has(num)) {
                    warned.add(num)
                    try {
                        await sock.sendMessage(from, {
                            text: card(
                                "CALL BLOCKED",
                                [
                                    "📵 Bot tidak menerima panggilan.",
                                    `📱 ${toDisplay(num)}`,
                                    "Nomor kamu telah diblokir otomatis."
                                ],
                                { emoji: "📞" }
                            )
                        })
                    } catch {}
                }

                console.log(`[CallGuard] ${toDisplay(num)} → panggilan ditolak & diblokir.`)
            }
        } catch (e) {
            console.log(`[CallGuard] Error: ${e?.message || e}`)
        }
    })
}

export default { startCallGuard }
