import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import {
    getPlayer,
    addItem,
    addXp,
    cdLeft,
    setCd,
    CONFIG,
    rodLuck,
    rodReel,
    recordCatch,
    getIsland,
    getEnchantId,
    getPity,
    bumpPity,
    resetPity
} from "../../lib/rpg.js"
import { getStackedEffect } from "../../lib/events.js"
import { RARITY, PHASE_RARITIES, rollMutation, fishValue, fishDisplay } from "../../lib/fish.js"
import {
    ISLANDS,
    ISLAND_CATALOG,
    randomIslandFish,
    rollIslandRarity,
    isRarePlus,
    islandFishTotal,
    fishIslandIndex
} from "../../lib/island.js"
import { enchantEffect, STONE_INFO } from "../../lib/enchant.js"

// Sesi minigame: sid -> { owner, chat, island, fishes:[{fish,mutation}], ... }
const sessions = new Map()

// Kunci per-grup: hanya 1 user boleh mancing dalam satu grup pada satu waktu.
const groupLock = new Map() // chat -> sid

function releaseLock(chat, sid) {
    if (groupLock.get(chat) === sid) groupLock.delete(chat)
}

const DIRS = ["⬆️", "⬇️", "⬅️", "➡️", "↗️", "↘️", "↕️", "↔️", "🔄", "🎯"]

