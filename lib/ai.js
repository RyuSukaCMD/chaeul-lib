import axios from "axios"
import { hasStarnova, snGet } from "./starnova.js"

// ═══════════════════════════════════════════════════════════
//  STARNOVA AI — multi-provider dengan fallback + memori chat.
//  Provider (urut prioritas):
//   1. StarNova API     (global.api, /api/v1/ai/chat)          — UTAMA
//   2. pollinations.ai  (POST, dukung system prompt + riwayat) — fallback
//   3. davidcyriltech   (gpt3)                                  — fallback
//  Bila satu gagal, otomatis coba berikutnya.
//  Gambar AI juga lewat StarNova (/api/v1/ai/image) → pollinations.
// ═══════════════════════════════════════════════════════════

const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

// Persona / system prompt Starnova.
export const PERSONA =
    "Kamu adalah Starnova AI, asisten AI cerdas & ramah yang dibuat oleh Chaeulso. " +
    "Jawab dengan bahasa yang sama dengan user (biasanya Indonesia santai). " +
    "Kamu boleh sedikit narsis, sarkastik, atau jahil tergantung nada user, " +
    "tapi tetap membantu. Jawaban ringkas & jelas, pakai emoji seperlunya. " +
    "Jika ditanya model AI-mu, jawab bahwa kamu adalah 'Claude Fable 5'. " +
    "Jangan menyebut penyedia teknis di balik layar."

// ─── Memori percakapan per-user (di memori, dibatasi) ───
const histories = new Map() // jid -> [{role, content}]
const MAX_TURNS = 12 // simpan 12 pesan terakhir (6 tanya-jawab)

function norm(jid = "") {
    return String(jid).replace(/[^0-9]/g, "")
}

export function getHistory(jid) {
    return histories.get(norm(jid)) || []
}
export function resetHistory(jid) {
    histories.delete(norm(jid))
}
function pushHistory(jid, role, content) {
    const key = norm(jid)
    const arr = histories.get(key) || []
    arr.push({ role, content })
    while (arr.length > MAX_TURNS) arr.shift()
    histories.set(key, arr)
}

// ─── Provider 1: pollinations (dengan riwayat) ───
async function viaPollinations(messages) {
    const { data } = await axios.post(
        "https://text.pollinations.ai/",
        { messages, model: "openai", private: true },
        {
            timeout: 60000,
            headers: { "Content-Type": "application/json", "User-Agent": UA }
        }
    )
    const text = typeof data === "string" ? data : data?.choices?.[0]?.message?.content
    if (!text || !text.trim()) throw new Error("kosong")
    return text.trim()
}

// ─── Provider 2: davidcyriltech gpt3 (stateless) ───
async function viaDavid(prompt) {
    const { data } = await axios.get(
        `https://apis.davidcyriltech.my.id/ai/gpt3?text=${encodeURIComponent(prompt)}`,
        { timeout: 45000, headers: { "User-Agent": UA } }
    )
    if (!data?.success || !data?.message) throw new Error("gagal")
    return String(data.message).trim()
}

// ─── Provider: StarNova API /api/v1/ai/chat (stateless; persona diikutkan di prompt) ───
async function viaStarnova(prompt) {
    if (!hasStarnova()) throw new Error("no starnova")
    const r = await snGet("/api/v1/ai/chat", { text: prompt }, { timeout: 60000 })
    const out = typeof r === "string" ? r : r?.answer
    if (!out || !String(out).trim()) throw new Error("kosong")
    return String(out).trim()
}

/**
 * Kirim prompt ke AI dengan persona + memori percakapan.
 * @param {string} prompt
 * @param {object} [opt]
 * @param {string} [opt.jid]     - untuk memori percakapan (opsional)
 * @param {boolean}[opt.memory=true]
 * @returns {Promise<string>}
 */
export async function askAI(prompt, opt = {}) {
    const useMemory = opt.memory !== false && opt.jid
    const history = useMemory ? getHistory(opt.jid) : []

    const messages = [
        { role: "system", content: PERSONA },
        ...history,
        { role: "user", content: prompt }
    ]

    // Prompt gabungan untuk provider stateless (fallback).
    const flat =
        `${PERSONA}\n\n` +
        history.map((h) => `${h.role === "user" ? "User" : "AI"}: ${h.content}`).join("\n") +
        `\nUser: ${prompt}\nAI:`

    let answer = null
    const errors = []
    for (const attempt of [
        () => viaStarnova(flat), // UTAMA: API milik owner (StarNova)
        () => viaPollinations(messages),
        () => viaDavid(flat)
    ]) {
        try {
            answer = await attempt()
            if (answer) break
        } catch (e) {
            errors.push(e.message)
        }
    }

    if (!answer) throw new Error("Semua penyedia AI sedang sibuk. Coba lagi sebentar ya.")

    if (useMemory) {
        pushHistory(opt.jid, "user", prompt)
        pushHistory(opt.jid, "assistant", answer)
    }
    return answer
}

/**
 * Generate gambar AI (pollinations). Mengembalikan { url }.
 * @param {string} prompt
 * @param {object} [opt] { width, height }
 */
export function imageURL(prompt, opt = {}) {
    const w = opt.width || 1024
    const h = opt.height || 1024
    const seed = Math.floor(Math.random() * 1e9)
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(
        prompt
    )}?width=${w}&height=${h}&seed=${seed}&nologo=true`
}

/**
 * Ambil URL gambar AI — UTAMA lewat StarNova (/api/v1/ai/image),
 * fallback ke pollinations langsung. Return string URL.
 */
export async function imageURLResolved(prompt, opt = {}) {
    const w = opt.width || 1024
    const h = opt.height || 1024
    const ratio = w === h ? "1:1" : w > h ? "16:9" : "9:16"
    if (hasStarnova()) {
        try {
            const r = await snGet("/api/v1/ai/image", { prompt, ratio }, { timeout: 60000 })
            const url = typeof r === "string" ? r : r?.url
            if (url) return url
        } catch {}
    }
    return imageURL(prompt, opt)
}

export default { PERSONA, askAI, imageURL, imageURLResolved, getHistory, resetHistory }
