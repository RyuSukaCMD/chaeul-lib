import fs from "fs"
import { proto, prepareWAMessageMedia, generateWAMessageFromContent } from "baileys"

// Penanda kunci (anti-usil) — zero-width agar tak terlihat user.
const LOCK_SEP = "\u200b#lock="

/**
 * Membangun & mengirim interactive message (menu berbutton/pilihan).
 *
 * Opsi header (pilih salah satu):
 *  - product  : { title, price, currency?, thumbnail } → tampilan "price tag" + thumbnail
 *  - location : { name, address }                      → kartu bergaya lokasi/cuaca
 *  - image    : path | { url } | Buffer                → gambar biasa
 *
 * Opsi lain:
 *  - body, footer, sections[], buttons[], mentions[], lock
 */
class Button {
    static async menu({
        sock,
        m,
        body = "",
        footer = "",
        image = null,
        location = null,
        product = null,
        title = "",
        subtitle = "",
        sections = [],
        buttons = [],
        mentions = null,
        lock = null,

        // ─── Opsi tampilan gaya "cloud menu" ───
        // greeting : teks banner di atas kartu (limited_time_offer)
        // listTitle: judul list single_select (default "✦ ʙᴜᴋᴀ ᴍᴇɴᴜ")
        // signup   : sisipkan tombol inapp_signup (true/false)
        // tapTarget: { title, description, url, domain } untuk tap_target
        greeting = "",
        listTitle = "",
        signup = false,
        tapTarget = null
    }) {
        const lockNumber = lock ? String(lock).replace(/[^0-9]/g, "") : ""
        const applyLock = (id) => (lockNumber && id ? `${id}${LOCK_SEP}${lockNumber}` : id)

        // Terapkan lock ke semua row & button ber-id (anti-usil)
        if (lockNumber) {
            sections = sections.map((s) => ({
                ...s,
                rows: (s.rows || []).map((r) => ({ ...r, id: applyLock(r.id) }))
            }))
            buttons = buttons.map((b) => (b.id ? { ...b, id: applyLock(b.id) } : b))
        }

        const mentionedJid = mentions?.length ? mentions : [m.sender]

        // ─── Susun header ───
        const header = await Button.buildHeader({ sock, image, location, product, title, subtitle })

        // ─── Susun native buttons ───
        const nativeButtons = Button.buildNativeButtons({ sections, buttons, listTitle, signup })

        // ─── messageParamsJson (banner greeting, bottom sheet, tap target) ───
        const messageParamsJson = Button.buildMessageParams({
            greeting,
            sections,
            tapTarget
        })

        const interactive = {
            contextInfo: { mentionedJid },
            body: proto.Message.InteractiveMessage.Body.create({ text: body }),
            footer: proto.Message.InteractiveMessage.Footer.create({ text: footer }),
            header: proto.Message.InteractiveMessage.Header.create(header),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: nativeButtons,
                ...(messageParamsJson ? { messageParamsJson } : {})
            })
        }

        const msg = generateWAMessageFromContent(
            m.chat,
            {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: proto.Message.InteractiveMessage.create(interactive)
                    }
                }
            },
            {}
        )

        return await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    }

    /** Membangun objek header sesuai jenis (product / location / image). */
    static async buildHeader({ sock, image, location, product, title, subtitle }) {
        const header = { title, subtitle, hasMediaAttachment: false }

        // Muat media gambar (dipakai image biasa & thumbnail product).
        // Fault-tolerant: bila file/URL gagal dimuat, lewati saja (kirim tanpa
        // gambar) agar command tidak error total.
        let media = null
        const source = image || product?.thumbnail
        if (source) {
            try {
                let imageData
                if (typeof source === "string") {
                    imageData = fs.existsSync(source) ? fs.readFileSync(source) : null
                } else if (source.url) {
                    imageData = { url: source.url }
                } else {
                    imageData = source
                }

                if (imageData) {
                    media = await prepareWAMessageMedia(
                        { image: imageData },
                        { upload: sock.waUploadToServer }
                    )
                }
            } catch {
                media = null // gagal muat gambar → lanjut tanpa gambar
            }
        }

        // Header "price tag" (product) — nama bot tampil sebagai tag harga
        if (product) {
            header.hasMediaAttachment = true
            header.productMessage = {
                product: {
                    productImage: media?.imageMessage || undefined,
                    productId: product.id || "0",
                    title: product.title || "",
                    description: product.description || "",
                    currencyCode: product.currency || "IDR",
                    priceAmount1000: String((product.price ?? 0) * 1000),
                    retailerId: product.title || "",
                    productImageCount: 1
                },
                businessOwnerJid: sock.user?.id
            }
            return header
        }

        // Header kartu lokasi/cuaca (bergaya "cloud menu")
        if (location) {
            // Thumbnail jpeg untuk kartu lokasi (opsional)
            let jpegThumbnail
            try {
                if (location.thumbnail) {
                    jpegThumbnail =
                        typeof location.thumbnail === "string"
                            ? fs.readFileSync(location.thumbnail)
                            : location.thumbnail
                }
            } catch {}

            header.hasMediaAttachment = true
            header.locationMessage = {
                degreesLatitude: 0,
                degreesLongitude: 0,
                name: location.name || "",
                address: location.address || "",
                ...(jpegThumbnail ? { jpegThumbnail } : {}),
                contextInfo: {
                    forwardingScore: 9,
                    isForwarded: true
                }
            }
            return header
        }

        // Header gambar biasa
        if (media) {
            header.hasMediaAttachment = true
            Object.assign(header, media)
        }
        return header
    }

    /** Mengubah sections & buttons menjadi format nativeFlow WhatsApp. */
    static buildNativeButtons({ sections, buttons, listTitle = "", signup = false }) {
        const native = []

        // Penanda gaya "cloud menu": single_select multi + inapp_signup
        if (sections.length) {
            native.push({
                name: "single_select",
                buttonParamsJson: JSON.stringify({ has_multiple_buttons: true })
            })
        }
        if (signup) {
            native.push({ name: "inapp_signup", buttonParamsJson: "{}" })
        }

        // List menu utama
        if (sections.length) {
            native.push({
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                    title: listTitle || "✦ ʙᴜᴋᴀ ᴍᴇɴᴜ",
                    sections,
                    has_multiple_buttons: true
                })
            })
        }

        for (const btn of buttons) {
            switch (btn.type) {
                case "url":
                    native.push({
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: btn.text,
                            url: btn.url,
                            merchant_url: btn.url
                        })
                    })
                    break

                case "quick":
                    native.push({
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                            display_text: btn.text,
                            id: btn.id,
                            disabled: false
                        })
                    })
                    break

                case "copy":
                    native.push({
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: btn.text,
                            copy_code: btn.code
                        })
                    })
                    break

                case "call":
                    native.push({
                        name: "cta_call",
                        buttonParamsJson: JSON.stringify({
                            display_text: btn.text,
                            id: btn.phone
                        })
                    })
                    break
            }
        }

        return native
    }

    /**
     * Membangun messageParamsJson: banner sapaan (limited_time_offer),
     * bottom_sheet (list style), dan tap_target_configuration.
     * Mengembalikan null bila tidak ada yang perlu ditampilkan.
     */
    static buildMessageParams({ greeting = "", sections = [], tapTarget = null }) {
        if (!greeting && !sections.length && !tapTarget) return null

        const params = {}

        if (greeting) {
            params.limited_time_offer = {
                text: greeting,
                url: "",
                copy_code: "",
                expiration_time: null
            }
        }

        if (sections.length) {
            // Divider antar item + judul bottom sheet
            const dividers = sections.map((_, i) => i + 1)
            dividers.push(999)

            params.bottom_sheet = {
                in_thread_buttons_limit: 2,
                divider_indices: dividers,
                list_title: "sɪʟᴀʜᴋᴀɴ ᴘɪʟɪʜ ᴍᴇɴᴜ ʏᴀɴɢ ᴋᴀᴍᴜ ɪɴɢɪɴᴋᴀɴ",
                button_title: "ᴛᴀᴘ ᴅɪsɪɴɪ"
            }
        }

        if (tapTarget) {
            params.tap_target_configuration = {
                title: tapTarget.title || "✦",
                description: tapTarget.description || "",
                canonical_url: tapTarget.url || "",
                domain: tapTarget.domain || "",
                button_index: 0
            }
        }

        return JSON.stringify(params)
    }
}

export default Button
