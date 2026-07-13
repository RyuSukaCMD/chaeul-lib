import Button from "./button.js"
import { resolvePn, tag } from "./resolve.js"
import { getMarriage } from "./marriage.js"

const FOOTER = "© Chaeul"

// Peluang hasil FORCE (harus berjumlah 100)
const FORCE_CHANCE = {
    miss: 40, // gagal total
    rejected: 30, // aksi terjadi tapi target menolak
    accepted: 30 // aksi terjadi & target menerima
}

function rollForce() {
    const r = Math.random() * 100
    if (r < FORCE_CHANCE.miss) return "miss"
    if (r < FORCE_CHANCE.miss + FORCE_CHANCE.rejected) return "rejected"
    return "accepted"
}

// Referensi sock terakhir (untuk notifikasi expired dari timer store).
let sockRef = null

/** Cek apakah A & B pasangan menikah (agar bisa skip konfirmasi). */
function isCoupleMarried(a, b) {
    const na = String(a).replace(/[^0-9]/g, "")
    const nb = String(b).replace(/[^0-9]/g, "")
    const m = getMarriage(na)
    if (!m?.partner) return false
    return String(m.partner).replace(/[^0-9]/g, "") === nb
}

/**
 * Membangun command relationship berbasis konfirmasi tombol.
 * Alur: PENGUSUL konfirmasi → TARGET menjawab (Accept/Decline).
 *
 * @param {object}   cfg
 * @param {string}   cfg.name
 * @param {string}   cfg.key
 * @param {string[]} [cfg.aliases]
 * @param {string}   cfg.emoji
 * @param {string}   cfg.title
 * @param {string}   cfg.verbAsk
 * @param {object}   cfg.store
 * @param {function} [cfg.canPropose]
 * @param {function} cfg.onAccept
 * @param {boolean}  [cfg.forcible]
 * @param {object}   [cfg.forceText]
 * @param {boolean}  [cfg.skipIfMarried]  langsung eksekusi tanpa konfirmasi bila
 *                                        pengusul & target sudah menikah
 * @param {string}   [cfg.category]
 * @param {string}   [cfg.description]
 */
export function makeProposalCommand(cfg) {
    const emoji = cfg.emoji || "💞"
    const category = cfg.category || "Relationship"
    const key = cfg.key

    const commands = [
        cfg.name,
        ...(cfg.aliases || []),
        new RegExp(`^${key}_accept:.*`),
        new RegExp(`^${key}_decline:.*`)
    ]
    if (cfg.forcible) commands.push(new RegExp(`^${key}_force:.*`))

    return {
        command: commands,
        category,
        description: cfg.description || cfg.name,
        free: true,

        async run(ctx) {
            const { sock, m, command } = ctx
            sockRef = sock

            if (cfg.forcible && command.startsWith(`${key}_force:`)) {
                return handleForce({ ctx, cfg, emoji, key })
            }
            if (command.startsWith(`${key}_accept:`) || command.startsWith(`${key}_decline:`)) {
                return handleResponse({ ctx, cfg, emoji, key })
            }
            return handleCommand({ ctx, cfg, emoji, key })
        }
    }
}

async function verifyClicker(sock, m, expected) {
    const clickerPn = await resolvePn(sock, m, m.sender)
    return m.sender === expected || clickerPn === expected
}

