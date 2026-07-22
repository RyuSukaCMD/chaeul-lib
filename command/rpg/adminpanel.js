import Button from "../../lib/button.js"
import { card } from "../../lib/ui.js"
import { resolvePn, tag } from "../../lib/resolve.js"
import { addItem, addMoney, ITEMS } from "../../lib/rpg.js"
import { ISLANDS, ISLAND_ORDER, ISLAND_CATALOG } from "../../lib/island.js"
import {
    WEATHER,
    getActiveWeather,
    startWeather,
    endWeather,
    clearWeather
} from "../../lib/fishingWeather.js"
import {
    beginAdminPanel,
    getAdminPanel,
    updateAdminPanel,
    clearAdminPanel
} from "../../lib/adminPanel.js"

function money(value) {
    return Number(value).toLocaleString("id-ID")
}

function activeWeatherText() {
    const active = getActiveWeather()
    return active.length
        ? active.map((weather) => `${weather.emoji} ${weather.name}`).join(" + ")
        : "Normal"
}

function panelBody() {
    return card(
        "ADMINPANEL",
        [
            `Weather: ${activeWeatherText()}`,
            ``,
            `Pilih tindakan.`
        ],
        { emoji: "🛠️" }
    )
}

async function sendPanel(sock, m, me) {
    const active = getActiveWeather()
    const activeIds = new Set(active.map((weather) => weather.id))
    const grantRows = [
        { title: "💰 Uang", description: "Kirim saldo ke user", id: "adminpanel_action:money" },
        { title: "🐟 Ikan", description: "Kirim ikan ke user", id: "adminpanel_action:fish" },
        { title: "🎣 Rod", description: "Kirim rod ke user", id: "adminpanel_action:rod" },
        { title: "📦 Item", description: "Kirim item ke user", id: "adminpanel_action:item" }
    ]
    const weatherRows = WEATHER.map((weather) => ({
        title: `${weather.emoji} ${weather.name}${activeIds.has(weather.id) ? " · aktif" : ""}`,
        description: weather.desc,
        id: `adminpanel_weather_set:${weather.id}`
    }))
    const unsetRows = active.map((weather) => ({
        title: `◌ ${weather.emoji} ${weather.name}`,
        description: "Hentikan weather ini",
        id: `adminpanel_weather_unset:${weather.id}`
    }))
    unsetRows.push({
        title: "✕ Clear Weather",
        description: "Hentikan semua weather",
        id: "adminpanel_weather_clear"
    })

    return Button.menu({
        sock,
        m,
        body: panelBody(),
        footer: "Chaeul · Admin",
        lock: me,
        listTitle: "Adminpanel",
        sections: [
            { title: "GRANT", rows: grantRows },
            { title: "SET WEATHER", rows: weatherRows },
            { title: "UNSET WEATHER", rows: unsetRows }
        ],
        buttons: [{ type: "quick", text: "Refresh", id: "adminpanel_refresh" }]
    })
}

async function targetPrompt(sock, m, me) {
    return Button.menu({
        sock,
        m,
        body: card("TARGET", "Tag user, kirim nomor, atau ketik self.", { emoji: "👤" }),
        footer: "Adminpanel",
        lock: me,
        buttons: [
            { type: "quick", text: "Self", id: "adminpanel_target:self" },
            { type: "quick", text: "Batal", id: "adminpanel_cancel" }
        ]
    })
}

async function resolveAdminTarget(sock, m, raw) {
    const mentioned = m.mentionedJid?.[0]
    if (mentioned) return resolvePn(sock, m, mentioned)

    const value = String(raw || "").trim().split(/\s+/)[0]
    if (value.toLowerCase() === "self") return resolvePn(sock, m, m.sender)

    const digits = value.replace(/\D/g, "")
    if (digits.length < 5) return null
    return resolvePn(sock, m, `${digits}@s.whatsapp.net`)
}

