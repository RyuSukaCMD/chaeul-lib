import { readJSON, writeJSON } from "./db.js"
import Logger from "./logger.js"

const DB = "./database/fishing-weather.json"
const MIN_DURATION = 30 * 60 * 1000
const MAX_DURATION = 60 * 60 * 1000
const MIN_INTERVAL = 2 * 60 * 60 * 1000
const MAX_INTERVAL = 5 * 60 * 60 * 1000
const OVERLAP_CHANCE = 0.2

export const WEATHER = [
    {
        id: "rainy",
        name: "Rainy",
        emoji: "🌧️",
        desc: "Waktu tunggu kail lebih singkat.",
        effect: { waitMultiplier: 0.65 }
    },
    {
        id: "thunderstorm",
        name: "Thunderstorm",
        emoji: "⛈️",
        desc: "Cooldown dan waktu tunggu kail lebih singkat.",
        effect: { waitMultiplier: 0.5, cooldownMultiplier: 0.5 }
    },
    {
        id: "fullmoon",
        name: "Fullmoon",
        emoji: "🌕",
        desc: "Peluang mutation bertema langit dan galaksi meningkat.",
        effect: { mutationTags: { sky: 2.5, galaxy: 2.5 } }
    },
    {
        id: "snowy",
        name: "Snowy",
        emoji: "❄️",
        desc: "Peluang mutation Chilled dan Frozen meningkat.",
        effect: { mutationTags: { cold: 3 } }
    },
    {
        id: "bloodmoon",
        name: "Bloodmoon",
        emoji: "🌑",
        desc: "Peluang mutation Blood meningkat.",
        effect: { mutationTags: { blood: 3 } }
    },
    {
        id: "shark_hunter",
        name: "Shark Hunter",
        emoji: "🦈",
        desc: "Shark Island terbuka untuk sementara.",
        effect: { sharkHunter: true }
    }
]

const WEATHER_MAP = Object.fromEntries(WEATHER.map((weather) => [weather.id, weather]))

function readState() {
    const state = readJSON(DB, { active: [], groups: {} })
    if (!Array.isArray(state.active)) state.active = []
    if (!state.groups || typeof state.groups !== "object") state.groups = {}
    return state
}

function saveState(state) {
    writeJSON(DB, state)
}

function clean(state) {
    const now = Date.now()
    const active = state.active.filter((entry) => entry.endsAt > now && WEATHER_MAP[entry.id])
    if (active.length !== state.active.length) {
        state.active = active
        saveState(state)
    }
    return state
}

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function durationMs() {
    return randomBetween(MIN_DURATION, MAX_DURATION)
}

function intervalMs() {
    return randomBetween(MIN_INTERVAL, MAX_INTERVAL)
}

export function registerWeatherGroup(jid) {
    if (!jid || !jid.endsWith("@g.us")) return
    const state = readState()
    if (!state.groups[jid]) {
        state.groups[jid] = true
        saveState(state)
    }
}

export function getWeatherGroups() {
    return Object.keys(readState().groups || {})
}

export function getActiveWeather() {
    const state = clean(readState())
    return state.active
        .map((entry) => {
            const weather = WEATHER_MAP[entry.id]
            return weather ? { ...weather, endsAt: entry.endsAt } : null
        })
        .filter(Boolean)
}

export function getWeatherEffect() {
    const effect = {
        waitMultiplier: 1,
        cooldownMultiplier: 1,
        mutationTags: {},
        sharkHunter: false,
        active: getActiveWeather()
    }

    for (const weather of effect.active) {
        const current = weather.effect || {}
        if (current.waitMultiplier) effect.waitMultiplier *= current.waitMultiplier
        if (current.cooldownMultiplier) effect.cooldownMultiplier *= current.cooldownMultiplier
        if (current.sharkHunter) effect.sharkHunter = true
        for (const [tag, multiplier] of Object.entries(current.mutationTags || {})) {
            effect.mutationTags[tag] = (effect.mutationTags[tag] || 1) * multiplier
        }
    }

    return effect
}

export function startWeather(id = null, options = {}) {
    const weather = id ? WEATHER_MAP[id] : WEATHER[randomBetween(0, WEATHER.length - 1)]
    if (!weather) return null

    const state = clean(readState())
    const endsAt = Date.now() + Math.max(60000, options.durationMs || durationMs())
    const existing = state.active.find((entry) => entry.id === weather.id)
    if (existing) existing.endsAt = endsAt
    else state.active.push({ id: weather.id, endsAt })
    saveState(state)
    return { ...weather, endsAt }
}

export function endWeather(id) {
    const state = readState()
    state.active = state.active.filter((entry) => entry.id !== id)
    saveState(state)
}

export function clearWeather() {
    const state = readState()
    state.active = []
    saveState(state)
}

function pickAvailableWeather() {
    const activeIds = new Set(getActiveWeather().map((weather) => weather.id))
    const available = WEATHER.filter((weather) => !activeIds.has(weather.id))
    return available[randomBetween(0, Math.max(0, available.length - 1))] || null
}

async function broadcastWeather(sock, weatherList) {
    if (!weatherList.length) return
    const lines = weatherList
        .map((weather) => `${weather.emoji} *${weather.name}*\n${weather.desc}`)
        .join("\n\n")
    const text = [
        "✦ WEATHER UPDATE",
        "",
        lines,
        "",
        `Aktif selama ${Math.round((weatherList[0].endsAt - Date.now()) / 60000)} menit.`,
        `Gunakan ${global.prefix}mancing untuk memanfaatkan buff.`
    ].join("\n")

    let sent = 0
    for (const jid of getWeatherGroups()) {
        try {
            await sock.sendMessage(jid, { text })
            sent++
            await new Promise((resolve) => setTimeout(resolve, 500))
        } catch {}
    }
    Logger.info?.(`Weather broadcast: ${sent} grup.`)
}

async function startScheduledWeather(sock) {
    const started = []
    const first = startWeather()
    if (first) started.push(first)

    if (Math.random() < OVERLAP_CHANCE) {
        const second = pickAvailableWeather()
        if (second) {
            const startedSecond = startWeather(second.id)
            if (startedSecond) started.push(startedSecond)
        }
    }

    await broadcastWeather(sock, started)
}

let timer = null

export function startWeatherWatcher(sock) {
    if (timer) clearTimeout(timer)

    const schedule = () => {
        timer = setTimeout(() => {
            startScheduledWeather(sock)
                .catch((error) => Logger.error?.(`weather → ${error.message}`))
                .finally(schedule)
        }, intervalMs())
        if (timer.unref) timer.unref()
    }

    schedule()
    Logger.info?.("Weather aktif: interval acak 2–5 jam, durasi acak 30–60 menit.")
}

export default {
    WEATHER,
    registerWeatherGroup,
    getWeatherGroups,
    getActiveWeather,
    getWeatherEffect,
    startWeather,
    endWeather,
    clearWeather,
    startWeatherWatcher
}
