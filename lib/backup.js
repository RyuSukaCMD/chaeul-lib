import fs from "fs"
import path from "path"
import AdmZip from "adm-zip"
import axios from "axios"
import Logger from "./logger.js"
const blacklist = [
    "node_modules",
    ".git",
    ".npm",
    "session",
    "tmp",
    "backup",
    ".cache",
    "dist",
    "build",
    "media"
]

function formatName() {
    const date = new Date()

    const month = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
    ]

    const hh = String(date.getHours()).padStart(2, "0")

    const mm = String(date.getMinutes()).padStart(2, "0")

    const ss = String(date.getSeconds()).padStart(2, "0")

    const dd = String(date.getDate()).padStart(2, "0")

    const mon = month[date.getMonth()]

    const yy = String(date.getFullYear()).slice(-2)

    return `backup-(${ss}-${mm}-${hh})(${dd}-${mon}-${yy}).zip`
}

function walk(zip, dir, root = "") {
    const files = fs.readdirSync(dir)

    for (const file of files) {
        if (blacklist.includes(file)) continue

        const location = path.join(dir, file)

        const inside = path.join(root, file)

        const stat = fs.statSync(location)

        if (stat.isDirectory()) {
            walk(zip, location, inside)
        } else {
            zip.addLocalFile(location, root)
        }
    }
}

function createArchive() {
    if (!fs.existsSync("./backup")) fs.mkdirSync("./backup")

    const name = formatName()

    const output = path.join("./backup", name)

    const zip = new AdmZip()

    walk(zip, process.cwd())

    zip.writeZip(output)

    return {
        name,

        output,

        size: fs.statSync(output).size
    }
}

function formatSize(size) {
    const mb = size / 1024 / 1024

    return `${mb.toFixed(2)} MB`
}

async function uploadGithub(file) {
    const {
        owner,

        repo,

        token,

        branch
    } = global.backup

    const name = path.basename(file)

    const content = fs.readFileSync(file).toString("base64")

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/backup/${name}`

    await axios.put(
        url,

        {
            message: `Backup ${name}`,

            content,

            branch
        },

        {
            headers: {
                Authorization: `Bearer ${token}`,

                Accept: "application/vnd.github+json"
            }
        }
    )
}

async function cleanLocal(file) {
    if (!global.backup.deleteAfterUpload) return

    if (fs.existsSync(file)) fs.unlinkSync(file)
}

async function removeOldLocal() {
    if (!fs.existsSync("./backup")) return

    const files = fs

        .readdirSync("./backup")

        .filter((v) => v.endsWith(".zip"))

        .sort((a, b) => fs.statSync("./backup/" + b).mtimeMs - fs.statSync("./backup/" + a).mtimeMs)

    const keep = global.backup.keep || 10

    for (const file of files.slice(keep)) {
        fs.unlinkSync("./backup/" + file)
    }
}

async function removeOldGithub() {
    try {
        const {
            owner,

            repo,

            token,

            branch,

            keep
        } = global.backup

        const { data } = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/contents/backup?ref=${branch}`,

            {
                headers: {
                    Authorization: `Bearer ${token}`,

                    Accept: "application/vnd.github+json"
                }
            }
        )

        const files = data

            .filter((v) => v.name.endsWith(".zip"))

            .sort((a, b) => new Date(b.name) - new Date(a.name))

        for (const file of files.slice(keep)) {
            await axios.delete(
                `https://api.github.com/repos/${owner}/${repo}/contents/backup/${file.name}`,

                {
                    headers: {
                        Authorization: `Bearer ${token}`,

                        Accept: "application/vnd.github+json"
                    },

                    data: {
                        message: `Delete ${file.name}`,

                        sha: file.sha,

                        branch
                    }
                }
            )
        }
    } catch {}
}

export default async function Backup() {
    if (!global.backup?.enable) return

    // Lewati bila token belum diisi (mis. saat token dipindah ke env)
    if (!global.backup?.token) {
        Logger.info("Backup dilewati (token belum diatur).")
        return
    }

    try {
        console.log()

        Logger.info("Creating Backup...")

        const backup = createArchive()

        console.log("📦 Compress :", formatSize(backup.size))

        Logger.info("Uploading Backup...")

        await uploadGithub(backup.output)

        await removeOldLocal()

        await removeOldGithub()

        await cleanLocal(backup.output)

        console.log()

        Logger.success("Backup Uploaded")

        console.log("├ Archive :", backup.name)

        console.log("├ Size    :", formatSize(backup.size))

        console.log("└ Upload  : GitHub")

        console.log()
    } catch (e) {
        console.log()

        console.log("❌ Backup Failed")

        console.log(e)

        console.log()
    }
}