// ── Handler tombol Accept / Decline ──
async function handleResponse({ ctx, cfg, emoji, key }) {
    const { sock, m, command } = ctx
    const store = cfg.store
    const isAccept = command.startsWith(`${key}_accept:`)
    const id = command.split(":")[1]

    const proposal = store.getProposal(id)
    if (!proposal) return expiredReply(m, cfg, emoji)

    const expected = proposal.stage === "proposer" ? proposal.proposer : proposal.target
    if (!(await verifyClicker(sock, m, expected))) return

    if (!isAccept) {
        store.deleteProposal(id)
        return m.reply(
            card(`💔 ${cfg.title}`, `${tag(expected)} menolak.\n\nPermintaan dibatalkan.`),
            {
                mentions: [expected]
            }
        )
    }

    if (proposal.stage === "proposer") {
        store.updateProposal(id, { proposerAccepted: true, stage: "target" })

        const buttons = [
            { type: "quick", text: "💖 Accept", id: `${key}_accept:${id}` },
            { type: "quick", text: "💔 Decline", id: `${key}_decline:${id}` }
        ]
        if (cfg.forcible) {
            buttons.push({ type: "quick", text: `⚡ Force`, id: `${key}_force:${id}` })
        }

        return Button.menu({
            sock,
            m,
            body: card(
                `${emoji} ${cfg.title}`,
                `${tag(proposal.proposer)} sudah menyetujui.\n\n` +
                    `Giliran ${tag(proposal.target)} untuk menjawab.\n\n` +
                    `Bersediakah kamu?` +
                    (cfg.forcible
                        ? `\n\n⚡ ${tag(proposal.proposer)} juga bisa menekan Force (untung-untungan).`
                        : ``) +
                    `\n\n⏳ Berlaku 1 menit.`
            ),
            footer: FOOTER,
            mentions: [proposal.proposer, proposal.target],
            buttons
        })
    }

    if (proposal.stage === "target") {
        store.updateProposal(id, { targetAccepted: true })
        const result = await cfg.onAccept(proposal, ctx)
        store.deleteProposal(id)
        if (result?.blocked) return m.reply(result.text)
        return m.reply(result.text, { mentions: [proposal.proposer, proposal.target] })
    }
}

// ── Handler tombol Force ──
async function handleForce({ ctx, cfg, emoji, key }) {
    const { sock, m, command } = ctx
    const store = cfg.store
    const id = command.split(":")[1]

    const proposal = store.getProposal(id)
    if (!proposal) return expiredReply(m, cfg, emoji)

    if (!(await verifyClicker(sock, m, proposal.proposer))) return

    store.deleteProposal(id)

    const outcome = rollForce()
    const t = cfg.forceText || {}
    const mentions = [proposal.proposer, proposal.target]

    if (outcome === "miss") {
        return m.reply(
            card(
                `😵 ${cfg.title} — GAGAL`,
                (typeof t.miss === "function"
                    ? t.miss(proposal)
                    : `${tag(proposal.proposer)} mencoba memaksa\n${tag(proposal.target)} tapi gagal total! 💨`) +
                    `\n\n🎲 Force meleset (40%)`
            ),
            { mentions }
        )
    }
    if (outcome === "rejected") {
        return m.reply(
            card(
                `😠 ${cfg.title} — DITOLAK`,
                (typeof t.rejected === "function"
                    ? t.rejected(proposal)
                    : `${tag(proposal.proposer)} memaksa\n${tag(proposal.target)}, berhasil tapi\n${tag(proposal.target)} menolak & marah! 😤`) +
                    `\n\n🎲 Sukses tapi ditolak (30%)`
            ),
            { mentions }
        )
    }
    return m.reply(
        card(
            `💞 ${cfg.title} — BERHASIL`,
            (typeof t.accepted === "function"
                ? t.accepted(proposal)
                : `${tag(proposal.proposer)} memaksa\n${tag(proposal.target)} dan ternyata\n${tag(proposal.target)} menerimanya! 💕`) +
                `\n\n🎲 Sukses & diterima (30%)`
        ),
        { mentions }
    )
}

