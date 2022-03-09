import { SlashCommandBuilder } from "@discordjs/builders"
import { Client, CommandInteraction, GuildMember, ThreadChannel } from "discord.js"
import { commandFromTextChannelThread, isAdmin } from "../lib/utils"
import { unauthorizedOops } from "./error-responses"

export const data = new SlashCommandBuilder()
    .setName("resolve_ticket")
    .setDescription("(Admin) Resolve a feedback/suggestion request.")
    .addBooleanOption(option => option.setName("accepted").setDescription("Whether the feedback was accepted.").setRequired(true))
 
export async function execute(interaction: CommandInteraction, client: Client) {
    // Authorization check
    if (!isAdmin(interaction.member as GuildMember)) {
        return unauthorizedOops(interaction)
    }
    
    if (!commandFromTextChannelThread(interaction, client)) {
        return
    }
    
    const thread = interaction.channel as ThreadChannel
    const accepted = interaction.options.getBoolean("accepted")
    if (accepted) {
        await interaction.reply("Feedback accepted and resolved. :white_check_mark:")
    } else {
        await interaction.reply("Feedback rejected. :x:")
    }

    thread.setArchived(true)
}