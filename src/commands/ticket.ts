import { SlashCommandBuilder } from "@discordjs/builders"
import { Client, CommandInteraction, TextChannel } from "discord.js"
import { discordConfig } from "../config/discord-config"
import { genericOops } from "./error-responses"
import { commandFromTextChannel } from "../lib/utils"

export const data = new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Submit a feedback/suggestion request.")
    .addStringOption(option => option.setName("description").setDescription("Enter ticket content here.").setRequired(true))
 
export async function execute(interaction: CommandInteraction, client: Client) {
    if (!commandFromTextChannel(interaction, client)) {
        return
    }
    
    const feedbackChannel = client.channels.cache.get(discordConfig.FEEDBACK_CHANNEL_ID)!
    if (!feedbackChannel) {
        console.error("Failed to find channel using FEEDBACK_CHANNEL_ID.")
        return genericOops(interaction)
    } else {
        // Create a new thread for the ticket
        // Can only create private threads at server level 2+
        const thread = await (feedbackChannel as TextChannel).threads.create({
            name: `ticket-${Date.now()}`,
            reason: `Ticket submitted at ${Date.now()}`,
            // type: 'GUILD_PRIVATE_THREAD',
        })

        await thread.members.add(interaction.user)
        await thread.setLocked(true) // So only mods can unarchive
    
        const problemDescription = interaction.options.getString("description")!
        thread.send(`Submission details:\n**User**: ${interaction.user.username}\n**Description**: ${problemDescription}`)
    
        interaction.reply({
            content: `Ticket received, thanks. See ${feedbackChannel} for your ticket thread.`,
            ephemeral: true
        })
    }
}