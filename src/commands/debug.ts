import { SlashCommandBuilder } from "@discordjs/builders"
import { ChatInputCommandInteraction, Client, GuildMember } from "discord.js"
import { debugOn, toggleDebug } from "../lib/trackers/debug-tracker"
import { commandFromTextChannel, isAdmin } from "../lib/util/discord-utils"
import { unauthorizedOops } from "../lib/util/error-responses"

export const data = new SlashCommandBuilder()
    .setName("debug")
    .setDescription("toggle debug mode for yourself or another user (ADMIN)")
    .addUserOption(option => option.setName("member").setDescription("member to set debug state of").setRequired(false))

export async function execute(interaction: ChatInputCommandInteraction, _: Client) {
    if (!commandFromTextChannel(interaction)) return
    if (!(await isAdmin(interaction.member as GuildMember))) return unauthorizedOops(interaction) // Auth check

    const memberParam = interaction.options.getMember("member")
    const member = memberParam ? memberParam as GuildMember : interaction.member as GuildMember
    toggleDebug(member.id)

    interaction.reply({ content: `Debug mode is now ${debugOn(member.id) ? "on" : "off"}.`, ephemeral: true })
}