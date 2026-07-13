export default {
    name: "Public",

    command: ["public"],

    category: "Owner",

    description: "Enable public mode",

    owner: true,

    async run({ m }) {
        if (global.settings.public) return m.reply("Already in public mode.")

        global.settings.public = true

        m.reply("✅ Public mode enabled.")
    }
}
