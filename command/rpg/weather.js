import { card } from "../../lib/ui.js"
import { getActiveWeather } from "../../lib/fishingWeather.js"

function timeLeft(endsAt) {
    const ms = Math.max(0, endsAt - Date.now())
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`
}

export default {
    command: ["weather", "cuaca"],

    category: "RPG",

    description: "Lihat weather fishing yang sedang aktif",

    async run({ m }) {
        const active = getActiveWeather()
        if (!active.length) {
            return m.reply(card("WEATHER", "Weather normal. Tidak ada buff aktif.", { emoji: "☁️" }))
        }

        const lines = active.flatMap((weather, index) => [
            `${weather.emoji} *${weather.name}*`,
            `${weather.desc}`,
            `Sisa ${timeLeft(weather.endsAt)}`,
            index < active.length - 1 ? `` : ``
        ])

        return m.reply(card("WEATHER", lines, { emoji: "☁️" }))
    }
}
