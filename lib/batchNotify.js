// ═══════════════════════════════════════════════════════════
//  BATCH NOTIFY — gabungkan notifikasi yang berdekatan waktunya.
//
//  Dipakai untuk: welcome, goodbye, dan pengingat absen.
//  Kalau dalam WINDOW (default 10 detik) ada 2+ event sejenis di
//  grup yang SAMA, semuanya digabung jadi SATU pesan yang men-tag
//  banyak orang sekaligus (bukan spam banyak pesan).
//
//  Cara pakai:
//    enqueue({ sock, chat, type, jid, data, render, window })
//    - key batch = `${chat}|${type}`
//    - saat window habis → render(items, ctx) dipanggil 1x untuk semua item
//
//  render(items, { sock, chat }) HARUS mengirim pesannya sendiri
//  (punya akses ke daftar jid untuk mentions).
// ═══════════════════════════════════════════════════════════

const buckets = new Map() // key -> { items:[], timer, sock, chat, type, render, firstAt }

const DEFAULT_WINDOW = 10 * 1000 // 10 detik

/**
 * Masukkan 1 item ke batch. Bila belum ada bucket → buat + jadwalkan flush.
 * @param {object} o
 * @param {object} o.sock   socket baileys
 * @param {string} o.chat   group jid
 * @param {string} o.type   kategori batch ("welcome" | "goodbye" | "absenwarn")
 * @param {string} o.jid    jid orang yang di-tag
 * @param {object} [o.data] data tambahan per-item (mis. { number, name, remaining })
 * @param {function} o.render  async (items, { sock, chat }) => void  (kirim pesan)
 * @param {number} [o.window]  ms; default 10 detik
 */
export function enqueue({ sock, chat, type, jid, data = {}, render, window = DEFAULT_WINDOW }) {
    const key = `${chat}|${type}`
    let b = buckets.get(key)

    if (!b) {
        b = { items: [], timer: null, sock, chat, type, render, firstAt: Date.now() }
        buckets.set(key, b)
    }

    // Hindari duplikat jid dalam 1 batch (mis. event ganda dari WA).
    if (jid && b.items.some((it) => it.jid === jid)) {
        return
    }
    b.items.push({ jid, ...data })
    // selalu pakai render/sock terbaru
    b.sock = sock
    b.render = render

    if (!b.timer) {
        b.timer = setTimeout(() => flush(key), window)
        if (b.timer.unref) b.timer.unref()
    }
}

async function flush(key) {
    const b = buckets.get(key)
    if (!b) return
    buckets.delete(key)
    if (b.timer) clearTimeout(b.timer)
    if (!b.items.length) return
    try {
        await b.render(b.items, { sock: b.sock, chat: b.chat })
    } catch (e) {
        console.error("[BATCH]", b.type, e?.message || e)
    }
}

/** Flush paksa semua bucket (mis. saat shutdown). */
export async function flushAllBatches() {
    const keys = [...buckets.keys()]
    for (const k of keys) await flush(k)
}

export default { enqueue, flushAllBatches }
