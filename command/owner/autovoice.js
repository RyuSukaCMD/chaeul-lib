export default {
    command: ["autovoice"],

    category: "Owner",

    description: "Toggle Auto Recording",

    owner: true,

    async run({ m }) {
        global.settings.autovoice = !global.settings.autovoice

        if (global.settings.autovoice) global.settings.autotyping = false

        m.reply(`Auto Voice: ${global.settings.autovoice ? "ON ✅" : "OFF ❌"}`)
    }
}
