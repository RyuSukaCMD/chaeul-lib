import Button from "../../lib/button.js"

export default {
    command: ["script"],

    category: "Main",

    description: "Script Information",

    async run({ sock, m }) {
        await Button.menu({
            sock,

            m,

            image: "./media/menu.jpg",

            body: `『 📦 *Chaeul SCRIPT* 』

Terima kasih atas ketertarikanmu pada script *Chaeul* ❤️

Saat ini script masih dalam tahap *Development* dan terus dikembangkan agar lebih stabil, lengkap, dan nyaman digunakan.

Sementara waktu, kamu tetap bisa menikmati seluruh fitur yang tersedia langsung melalui bot ini.

Terima kasih atas dukungan dan pengertiannya! 🚀`,

            footer: "© Chaeul",

            buttons: [
                {
                    type: "quick",

                    text: "🏠 Back to Menu",

                    id: ".menu"
                }
            ]
        })
    }
}
