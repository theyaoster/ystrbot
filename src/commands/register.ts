import { SlashCommandBuilder } from "@discordjs/builders"
import { Client, CommandInteraction } from "discord.js"
import { commandFromTextChannel } from "../lib/discord-utils"
import { registerPlayer } from "../lib/firestore"

export const data = new SlashCommandBuilder()
    .setName("register")
    .setDescription("Register yourself to get an API key for sharing your status.")

export async function execute(interaction: CommandInteraction, client: Client) {
    if (!commandFromTextChannel(interaction, client)) {
        return
    }

    const name = interaction.user.username
    registerPlayer(name).then(token => {
        interaction.reply({
            content: `Here are your credentials. :key: Be sure to note this down as you won't see it again:\n\nName: "${name}"\nPassword: "${token}"`,
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