// ── Handler command utama ──
async function handleCommand({ ctx, cfg, emoji, key }) {
    const { sock, m } = ctx
    const store = cfg.store

    await m.react(emoji)

    const proposer = await resolvePn(sock, m, m.sender)
    const rawTarget = m.mentionedJid?.[0] || m.quoted?.sender
    const target = await resolvePn(sock, m, rawTarget)

    if (!target) {
        return m.reply(
            card(
                `${emoji} ${cfg.title}`,
                `Tag atau reply user yang ingin kamu tuju.\n\nContoh:\n${global.prefix}${cfg.name} @user`
            )
        )
    }

    if (target === proposer) {
        return m.reply(card(`💔 ${cfg.title}`, `Tidak bisa ke dirimu sendiri. 😅`))
    }

    if (cfg.canPropose) {
        const err = cfg.canPropose(proposer, target)
        if (err) return m.reply(err, { mentions: [proposer, target] })
    }

    // ── SKIP KONFIRMASI bila sudah menikah dgn target ──
    // Pasangan suami-istri tidak perlu Accept/Decline untuk kiss/hug dll.
    if (cfg.skipIfMarried && isCoupleMarried(proposer, target)) {
        const result = await cfg.onAccept({ proposer, target, chat: m.chat }, ctx)
        return m.reply(result.text, { mentions: [proposer, target] })
    }

    if (store.getActiveProposalOf(proposer)) {
        return m.reply(card(`💔 ${cfg.title}`, `Kamu masih punya permintaan yang berlangsung.`))
    }
    if (store.getActiveProposalOf(target)) {
        return m.reply(
            card(
                `💔 ${cfg.title}`,
                `${tag(target)} sedang dalam permintaan lain. Coba lagi nanti.`
            ),
            { mentions: [target] }
        )
    }

    const proposal = store.createProposal({ proposer, target, chat: m.chat })

    // Jadwalkan notifikasi bila proposal kedaluwarsa tanpa terselesaikan.
    // Berlaku untuk semua store (file-based / in-memory). Jika store punya
    // onExpire sendiri (actionStore), notifikasi ini tetap aman (idempotent
    // via pengecekan getProposal).
    scheduleExpireTag(store, proposal.id, cfg, emoji)

    return Button.menu({
        sock,
        m,
        body: card(
            `${emoji} ${cfg.title}`,
            `${tag(proposer)} ingin ${cfg.verbAsk}\n${tag(target)} ${emoji}\n\n` +
                `${tag(proposer)} konfirmasi dulu ya.\n\n⏳ Berlaku 1 menit.`
        ),
        footer: FOOTER,
        mentions: [proposer, target],
        buttons: [
            { type: "quick", text: "💖 Accept", id: `${key}_accept:${proposal.id}` },
            { type: "quick", text: "💔 Decline", id: `${key}_decline:${proposal.id}` }
        ]
    })
}

// Jadwalkan tag ke pembuat proposal bila expired & belum selesai.
// Dicek pada detik ke-59 (sebelum TTL 60s) selagi proposal masih ada.
// (actionStore punya onExpire sendiri; ini terutama untuk store file-based
//  seperti marry/partner. Pengecekan getProposal mencegah tag ganda karena
//  proposal yang sudah di-accept/decline pasti sudah dihapus dari store.)
function scheduleExpireTag(store, id, cfg, emoji) {
    // Bila store sudah punya mekanisme expiry sendiri (actionStore dgn onExpire),
    // jangan jadwalkan lagi agar tidak dobel notifikasi.
    if (store.hasExpiryNotifier) return

    const t = setTimeout(async () => {
        try {
            const data = store.getProposal ? store.getProposal(id) : null
            if (!data) return // sudah diproses (accept/decline) → tidak perlu notif
            store.deleteProposal?.(id)
            if (sockRef && data.chat) {
                await sockRef.sendMessage(data.chat, {
                    text: card(
                        `⌛ ${cfg.title} EXPIRED`,
                        `${tag(data.proposer)}, permintaan ${emoji} kamu ke ` +
                            `${tag(data.target)} kedaluwarsa (tidak ada respon).`
                    ),
                    mentions: [data.proposer, data.target]
                })
            }
        } catch {}
    }, 59 * 1000)
    if (t.unref) t.unref()
}

// Notifikasi saat proposal expired: tag pembuat proposal (untuk actionStore).
export function makeExpireNotifier(title, emoji) {
    return async (proposal) => {
        if (!sockRef || !proposal?.chat) return
        try {
            await sockRef.sendMessage(proposal.chat, {
                text: card(
                    `⌛ ${title} EXPIRED`,
                    `${tag(proposal.proposer)}, permintaan ${emoji} kamu ke ` +
                        `${tag(proposal.target)} kedaluwarsa (tidak ada respon).`
                ),
                mentions: [proposal.proposer, proposal.target]
            })
        } catch {}
    }
}

function card(title, content) {
    return `╭━━━〔 ${title} 〕━━━⬣\n${content}\n╰━━━━━━━━━━━━━━━━━━⬣`
}

function expiredReply(m, cfg, emoji) {
    return m.reply(
        card(`${emoji} ${cfg.title}`, `Permintaan sudah kedaluwarsa atau tidak ditemukan.`)
    )
}

export default { makeProposalCommand, makeExpireNotifier }
