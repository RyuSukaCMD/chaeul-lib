import Button from "./button.js"
import { resolvePn, tag } from "./resolve.js"

const FOOTER = "© Chaeul"

// Peluang hasil FORCE (harus berjumlah 100)
const FORCE_CHANCE = {
    miss: 40, // gagal total
    rejected: 30, // aksi terjadi tapi target menolak
    accepted: 30 // aksi terjadi & target menerima
}

/** Menggulir hasil force berdasarkan peluang. */
function rollForce() {
    const r = Math.random() * 100
    if (r < FORCE_CHANCE.miss) return "miss"
    if (r < FORCE_CHANCE.miss + FORCE_CHANCE.rejected) return "rejected"
    return "accepted"
}

/**
 * Membangun command relationship berbasis konfirmasi tombol.
 * Alur: PENGUSUL konfirmasi → TARGET menjawab (Accept/Decline).
 *
 * @param {object}   cfg
 * @param {string}   cfg.name        - nama command utama
 * @param {string}   cfg.key         - prefix button unik
 * @param {string[]} [cfg.aliases]   - alias command
 * @param {string}   cfg.emoji       - emoji reaksi & hiasan
 * @param {string}   cfg.title       - judul kartu
 * @param {string}   cfg.verbAsk     - kata kerja (mis. "mencium")
 * @param {object}   cfg.store       - modul database proposal
 * @param {function} [cfg.canPropose]- (proposer,target)=>string|null
 * @param {function} cfg.onAccept    - async (proposal,ctx)=>{ text, blocked? }
 * @param {boolean}  [cfg.forcible]  - aktifkan tombol Force (chance-based)
 * @param {object}   [cfg.forceText] - teks hasil force { miss, rejected, accepted } (fungsi proposal→string)
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
        free: true, // handler tidak memotong token untuk command ini

        async run(ctx) {
            const { sock, m, command } = ctx
            const store = cfg.store

            // ═══════════ FORCE (chance-based) ═══════════
            if (cfg.forcible && command.startsWith(`${key}_force:`)) {
                return handleForce({ ctx, cfg, emoji, key })
            }

            // ═══════════ ACCEPT / DECLINE ═══════════
            if (command.startsWith(`${key}_accept:`) || command.startsWith(`${key}_decline:`)) {
                return handleResponse({ ctx, cfg, emoji, key })
            }

            // ═══════════ COMMAND UTAMA ═══════════
            return handleCommand({ ctx, cfg, emoji, key })
        }
    }
}

// ── Penentu penekan tombol yang sah pada tahap ini ──
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

    // ── DECLINE ──
    if (!isAccept) {
        store.deleteProposal(id)
        return m.reply(
            card(`💔 ${cfg.title}`, `${tag(expected)} menolak.\n\nPermintaan dibatalkan.`),
            { mentions: [expected] }
        )
    }

    // ── ACCEPT tahap PENGUSUL → tanya TARGET ──
    if (proposal.stage === "proposer") {
        store.updateProposal(id, { proposerAccepted: true, stage: "target" })

        const buttons = [
            { type: "quick", text: "💖 Accept", id: `${key}_accept:${id}` },
            { type: "quick", text: "💔 Decline", id: `${key}_decline:${id}` }
        ]
        // Tombol Force khusus pengusul (chance-based)
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

    // ── ACCEPT tahap TARGET → jalankan aksi ──
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

    // Hanya PENGUSUL yang boleh memaksa
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

    // accepted
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

// ── Handler command utama (.kiss @user, dst) ──
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
                `Tag atau reply user yang ingin kamu tuju.\n\n` +
                    `Contoh:\n${global.prefix}${cfg.name} @user`
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

// ── Util tampilan kartu ──
function card(title, content) {
    return `╭━━━〔 ${title} 〕━━━⬣\n${content}\n╰━━━━━━━━━━━━━━━━━━⬣`
}

function expiredReply(m, cfg, emoji) {
    return m.reply(
        card(`${emoji} ${cfg.title}`, `Permintaan sudah kedaluwarsa atau tidak ditemukan.`)
    )
}

export default { makeProposalCommand }
