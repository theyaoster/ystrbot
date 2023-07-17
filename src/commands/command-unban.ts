import { SlashCommandBuilder } from "@discordjs/builders"
import { ChatInputCommandInteraction, Client, GuildMember } from "discord.js"
import { commandUnban } from "../lib/firestore/admin"
import { isAdmin, isCommand, member } from "../lib/util/discord-utils"
import { unauthorizedOops } from "../lib/util/error-responses"

export const data = new SlashCommandBuilder()
    .setName("command_unban")
    .setDescription("unban a user from using a certain command (ADMIN)")
    .addUserOption(option => option.setName("user").setDescription("the user to unbanhammer").setRequired(true))
    .addStringOption(option => option.setName("command_name").setDescription("if the command is /foo, type foo here").setRequired(true))

export async function execute(interaction: ChatInputCommandInteraction, _: Client) {
    const user = interaction.options.getUser("user", true)
    const mem = await member(user.id)
    const commandName = interaction.options.getString("command_name", true)

    if (!(await isAdmin(interaction.member as GuildMember))) {
        return unauthorizedOops(interaction)
    } else if (!isCommand(commandName)) {
        return interaction.reply({ content: `No such command /${commandName}.`, ephemeral: true })
    }

    commandUnban(mem.user.username, commandName).then(() => {
        interaction.reply({ content: `${mem.user.username} can now use /${commandName}`, ephemeral: true })
    }).catch(console.error)
}