async function showTargetAction(sock, m, session) {
    if (session.action === "money") {
        session.step = "amount"
        return m.reply(card("NOMINAL", "Kirim jumlah uang yang akan diberikan.", { emoji: "💰" }))
    }

    if (session.action === "fish") {
        session.step = "fish_island"
        const rows = ISLAND_ORDER.map((id) => ({
            title: `${ISLANDS[id].emoji} ${ISLANDS[id].name}`,
            description: `${ISLAND_CATALOG[id].length} ikan`,
            id: `adminpanel_fish_island:${id}`
        }))
        return Button.menu({
            sock,
            m,
            body: card("IKAN", `Target: ${tag(session.target)}\nPilih island.`, { emoji: "🐟" }),
            footer: "Adminpanel",
            lock: session.owner,
            listTitle: "Pilih Island",
            sections: [{ title: "ISLAND", rows }],
            mentions: [session.target]
        })
    }

    const rows = Object.entries(ITEMS)
        .filter(([, item]) => session.action === "rod" ? item.type === "rod" : item.type !== "rod")
        .map(([id, item]) => ({
            title: `${item.emoji} ${item.name}`,
            description:
                item.type === "rod"
                    ? `Luck ×${item.luck} · Reel -${item.reel}`
                    : `Item ${id}`,
            id: `${session.action === "rod" ? "adminpanel_rod" : "adminpanel_item"}:${id}`
        }))

    session.step = "choose_item"
    return Button.menu({
        sock,
        m,
        body: card("ITEM", `Target: ${tag(session.target)}\nPilih item.`, { emoji: "📦" }),
        footer: "Adminpanel",
        lock: session.owner,
        listTitle: session.action === "rod" ? "Pilih Rod" : "Pilih Item",
        sections: [{ title: session.action === "rod" ? "ROD" : "ITEM", rows }],
        mentions: [session.target]
    })
}

async function beginAction(sock, m, me, action) {
    beginAdminPanel(me, { action, step: "target" })
    return targetPrompt(sock, m, me)
}

async function completeGrant(m, session, label, id, qty = 1) {
    if (session.action === "money") {
        addMoney(session.target, session.amount)
        label = `$${money(session.amount)}`
    } else {
        addItem(session.target, id, qty)
        label = `${label} ×${qty}`
    }

    clearAdminPanel(session.owner)
    await m.react("✅")
    return m.reply(
        card(
            "BERHASIL",
            [`${label}`, `Target: ${tag(session.target)}`],
            { emoji: "✅" }
        ),
        { mentions: [session.target] }
    )
}

