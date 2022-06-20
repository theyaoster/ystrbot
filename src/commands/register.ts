import { SlashCommandBuilder } from "@discordjs/builders"
import { Client, CommandInteraction } from "discord.js"
import { commandFromTextChannel } from "../lib/util/discord-utils"
import { getEndpoint, registerPlayer } from "../lib/firestore"
import { getLatestExeLink } from "../lib/repo-info"

export const data = new SlashCommandBuilder()
    .setName("register")
    .setDescription("register an account for using ystrbot and VALORANT-ystr functionality")

export async function execute(interaction: CommandInteraction, _: Client) {
    if (!commandFromTextChannel(interaction)) {
        return
    }

    const name = interaction.user.username
    const endpoint = await getEndpoint()
    registerPlayer(name, interaction.user.id).then(async token => {
        const dlLink = await getLatestExeLink()
        interaction.reply({
            content: `Here are your credentials:\n\nName: ${name}\nPassword: ${token}\nEndpoint: \`${endpoint}\`\n\nTo complete setup, download ${dlLink} and run it.\n  • From now on, you can just run this .exe and it'll launch your game for you.\n  • You can also exit to desktop through the game and this .exe will automatically terminate.`,
            ephemeral: true
        })
    }).catch(reason => {
        console.log(reason.stack)
        interaction.reply({
            content: `Failed to register due to: ${reason}`,
            ephemeral: true
        })
    })
}