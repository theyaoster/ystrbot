import { SlashCommandBuilder } from "@discordjs/builders"
import { ChatInputCommandInteraction, Client, GuildMember, ThreadChannel } from "discord.js"
import { getConfig } from "../config/discord-config"
import { isTicketAuthor, removeTicket } from "../lib/firestore/admin"
import { getTicketOverrides } from "../lib/firestore/configuration"
import { commandFromTextChannelThread, isAdmin } from "../lib/util/discord-utils"
import { unauthorizedOops } from "../lib/util/error-responses"

export const data = new SlashCommandBuilder()
    .setName("resolve_ticket")
    .setDescription("resolve a ticket you created (ADMIN)")
    .addBooleanOption(option => option.setName("accepted").setDescription("Whether the ticket was accepted.").setRequired(true))

export async function execute(interaction: ChatInputCommandInteraction, _: Client) {
    if (!commandFromTextChannelThread(interaction)) return

    // Authorization check
    const member = interaction.member as GuildMember
    const thread = interaction.channel as ThreadChannel
    const isAuthor = await isTicketAuthor(member, thread.id)
    if (!isAuthor && !(await isAdmin(member))) {
        return unauthorizedOops(interaction)
    }

    // Check if the source thread is a ticket
    if (thread.parentId !== getConfig().FEEDBACK_CHANNEL_ID) {
        const parentId = thread.parentId!
        const ticketOverrides = await getTicketOverrides()
        if (!Object.values(ticketOverrides).includes(parentId)) {
            return interaction.reply({
                content: "You can only use that in ticket threads.",
                ephemeral: true
            })
        }
    }

    const accepted = interaction.options.getBoolean("accepted", true)
    if (accepted) {
        await interaction.reply("Feedback accepted and resolved. :white_check_mark:")
    } else {
        await interaction.reply("Feedback rejected. :x:")
    }

    thread.setArchived(true)
    removeTicket(thread.id)
}