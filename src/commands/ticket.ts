import { SlashCommandBuilder } from "@discordjs/builders"
import { Client, CommandInteraction, GuildMember, TextChannel } from "discord.js"
import { commandFromTextChannel } from "../lib/util/discord-utils"
import { getTicketOverrides, trackTicket } from "../lib/firestore"
import { getConfig } from "../config/discord-config"

export const data = new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("submit feedback, bug reports, feature suggestions, etc")
    .addStringOption(option => option.setName("description").setDescription("enter ticket content here").setRequired(true))

export async function execute(interaction: CommandInteraction, client: Client) {
    if (!commandFromTextChannel(interaction)) return

    const ticketOverrides = await getTicketOverrides()
    const member = interaction.member as GuildMember
    const channelId = member.id in ticketOverrides ? ticketOverrides[member.id] : getConfig(member).FEEDBACK_CHANNEL_ID
    const feedbackChannel = client.channels.cache.get(channelId) as TextChannel

    // Create a new thread for the ticket
    // Can only create private threads at server level 2+
    const thread = await feedbackChannel.threads.create({
        name: `ticket-${Date.now()}`,
        reason: `Ticket submitted at ${Date.now()}`,
        // type: 'GUILD_PRIVATE_THREAD',
    })

    await thread.members.add(member)
    await thread.setLocked(true) // So only mods can unarchive

    trackTicket(interaction.member as GuildMember, thread.id)

    const problemDescription = interaction.options.getString("description", true)
    thread.send(`Submission details:\n**User**: ${interaction.user.username}\n**Description**: ${problemDescription}`)

    interaction.reply({ content: `Ticket received, thanks. See ${feedbackChannel} for your ticket thread.`, ephemeral: true })
}