import chalk from "chalk"

const time = () =>
    new Date().toLocaleTimeString("id-ID", {
        hour12: false
    })

function render({ icon = "•", title = "", lines = [] }) {
    console.log()

    console.log(chalk.gray(time()), icon, chalk.bold.white(title.toUpperCase()))

    if (lines.length) console.log(chalk.gray("│"))

    lines.forEach((line, i) => {
        const prefix = i === lines.length - 1 ? "└" : "├"

        console.log(chalk.gray(prefix), chalk.white(line))
    })
}

const Logger = {
    info(...text) {
        render({
            icon: chalk.cyan("ℹ"),
            title: "Info",
            lines: [text.join(" ")]
        })
    },

    success(...text) {
        render({
            icon: chalk.green("✅"),
            title: "Success",
            lines: [text.join(" ")]
        })
    },

    warn(...text) {
        render({
            icon: chalk.yellow("⚠"),
            title: "Warning",
            lines: [text.join(" ")]
        })
    },

    error(...text) {
        render({
            icon: chalk.red("❌"),
            title: "Error",
            lines: [text.join(" ")]
        })
    },

    watch(file = "Watcher Ready") {
        render({
            icon: "👀",
            title: "Watcher",
            lines: [file]
        })
    },

    reload(file) {
        render({
            icon: "🔄",
            title: "Reload",
            lines: [`File     ${file}`, "Status   Success"]
        })
    },

    restart(file) {
        render({
            icon: "⚠",
            title: "Restart",
            lines: [`File     ${file}`, "Restart Required"]
        })
    },

    connect() {
        render({
            icon: "🌐",
            title: "WhatsApp",
            lines: ["Connected"]
        })
    },

    disconnect(reason = "Disconnected") {
        render({
            icon: "📴",
            title: "WhatsApp",
            lines: [reason]
        })
    },

    chat(m) {
        const text = m.body || m.text || "-"

        const lines = []

        if (m.isGroup) lines.push(`Group    ${m.groupName || "-"}`)

        lines.push(`Name     ${m.pushName || "-"}`)

        lines.push(`Number   ${m.senderNumber || "-"}`)

        lines.push(text)

        render({
            icon: m.isGroup ? "👥" : "💬",

            title: m.isGroup ? "Group" : "Private",

            lines
        })
    },

    command(m, command, runtime = 0) {
        let runtimeColor = chalk.green

        if (runtime >= 100) runtimeColor = chalk.yellow

        if (runtime >= 500) runtimeColor = chalk.red

        render({
            icon: "⚡",

            title: "Command",

            lines: [
                `Name     ${m.pushName}`,

                `Number   ${m.senderNumber}`,

                `Command  ${command}`,

                `Runtime  ${runtimeColor(runtime + " ms")}`,

                "Status   Success"
            ]
        })
    },

    call({ name = "-", number = "-", type = "Voice" }) {
        render({
            icon: "📞",

            title: "Incoming Call",

            lines: [`Type     ${type}`, `Name     ${name}`, `Number   ${number}`]
        })
    }
}

export default Logger
