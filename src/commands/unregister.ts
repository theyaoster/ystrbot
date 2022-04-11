import { SlashCommandBuilder } from "@discordjs/builders"
import { Client, CommandInteraction } from "discord.js"
import { commandFromTextChannel } from "../lib/discord-utils"
import { unregisterPlayer } from "../lib/firestore"

export const data = new SlashCommandBuilder()
    .setName("unregister")
    .setDescription("Unregister yourself so you no longer share your status.")

export async function execute(interaction: CommandInteraction, client: Client) {
    if (!commandFromTextChannel(interaction, client)) {
        return
    }

    const name = interaction.user.username
    unregisterPlayer(name).then(_ => {
        interaction.reply({
            content: `You've been unregistered. You can always register with /register again.`,
            ephemeral: true
        })
    }).catch(reason => interaction.reply({
        content: `Failed to unregister due to: ${reason}`,
        ephemeral: true
    }))
}