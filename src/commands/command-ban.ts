import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client, GuildMember } from "discord.js"
import { commandBan } from "../lib/firestore"
import { isAdmin, isCommand } from "../lib/util/discord-utils"
import { unauthorizedOops } from "../lib/util/error-responses"

export const data = new SlashCommandBuilder()
    .setName("command_ban")
    .setDescription("ban a user from using a certain command (ADMIN)")
    .addUserOption(option => option.setName("user").setDescription("the user to banhammer").setRequired(true))
    .addStringOption(option => option.setName("command_name").setDescription("if the command is /foo, type foo here").setRequired(true))

export async function execute(interaction: CommandInteraction, _: Client) {
    const member = interaction.options.getMember("user", true) as GuildMember
    const commandName = interaction.options.getString("command_name", true)

    if (!(await isAdmin(interaction.member as GuildMember))) {
        return unauthorizedOops(interaction)
    } else if (!isCommand(commandName)) {
        return interaction.reply({ content: `No such command /${commandName}.`, ephemeral: true })
    }

    commandBan(member.user.username, commandName).then(succeeded => {
        interaction.reply({ content: succeeded ? `${member.user.username} can no longer use /${commandName}.` : `No changes made since ${member.user.username} is already banned from using /${commandName}.`, ephemeral: true })
    }).catch(console.error)
}