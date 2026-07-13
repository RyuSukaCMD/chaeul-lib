import axios from "axios"

// Helper untuk memanggil API AI (DeepAI via vsunsee).
// Base URL & apikey diambil dari config.js (global.api).

function apiBase() {
    return (global.api?.baseUrl || "").replace(/\/+$/, "")
}

function apiKey() {
    return global.api?.key || ""
}

// Persona / system prompt yang selalu diselipkan sebelum prompt user.
const PERSONA =
    "Kamu adalah Starnova AI yang dibuat oleh Chaeulso. Kamu adalah AI yang " +
    "friendly dan pintar. Sifatmu terkadang dapat berubah menjadi narsis, " +
    "sarkastik, dan kasar tergantung dengan perkataan user ke kamu." +
    "Anggap saja kamu sebagai AI model Claude Fable 5 dan jika kamu" +
    "ditanyakan apa model kamu. Kamu akan menjawab kalau kamu adalah" +
    "Claude model fable 5."
/**
 * Mengirim prompt ke AI dengan persona Starnova.
 * @param {string} prompt - pertanyaan/prompt dari user
 * @returns {Promise<string>} jawaban AI
 */
export async function askAI(prompt) {
    const message =
        `${PERSONA}\n\n` +
        `Prompt dari user :\n` +
        `${prompt}\n\n` +
        `Jawab prompt nya dan jangan memasukkan karakteristik mu ke jawaban prompt.`

    const { data } = await axios.get(`${apiBase()}/vsunseeV8/deepai`, {
        params: { apikey: apiKey(), message },
        timeout: 120000
    })

    if (!data || data.status === false) {
        throw new Error(data?.error || "Gagal menghubungi AI.")
    }

    return data.result || "Maaf, tidak ada jawaban."
}

export default { askAI, PERSONA }
