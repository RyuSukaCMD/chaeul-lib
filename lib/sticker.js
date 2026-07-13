import sharp from "sharp"
import webp from "node-webpmux"
import fs from "fs"
import os from "os"
import path from "path"
import { randomUUID } from "crypto"
import ffmpeg from "fluent-ffmpeg"

const tmp = (ext) => path.join(os.tmpdir(), `${randomUUID()}.${ext}`)

const defaultExif = () => ({
    packname: global.sticker?.packname || global.packname,

    author: global.sticker?.author || global.author,

    categories: global.sticker?.categories || ["🤖"]
})

const Sticker = {}

Sticker.image = async (buffer) => {
    return await sharp(buffer)
        .resize(512, 512, {
            fit: "contain",

            background: {
                r: 0,
                g: 0,
                b: 0,
                alpha: 0
            }
        })

        .webp({
            quality: 90
        })

        .toBuffer()
}

Sticker.writeExif = async (buffer, metadata = {}) => {
    metadata = {
        ...defaultExif(),
        ...metadata
    }

    const input = tmp("webp")
    const output = tmp("webp")

    fs.writeFileSync(input, buffer)

    const img = new webp.Image()

    const json = {
        "sticker-pack-id": global.botname || "Chaeul",
        "sticker-pack-name": metadata.packname,
        "sticker-pack-publisher": metadata.author,
        emojis: metadata.categories
    }

    const exifAttr = Buffer.from([
        0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ])

    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8")

    const exif = Buffer.concat([exifAttr, jsonBuff])

    exif.writeUIntLE(jsonBuff.length, 14, 4)

    await img.load(input)

    img.exif = exif

    await img.save(output)

    fs.unlinkSync(input)

    const result = fs.readFileSync(output)

    fs.unlinkSync(output)

    return result
}

Sticker.fromImage = async (buffer, metadata = {}) => {
    const webp = await Sticker.image(buffer)

    return await Sticker.writeExif(webp, metadata)
}

Sticker.video = async (buffer) => {
    const input = tmp("mp4")
    const output = tmp("webp")

    fs.writeFileSync(input, buffer)

    await new Promise((resolve, reject) => {
        ffmpeg(input)
            .outputOptions([
                "-vcodec",
                "libwebp",

                "-vf",
                "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=0x00000000",

                "-loop",
                "0",

                "-ss",
                "00:00:00",

                "-t",
                "10",

                "-preset",
                "default",

                "-an",

                "-vsync",
                "0"
            ])

            .save(output)

            .on("end", resolve)

            .on("error", reject)
    })

    const webp = fs.readFileSync(output)

    fs.unlinkSync(input)
    fs.unlinkSync(output)

    return webp
}

Sticker.fromVideo = async (buffer, metadata = {}) => {
    const webp = await Sticker.video(buffer)

    return await Sticker.writeExif(webp, metadata)
}

Sticker.create = async (buffer, options = {}) => {
    const { type = "image", ...metadata } = options

    switch (type.toLowerCase()) {
        case "image":
            return await Sticker.fromImage(buffer, metadata)

        case "video":
            return await Sticker.fromVideo(buffer, metadata)

        case "webp":
            return await Sticker.writeExif(buffer, metadata)

        default:
            throw new Error(`Unknown sticker type: ${type}`)
    }
}

// ─── Konversi balik: sticker (webp) → gambar / video ───

/** Cek apakah buffer webp beranimasi (punya chunk ANIM). */
Sticker.isAnimatedWebp = (buffer) => {
    try {
        // Cari signature "ANIM" pada header webp
        return buffer.includes(Buffer.from("ANIM"))
    } catch {
        return false
    }
}

/** Sticker webp statis → PNG buffer. */
Sticker.toImage = async (buffer) => {
    return await sharp(buffer).png().toBuffer()
}

/**
 * Sticker webp animasi → GIF buffer.
 * Memakai sharp (libwebp) yang mendukung decode webp beranimasi,
 * karena decoder webp bawaan ffmpeg TIDAK bisa membaca animasi.
 */
Sticker.toGif = async (buffer) => {
    return await sharp(buffer, { animated: true }).gif().toBuffer()
}

/**
 * Sticker webp animasi → MP4 (video) buffer.
 * Alur: webp animasi --(sharp)--> GIF --(ffmpeg)--> MP4.
 * (ffmpeg tidak bisa membaca animated webp langsung → exit code 69.)
 */
Sticker.toVideo = async (buffer) => {
    // 1) Decode animated webp menjadi GIF via sharp
    const gifBuffer = await Sticker.toGif(buffer)

    const input = tmp("gif")
    const output = tmp("mp4")

    fs.writeFileSync(input, gifBuffer)

    // 2) GIF → MP4 via ffmpeg (konversi yang andal)
    await new Promise((resolve, reject) => {
        ffmpeg(input)
            .inputFormat("gif")

            .outputOptions([
                "-movflags",
                "faststart",

                "-pix_fmt",
                "yuv420p",

                // Pastikan dimensi genap agar kompatibel dengan encoder H.264
                "-vf",
                "scale=trunc(iw/2)*2:trunc(ih/2)*2",

                "-c:v",
                "libx264"
            ])

            .toFormat("mp4")

            .save(output)

            .on("end", resolve)

            .on("error", reject)
    })

    const result = fs.readFileSync(output)

    fs.unlinkSync(input)
    fs.unlinkSync(output)

    return result
}

Sticker.isImage = (mimetype) => mimetype?.startsWith("image/")
Sticker.isVideo = (mimetype) => mimetype?.startsWith("video/")
Sticker.isWebp = (mimetype) => mimetype === "image/webp"

Sticker.from = async (buffer, mimetype, options = {}) => {
    if (Sticker.isImage(mimetype)) {
        return await Sticker.create(buffer, {
            type: "image",
            ...options
        })
    }

    if (Sticker.isVideo(mimetype)) {
        return await Sticker.create(buffer, {
            type: "video",
            ...options
        })
    }

    if (Sticker.isWebp(mimetype)) {
        return await Sticker.create(buffer, {
            type: "webp",
            ...options
        })
    }

    throw new Error("Unsupported media type.")
}

export default Sticker
