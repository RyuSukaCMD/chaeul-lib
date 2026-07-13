export default {
    command: ["autotyping"],

    category: "Owner",

    description: "Toggle Auto Typing",

    owner: true,

    async run({ m }) {
        global.settings.autotyping = !global.settings.autotyping

        if (global.settings.autotyping) global.settings.autovoice = false

        m.reply(`Auto Typing: ${global.settings.autotyping ? "ON ✅" : "OFF ❌"}`)
    }
}
