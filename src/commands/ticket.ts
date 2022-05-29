import { SlashCommandBuilder } from "@discordjs/builders"
import { Client, CommandInteraction, GuildMember, TextChannel } from "discord.js"
import { discordConfig } from "../config/discord-config"
import { genericOops } from "../lib/error-responses"
import { commandFromTextChannel } from "../lib/discord-utils"
import { getTicketOverrides, trackTicket } from "../lib/firestore"

export const data = new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("submit feedback, bug reports, feature suggestions, etc")
    .addStringOption(option => option.setName("description").setDescription("Enter ticket content here.").setRequired(true))

export async function execute(interaction: CommandInteraction, client: Client) {
    if (!commandFromTextChannel(interaction, client)) {
        return
    }

    const ticketOverrides = await getTicketOverrides()
    const channelId = interaction.user.id in ticketOverrides ? ticketOverrides[interaction.user.id] : discordConfig.FEEDBACK_CHANNEL_ID
    const feedbackChannel = client.channels.cache.get(channelId)
    if (!feedbackChannel) {
        console.error(`Failed to find channel with ID ${channelId}!`)
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

        trackTicket(interaction.member as GuildMember, thread.id)

        const problemDescription = interaction.options.getString("description")!
        thread.send(`Submission details:\n**User**: ${interaction.user.username}\n**Description**: ${problemDescription}`)

        interaction.reply({
            content: `Ticket received, thanks. See ${feedbackChannel} for your ticket thread.`,
            ephemeral: true
        })
    }
}