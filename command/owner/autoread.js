export default {
    command: ["autoread"],

    category: "Owner",

    description: "Toggle Auto Read",

    owner: true,

    async run({ m }) {
        const status = (global.settings.autoread = !global.settings.autoread)

        return m.reply(`*Auto Read* ${status ? "Enabled ✅" : "Disabled ❌"}`)
    }
}
