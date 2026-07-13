import chokidar from "chokidar"
import path from "path"
import Logger from "./logger.js"
import Loader from "./loader.js"

const blacklistFolder = [
    "node_modules/",
    "session/",
    "database/",
    "tmp/",
    ".git/",
    ".cache/",
    "dist/",
    "build/",
    "media/"
]

const blacklistExt = [
    ".zip",
    ".log",
    ".mp4",
    ".mp3",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".db",
    ".sqlite",
    ".json",

    ".lock"
]

export default function Watcher() {
    Logger.info("Watcher Started")

    const watcher = chokidar.watch(".", {
        ignored(file) {
            file = file.replace(/\\/g, "/")

            if (blacklistFolder.some((v) => file.includes(v))) return true

            if (blacklistExt.some((v) => file.endsWith(v))) return true

            return false
        },

        ignoreInitial: true,

        persistent: true,

        usePolling: true,

        interval: 300
    })

    watcher.on("ready", () => {
        Logger.success("Watcher Ready")
    })

    watcher.on("all", async (event, file) => {
        if (!["change", "add", "unlink"].includes(event)) return

        file = path.relative(process.cwd(), file).replace(/\\/g, "/")

        console.log()

        Logger.info(`🔄 ${file}`)

        try {
            if (file.startsWith("command/")) {
                if (event === "unlink") {
                    await Loader.load()

                    Logger.success("Command Removed")
                } else {
                    const ok = await Loader.reload(file)

                    if (ok) Logger.success("Command Reloaded")
                    else Logger.error("Reload Failed")
                }

                return
            }

            if (file === "config.js") {
                await import(path.resolve(file) + "?update=" + Date.now())

                Logger.success("Config Reloaded")

                return
            }

            if (file.startsWith("lib/")) {
                Logger.warn("Core Module Changed")

                Logger.warn("Restart Required")

                return
            }

            if (file === "index.js" || file === "package.json") {
                Logger.warn("Core File Changed")

                Logger.warn("Restart Required")

                return
            }
        } catch (e) {
            Logger.error(e.message)
        }
    })

    watcher.on("error", (err) => {
        Logger.error(err)
    })
}
