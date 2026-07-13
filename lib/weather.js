import axios from "axios"

// Cuaca realtime via wttr.in (tanpa API key).
// Kota default diambil dari config (global.weatherCity), fallback "Jakarta".

let cache = { at: 0, data: null }

/**
 * Mengambil cuaca realtime { condition, temp, city }.
 * Hasil di-cache 10 menit agar tidak spam API di setiap buka menu.
 */
export async function getWeather() {
    const city = global.weatherCity || "Jakarta"

    // Cache 10 menit
    if (cache.data && Date.now() - cache.at < 600000) return cache.data

    try {
        const { data } = await axios.get(
            `https://wttr.in/${encodeURIComponent(city)}?format=%C|%t&m&lang=id`,
            { timeout: 8000 }
        )

        const [condition, temp] = String(data).trim().split("|")

        const result = {
            condition: (condition || "Cerah").trim(),
            temp: (temp || "").replace("+", "").trim() || "-",
            city
        }

        cache = { at: Date.now(), data: result }
        return result
    } catch {
        // Fallback bila API gagal
        return { condition: "Cerah", temp: "-", city }
    }
}

export default { getWeather }
