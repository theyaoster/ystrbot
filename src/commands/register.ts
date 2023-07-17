import { SlashCommandBuilder } from "@discordjs/builders"
import { ChatInputCommandInteraction, Client } from "discord.js"
import { getEndpoint } from "../lib/firestore/configuration"
import { registerPlayer } from "../lib/firestore/game_data"
import { getLatestExeLink } from "../lib/repo-info"
import { commandFromTextChannel } from "../lib/util/discord-utils"

export const data = new SlashCommandBuilder()
    .setName("register")
    .setDescription("register an account for using ystrbot and VALORANT-ystr functionality")

export async function execute(interaction: ChatInputCommandInteraction, _: Client) {
    if (!commandFromTextChannel(interaction)) return

    const name = interaction.user.username
    registerPlayer(name, interaction.user.id).then(async token => {
        interaction.reply({
            content: `Here are your credentials:\n\nName: ${name}\nPassword: ${token}\nEndpoint: \`${await getEndpoint()}\`\n\nTo complete setup, download ${await getLatestExeLink()} and run it.\n  • From now on, you can just run this .exe and it'll launch your game for you.\n  • You can also exit to desktop through the game and this .exe will automatically terminate.`,
            ephemeral: true
        })
    }).catch(reason => {
        console.error(reason.stack)

        interaction.reply({ content: `Failed to register due to: ${reason}`, ephemeral: true})
    })
}