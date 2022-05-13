import { SlashCommandBuilder } from "@discordjs/builders"
import { Client, CommandInteraction } from "discord.js"
import { commandFromTextChannel } from "../lib/discord-utils"
import { getEndpoint, registerPlayer } from "../lib/firestore"

const YSTR_REPO = "https://github.com/theyaoster/valorant-ystr/releases/latest"

export const data = new SlashCommandBuilder()
    .setName("register")
    .setDescription("Register yourself to get an API key for sharing your status.")

export async function execute(interaction: CommandInteraction, client: Client) {
    if (!commandFromTextChannel(interaction, client)) {
        return
    }

    const name = interaction.user.username
    const endpoint = await getEndpoint()
    registerPlayer(name, interaction.user.id).then(token => {
        interaction.reply({
            content: `Here are your credentials:\n\nName: ${name}\nPassword: ${token}\nEndpoint: ${endpoint}\n\nTo complete setup, download the client .exe at ${YSTR_REPO} and it run it.\n  • From now on, you can just run this .exe and it'll launch your game for you!\n  • You can also exit to desktop through the game and this .exe will automatically terminate.`,
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