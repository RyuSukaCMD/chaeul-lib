import Button from "./button.js"
import { isGroupRegistered } from "./groupmanage.js"

export default function startWelcome(sock) {
    sock.ev.on(
        "group-participants.update",

        async (data) => {
            try {
                // Welcome hanya untuk grup yang sudah terdaftar
                if (!isGroupRegistered(data.id)) return

                const meta = await sock.groupMetadata(data.id)

                for (const participant of data.participants) {
                    const jid = participant.phoneNumber

                    if (!jid) continue

                    const number = jid.split("@")[0]

                    const image = "./media/menu.jpg"

                    if (data.action === "add") {
                        await Button.menu({
                            sock,

                            m: {
                                chat: data.id,

                                sender: jid
                            },

                            image,

                            body: `╭────────────────────────
│ Welcome
╰────────────────────────

Halo @${number}

Selamat datang di
*${meta.subject}*.

Klik button di bawah
untuk claim hosting gratis!

────────────────────────`,

                            footer: "Nexhost Department",

                            buttons: [
                                {
                                    type: "url",

                                    text: "Website",

                                    url: "https://portal.nexhostku.com"
                                }
                            ]
                        })
                    } else if (data.action === "remove") {
                        await Button.menu({
                            sock,

                            m: {
                                chat: data.id,

                                sender: jid
                            },

                            image,

                            body: `╭────────────────────────
│ Goodbye
╰────────────────────────

Selamat tinggal
@${number}

Semoga sukses
di mana pun berada.

────────────────────────`,

                            footer: "Nexhost Department",

                            buttons: [
                                {
                                    type: "url",

                                    text: "Website",

                                    url: "https://portal.nexhostku.com"
                                }
                            ]
                        })
                    }
                }
            } catch (e) {
                console.error(
                    "[WELCOME]",

                    e
                )
            }
        }
    )
}
