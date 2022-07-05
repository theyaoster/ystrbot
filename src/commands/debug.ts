import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client, GuildMember } from "discord.js"
import { unauthorizedOops } from "../lib/util/error-responses"
import { commandFromTextChannel, isAdmin } from "../lib/util/discord-utils"
import { debugOn, toggleDebug } from "../lib/trackers/debug-tracker"

export const data = new SlashCommandBuilder()
    .setName("debug")
    .setDescription("toggle debug mode (ADMIN)")
    .addUserOption(option => option.setName("member").setDescription("member to set debug state of").setRequired(false))

export async function execute(interaction: CommandInteraction, _: Client) {
    if (!commandFromTextChannel(interaction)) return
    if (!(await isAdmin(interaction.member as GuildMember))) return unauthorizedOops(interaction) // Auth check

    const memberParam = interaction.options.getMember("member")
    await toggleDebug(memberParam ? memberParam as GuildMember : interaction.member as GuildMember)

    const message = `Debug mode is now ${debugOn(interaction.member as GuildMember) ? "on" : "off"}.`
    interaction.reply({ content: message, ephemeral: true })
    console.info(message)
}