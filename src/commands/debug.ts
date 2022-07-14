import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client, GuildMember } from "discord.js"
import { unauthorizedOops } from "../lib/util/error-responses"
import { commandFromTextChannel, isAdmin, preferredName } from "../lib/util/discord-utils"
import { debugOn, toggleDebug } from "../lib/trackers/debug-tracker"

export const data = new SlashCommandBuilder()
    .setName("debug")
    .setDescription("toggle debug mode for yourself or another user (ADMIN)")
    .addUserOption(option => option.setName("member").setDescription("member to set debug state of").setRequired(false))

export async function execute(interaction: CommandInteraction, _: Client) {
    if (!commandFromTextChannel(interaction)) return
    if (!(await isAdmin(interaction.member as GuildMember))) return unauthorizedOops(interaction) // Auth check

    const memberParam = interaction.options.getMember("member")
    const member = memberParam ? memberParam as GuildMember : interaction.member as GuildMember
    toggleDebug(member)

    const message = `Debug mode is now ${debugOn(member) ? "on" : "off"}.`
    interaction.reply({ content: message, ephemeral: true })

    console.info(message + ` (for ${preferredName(member)})`)
}