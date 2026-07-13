import fs from "fs"
import path from "path"

export default {
    command: ["listcommand", "listcmd"],

    owner: true,

    category: "Owner",

    description: "List Command",

    async run({ m }) {
        const root = "./command"

        if (!fs.existsSync(root)) return m.reply("Folder command tidak ditemukan.")

        let text = `╭━━━〔 📂 COMMAND LIST 〕━━━⬣

`

        let totalFolder = 0

        let totalCommand = 0

        const folders = fs.readdirSync(root)

        for (const dir of folders) {
            const folder = path.join(
                root,

                dir
            )

            if (
                !fs
                    .statSync(folder)

                    .isDirectory()
            )
                continue

            const files = fs
                .readdirSync(folder)

                .filter((file) => file.endsWith(".js"))

            totalFolder++

            totalCommand += files.length

            text += `📁 ${dir} (${files.length})

`

            for (const file of files)
                text += `• ${file.replace(".js", "")}
`

            text += "\n"
        }

        text += `━━━━━━━━━━━━━━━━━━

📦 Total Folder : ${totalFolder}
📄 Total Command : ${totalCommand}

╰━━━━━━━━━━━━━━━━━━⬣`

        return m.reply(text)
    }
}