const newId = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}
const fmtWait = (ms) => {
    const s = Math.ceil(ms / 1000)
    return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`
}

// Bangun 1 phase: array slot 0..n-1 dgn urutan klik acak & arah acak
function buildPhase(count) {
    const order = shuffle([...Array(count).keys()])
    const dirs = order.map(() => DIRS[Math.floor(Math.random() * DIRS.length)])
    return { order, dirs, next: 0 }
}

// Kirim tombol untuk phase aktif (urutan tampil diacak)
async function sendPhaseButtons(sock, m, sess) {
    const phase = sess.phases[sess.phaseIdx]
    const count = phase.order.length
    const owner = sess.owner
    const totalPhases = sess.phases.length

    const buttons = []
    for (let s = 0; s < count; s++) {
        const clickOrder = phase.order.indexOf(s) + 1
        buttons.push({
            type: "quick",
            text: `${clickOrder} ${phase.dirs[phase.order.indexOf(s)]}`,
            id: `fish_pull:${sess.sid}:${s}`
        })
    }

    const phaseLine = totalPhases > 1 ? `\n🌀 *Phase ${sess.phaseIdx + 1}/${totalPhases}*` : ""

    return Button.menu({
        sock,
        m,
        body: card(
            "TARIK KAIL!",
            [
                `${tag(owner)}, 🎯 *KLIK TOMBOL SESUAI URUTAN!*${phaseLine}`,
                ``,
                `Urutan: 1 → ${count}`,
                `⏳ Cepat sebelum kabur!`
            ],
            { emoji: "🎣" }
        ),
        footer: "© Chaeul RPG",
        mentions: [owner],
        lock: owner,
        buttons: shuffle(buttons)
    })
}

export default {
    command: ["fishing", "mancing", "fish", /^fish_pull:.*/],

    category: "RPG",

    description: "Memancing ikan (minigame urutan tombol)",

    async run({ sock, m, command }) {
        const me = await resolvePn(sock, m, m.sender)

        // ═══════════ Handler tombol tarik kail ═══════════
        if (command.startsWith("fish_pull:")) {
            const [, sid, slotStr] = command.split(":")
            const slot = Number(slotStr)
            const sess = sessions.get(sid)
            if (!sess || sess.done) return

            const clicker = await resolvePn(sock, m, m.sender)
            if (clicker !== sess.owner && m.sender !== sess.owner) return

            const phase = sess.phases[sess.phaseIdx]
            const expected = phase.order[phase.next]

            // Salah urutan → ikan lepas
            if (slot !== expected) {
                sess.done = true
                sessions.delete(sid)
                releaseLock(sess.chat, sid)
                return m.reply(
                    card("MANCING", "😩 Yah, ikannya lepas!\nSemoga beruntung lain kali!", {
                        emoji: "🎣"
                    }),
                    { mentions: [sess.owner] }
                )
            }

            phase.next++

            // Phase belum selesai → tunggu klik berikutnya
            if (phase.next < phase.order.length) return

            // Phase selesai → lanjut phase berikutnya bila ada
            if (sess.phaseIdx < sess.phases.length - 1) {
                sess.phaseIdx++
                return sendPhaseButtons(sock, m, sess)
            }

            // ── Semua phase selesai → dapat ikan(-ikan) ──
            sess.done = true
            sessions.delete(sid)
            releaseLock(sess.chat, sid)

            const ev = getStackedEffect()
            const lines = []
            let totalValue = 0
            let anyNew = false
            let anyLevel = false

            for (const catchItem of sess.fishes) {
                const { fish, mutation } = catchItem
                addItem(me, fish.id + (mutation ? `#${mutation.id}` : ""), 1)
                const { isNew } = recordCatch(me, fish.id)
                if (isNew) anyNew = true

                const xpGain = RARITY[fish.rarity].weight > 1000 ? 15 : 40
                const { leveled } = addXp(me, xpGain)
                if (leveled) anyLevel = true

                let value = fishValue(fish, mutation)
                if (ev.money > 1) value = Math.round(value * ev.money) // Market Boom
                totalValue += value

                const rar = RARITY[fish.rarity]
                const idx = fishIslandIndex(fish.id)
                const total = islandFishTotal(sess.island)

                lines.push(`${fishDisplay(fish, mutation)}`)
                if (isNew) lines.push(`🆕 IKAN BARU! Index #${idx}/${total}`)
                lines.push(`${rar.emoji} ${rar.label} • 💰 $${value.toLocaleString("id-ID")}`)
                lines.push(``)
            }

            // Bonus enchant stone drop
            if (sess.stoneDrop) {
                addItem(me, sess.stoneDrop.item, 1)
                lines.push(`🎁 BONUS: ${sess.stoneDrop.emoji} ${sess.stoneDrop.name}!`)
                lines.push(``)
            }

            const header =
                sess.fishes.length > 1
                    ? `🎉🎉 ${tag(sess.owner)} DOUBLE CATCH!`
                    : `🎉 ${tag(sess.owner)} menangkap:`

            return m.reply(
                card(
                    "MANCING BERHASIL",
                    [
                        header,
                        `${ISLANDS[sess.island].emoji} ${ISLANDS[sess.island].name}`,
                        ``,
                        ...lines,
                        `💰 Total : $${totalValue.toLocaleString("id-ID")}`,
                        anyLevel ? `🎊 NAIK LEVEL!` : ``,
                        anyNew
                            ? `Cek koleksi: ${global.prefix}fishdex`
                            : `Jual: ${global.prefix}sell`
                    ].filter((x) => x !== ``),
                    { emoji: "🎣" }
                ),
                { mentions: [sess.owner] }
            )
        }

        // ═══════════ Command utama: mulai memancing ═══════════
        if (m.isGroup && groupLock.has(m.chat)) {
            return m.reply(
                card(
                    "MANCING",
                    "🎣 Ada yang sedang memancing di grup ini.\nTunggu sampai selesai ya!",
                    { emoji: "⏳" }
                )
            )
        }

        const p = getPlayer(me)
        const island = getIsland(me)
        const ench = enchantEffect(getEnchantId(me))
        const ev = getStackedEffect()

        // Cooldown (event Frenzy = tanpa CD)
        const noCd = ev.noFishCd
        const left = noCd ? 0 : cdLeft(me, "fish", CONFIG.fishCooldown)
        if (left > 0) {
            return m.reply(
                card("MANCING", `⏳ Sabar, tunggu ${fmtWait(left)} lagi.`, { emoji: "🎣" })
            )
        }
        if (!noCd) setCd(me, "fish")

        const reel = rodReel(p)

        // 1) Reply "Memancing..."
        const sent = await m.reply(
            card(
                "MANCING",
                `🎣 Memancing di ${ISLANDS[island].emoji} ${ISLANDS[island].name}...\nMelempar kail ke air...`,
                { emoji: "🎣" }
            )
        )
        const msgKey = sent?.key

        // 2) Tunggu (5-10 detik) — reel speed + enchant Lightning Reel mempercepat
        const baseWait = 5000 + Math.floor(Math.random() * 5000)
        let wait = baseWait - reel * 1500
        if (ench.reelSpeed) wait = wait * (1 - ench.reelSpeed) // -5% (Lightning Reel)
        wait = Math.max(1500, Math.round(wait))
        await new Promise((r) => setTimeout(r, wait))
        try {
            await sock.sendMessage(m.chat, {
                text: card("MANCING", "❗ *Kail pancing bergerak!*\nBersiap menarik...", {
                    emoji: "🎣"
                }),
                edit: msgKey
            })
        } catch {}

        // 3) Hitung luck (rod × event × enchant Coral) + PITY
        let luck = rodLuck(p)
        if (ev.luck > 1) luck *= ev.luck
        // Reef Shouter: boost rare di Coral Reefs
        if (island === "coral" && ench.coralRareBoost > 1) luck *= ench.coralRareBoost

        const pityKey = island // pity per-island
        const pity = getPity(me, pityKey)

        // Roll rarity (island-aware + pity)
        const { rarity } = rollIslandRarity(island, luck, pity)

        // Update pity: rare+ → reset, selain itu → +1
        if (isRarePlus(rarity)) resetPity(me, pityKey)
        else bumpPity(me, pityKey, 1)

        // Pilih ikan. Enchant Hopeful: chance ganti dgn ikan yg belum ada di index.
        let fish = randomIslandFish(island, rarity)
        if (ench.newFishChance > 0 && Math.random() < ench.newFishChance) {
            const dex = getPlayer(me).dex || {}
            const missing = ISLAND_CATALOG[island].filter((f) => !dex[f.id])
            if (missing.length) fish = missing[Math.floor(Math.random() * missing.length)]
        }

        // Mutation (event Golden × + enchant Gold Hand pada golden)
        let mutation = rollMutation(ev.mutation || 1)
        if (!mutation && ench.goldMutBoost > 1) {
            // beri kesempatan tambahan khusus golden
            const golden = { id: "golden", name: "Golden", emoji: "🟡", mult: 3 }
            if (Math.random() < 0.03 * ench.goldMutBoost) mutation = golden
        }

        const fishes = [{ fish, mutation }]

        // Enchant Double Reel: chance 8% dapat ikan kedua
        if (ench.doubleCatch > 0 && Math.random() < ench.doubleCatch) {
            const { rarity: r2 } = rollIslandRarity(island, luck, 0)
            const fish2 = randomIslandFish(island, r2)
            const mut2 = rollMutation(ev.mutation || 1)
            fishes.push({ fish: fish2, mutation: mut2 })
        }

        // Enchant stone drop (Sacred Jungle → rare stone chance)
        let stoneDrop = null
        const isc = ISLANDS[island]
        if (isc.rareStoneChance > 0 && Math.random() < isc.rareStoneChance) {
            stoneDrop = STONE_INFO.rare
        } else if (Math.random() < 0.04) {
            // 4% common stone di island manapun
            stoneDrop = STONE_INFO.common
        }

        // Jumlah button per phase (dikurangi reel, min 1)
        const cfg = RARITY[rarity]
        const btnCount = () => Math.max(1, randInt(cfg.buttons[0], cfg.buttons[1]) - reel)

        // Phase: rarity biasa = 1 phase; mythical+ = acak dalam rentang
        let phaseCount = 1
        if (PHASE_RARITIES.includes(rarity) && Array.isArray(cfg.phases)) {
            phaseCount = randInt(cfg.phases[0], cfg.phases[1])
        }
        const phases = Array.from({ length: phaseCount }, () => buildPhase(btnCount()))

        const sid = newId()
        const sess = {
            sid,
            owner: me,
            chat: m.chat,
            island,
            fishes,
            stoneDrop,
            phases,
            phaseIdx: 0,
            done: false
        }
        sessions.set(sid, sess)
        if (m.isGroup) groupLock.set(m.chat, sid)

        // Auto-expire 45 detik
        const t = setTimeout(() => {
            const s = sessions.get(sid)
            releaseLock(m.chat, sid)
            if (s && !s.done) {
                sessions.delete(sid)
                sock.sendMessage(m.chat, {
                    text: card("MANCING", `⌛ ${tag(me)} terlalu lama! Ikannya kabur. 🐟💨`, {
                        emoji: "🎣"
                    }),
                    mentions: [me]
                }).catch(() => {})
            }
        }, 45 * 1000)
        if (t.unref) t.unref()

        // 4) Kirim tombol phase pertama
        return sendPhaseButtons(sock, m, sess)
    }
}
