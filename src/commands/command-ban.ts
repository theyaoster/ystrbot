import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client, GuildMember } from "discord.js"
import { commandBan } from "../lib/firestore"
import { isCommand } from "../lib/util/data-structure-utils"
import { isAdmin } from "../lib/util/discord-utils"
import { unauthorizedOops } from "../lib/util/error-responses"

export const data = new SlashCommandBuilder()
    .setName("command_ban")
    .setDescription("ban a user from using a certain command")
    .addUserOption(option => option.setName("user").setDescription("the user to banhammer").setRequired(true))
    .addStringOption(option => option.setName("command_name").setDescription("if the command is /command, type command for this parameter").setRequired(true))

export async function execute(interaction: CommandInteraction, _: Client) {
    const member = interaction.options.getMember("user", true) as GuildMember
    const commandName = interaction.options.getString("command_name", true)
    if (!isAdmin(member)) {
        return unauthorizedOops(interaction)
    } else if (!isCommand(commandName)) {
        return interaction.reply({ content: `There's no command '${commandName}'`, ephemeral: true })
    }

    commandBan(member.user.username, commandName).then(() => {
        interaction.reply({ content: `${member.user.username} can no longer use /${commandName}`, ephemeral: true })
    }).catch(console.error)
}