export default {
    command: [
        "adminpanel",
        "adminpanel_input",
        /^adminpanel_action:.+$/,
        /^adminpanel_target:.+$/,
        /^adminpanel_fish_island:.+$/,
        /^adminpanel_fish:.+$/,
        /^adminpanel_rod:.+$/,
        /^adminpanel_item:.+$/,
        /^adminpanel_weather_set:.+$/,
        /^adminpanel_weather_unset:.+$/,
        "adminpanel_weather_clear",
        "adminpanel_confirm",
        "adminpanel_refresh",
        "adminpanel_cancel"
    ],

    owner: true,
    category: "RPG",
    description: "Kelola RPG, user, dan weather.",

    async run({ sock, m, command, body, isCreator }) {
        if (!isCreator && command === "adminpanel_input") return
        const me = await resolvePn(sock, m, m.sender)

        if (command === "adminpanel" || command === "adminpanel_refresh") {
            clearAdminPanel(me)
            return sendPanel(sock, m, me)
        }

        if (command === "adminpanel_cancel") {
            clearAdminPanel(me)
            return m.reply(card("ADMINPANEL", "Dibatalkan.", { emoji: "↩️" }))
        }

        if (command.startsWith("adminpanel_action:")) {
            const action = command.split(":")[1]
            if (!["money", "fish", "rod", "item"].includes(action)) return
            return beginAction(sock, m, me, action)
        }

        if (command === "adminpanel_target:self") {
            const session = getAdminPanel(me)
            if (!session || session.step !== "target") return
            session.target = me
            await showTargetAction(sock, m, session)
            return
        }

        if (command === "adminpanel_input") {
            const session = getAdminPanel(me)
            if (!session) return m.reply(card("ADMINPANEL", "Sesi sudah berakhir.", { emoji: "⌛" }))

            if (session.step === "target") {
                const target = await resolveAdminTarget(sock, m, body)
                if (!target)
                    return m.reply(card("TARGET", "Target tidak valid. Gunakan tag, nomor, atau self.", { emoji: "👤" }))
                session.target = target
                await showTargetAction(sock, m, session)
                return
            }

            if (session.step === "amount") {
                const amount = Number(String(body).replace(/[^0-9]/g, ""))
                if (!Number.isSafeInteger(amount) || amount <= 0)
                    return m.reply(card("NOMINAL", "Kirim angka yang valid.", { emoji: "💰" }))
                updateAdminPanel(me, { step: "confirm", amount })
                return Button.menu({
                    sock,
                    m,
                    body: card("KONFIRMASI", `Berikan $${money(amount)} ke ${tag(session.target)}?`, {
                        emoji: "💰"
                    }),
                    footer: "Adminpanel",
                    lock: me,
                    buttons: [
                        { type: "quick", text: "Konfirmasi", id: "adminpanel_confirm" },
                        { type: "quick", text: "Batal", id: "adminpanel_cancel" }
                    ],
                    mentions: [session.target]
                })
            }

            if (session.step === "fish_qty") {
                const qty = Number(String(body).replace(/[^0-9]/g, ""))
                if (!Number.isSafeInteger(qty) || qty <= 0 || qty > 999999)
                    return m.reply(card("JUMLAH", "Kirim jumlah 1–999999.", { emoji: "🐟" }))
                updateAdminPanel(me, { step: "confirm", qty })
                return Button.menu({
                    sock,
                    m,
                    body: card("KONFIRMASI", `Kirim ikan ×${qty} ke ${tag(session.target)}?`, {
                        emoji: "🐟"
                    }),
                    footer: "Adminpanel",
                    lock: me,
                    buttons: [
                        { type: "quick", text: "Konfirmasi", id: "adminpanel_confirm" },
                        { type: "quick", text: "Batal", id: "adminpanel_cancel" }
                    ],
                    mentions: [session.target]
                })
            }
            return
        }

        if (command.startsWith("adminpanel_fish_island:")) {
            const session = getAdminPanel(me)
            const island = command.split(":")[1]
            if (!session || session.action !== "fish" || !ISLAND_CATALOG[island]) return
            updateAdminPanel(me, { step: "fish_select", island })
            const rows = ISLAND_CATALOG[island].map((fish) => ({
                title: `${fish.emoji} ${fish.name}`,
                description: fish.rarity,
                id: `adminpanel_fish:${fish.id}`
            }))
            return Button.menu({
                sock,
                m,
                body: card("IKAN", `Pilih ikan dari ${ISLANDS[island].name}.`, { emoji: "🐟" }),
                footer: "Adminpanel",
                lock: me,
                listTitle: "Pilih Ikan",
                sections: [{ title: ISLANDS[island].name, rows }]
            })
        }

        if (command.startsWith("adminpanel_fish:")) {
            const session = getAdminPanel(me)
            const fishId = command.split(":")[1]
            const fish = Object.values(ISLAND_CATALOG).flat().find((item) => item.id === fishId)
            if (!session || session.action !== "fish" || session.step !== "fish_select" || !fish) return
            updateAdminPanel(me, { step: "fish_qty", fishId, fishName: fish.name })
            return m.reply(card("JUMLAH", `Kirim jumlah ${fish.emoji} ${fish.name}.`, { emoji: "🐟" }))
        }

        if (command.startsWith("adminpanel_rod:") || command.startsWith("adminpanel_item:")) {
            const session = getAdminPanel(me)
            const [prefix, id] = command.split(":")
            const item = ITEMS[id]
            if (!session || !item) return
            if (prefix === "adminpanel_rod" && item.type !== "rod") return
            if (prefix === "adminpanel_item" && item.type === "rod") return
            return completeGrant(m, session, `${item.emoji} ${item.name}`, id)
        }

        if (command === "adminpanel_confirm") {
            const session = getAdminPanel(me)
            if (!session || session.step !== "confirm") return
            if (session.action === "money") return completeGrant(m, session, "Uang", null)
            const fish = Object.values(ISLAND_CATALOG).flat().find((item) => item.id === session.fishId)
            return completeGrant(m, session, `${fish?.emoji || "🐟"} ${fish?.name || session.fishId}`, session.fishId, session.qty)
        }

        if (command.startsWith("adminpanel_weather_set:")) {
            const id = command.split(":")[1]
            const weather = startWeather(id)
            if (weather) await m.react("✅")
            return sendPanel(sock, m, me)
        }

        if (command.startsWith("adminpanel_weather_unset:")) {
            endWeather(command.split(":")[1])
            await m.react("✅")
            return sendPanel(sock, m, me)
        }

        if (command === "adminpanel_weather_clear") {
            clearWeather()
            await m.react("✅")
            return sendPanel(sock, m, me)
        }

        return sendPanel(sock, m, me)
    }
}
