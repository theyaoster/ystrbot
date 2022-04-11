import { SlashCommandBuilder } from "@discordjs/builders"
import { Client, CommandInteraction, GuildMember, ThreadChannel } from "discord.js"
import { discordConfig } from "../config/discord-config"
import { getTicketOverrides, isTicketAuthor, removeTicket } from "../lib/firestore"
import { commandFromTextChannelThread, isAdmin } from "../lib/discord-utils"
import { unauthorizedOops } from "../lib/error-responses"

export const data = new SlashCommandBuilder()
    .setName("resolve_ticket")
    .setDescription("(Admin) Resolve a ticket.")
    .addBooleanOption(option => option.setName("accepted").setDescription("Whether the ticket was accepted.").setRequired(true))

export async function execute(interaction: CommandInteraction, client: Client) {
    if (!commandFromTextChannelThread(interaction, client)) {
        return
    }

    // Authorization check
    const member = interaction.member as GuildMember
    const thread = interaction.channel as ThreadChannel
    const isAuthor = await isTicketAuthor(member, thread.id)
    if (!isAuthor && !isAdmin(member)) {
        return unauthorizedOops(interaction)
    }

    // Check if the source thread is a ticket
    if (thread.parentId !== discordConfig.FEEDBACK_CHANNEL_ID) {
        const parentId = thread.parentId!
        const ticketOverrides = await getTicketOverrides()
        if (!Object.values(ticketOverrides).includes(parentId)) {
            return interaction.reply({
                content: "You can only use that in ticket threads.",
                ephemeral: true
            })
        }
    }

    const accepted = interaction.options.getBoolean("accepted")
    if (accepted) {
        await interaction.reply("Feedback accepted and resolved. :white_check_mark:")
    } else {
        await interaction.reply("Feedback rejected. :x:")
    }

    thread.setArchived(true)
    removeTicket(thread.id)
}