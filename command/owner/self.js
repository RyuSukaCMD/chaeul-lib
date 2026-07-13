export default {
    name: "Self",

    command: ["self"],

    category: "Owner",

    description: "Enable self mode",

    owner: true,

    async run({ m }) {
        if (!global.settings.public) return m.reply("Already in self mode.")

        global.settings.public = false

        m.reply("✅ Self mode enabled.")
    }
}
