import { SlashCommandBuilder } from "@discordjs/builders"
import { ChatInputCommandInteraction, Client, GuildMember } from "discord.js"
import _ from "underscore"
import { isAdmin } from "../lib/util/discord-utils"
import { unauthorizedOops } from "../lib/util/error-responses"

const LOWER_BOUND = 1
const UPPER_BOUND = 50

export const data = new SlashCommandBuilder()
    .setName("clear")
    .setDescription("delete the last N messages from a channel (ADMIN)")
    .addIntegerOption(option => option.setName("count").setDescription("How many messages to delete.").setRequired(true))
    .addUserOption(option => option.setName("user").setDescription("Whose messages to delete.").setRequired(false))

export async function execute(interaction: ChatInputCommandInteraction, __: Client) {
    if (!(await isAdmin(interaction.member as GuildMember))) return unauthorizedOops(interaction)

    const count = interaction.options.getInteger("count", true)
    if (count < LOWER_BOUND || count > UPPER_BOUND) return interaction.reply({ content: `Count must be between ${LOWER_BOUND} and ${UPPER_BOUND} (inclusive).`, ephemeral: true })

    const user = interaction.options.getUser("user")

    const messageFetchResult = await interaction.channel?.messages.fetch({ limit: count })
    if (_.isUndefined(messageFetchResult)) return interaction.reply({ content: `No messages found.`, ephemeral: true })

    let messages = [...messageFetchResult.values()]
    if (!_.isNull(user)) messages = messages.filter(message => message.author.id === user.id)

    await interaction.reply(`**Deleting ${messages.length} messages...**`)

    await Promise.all(messages.map(message => message.delete()))

    interaction.deleteReply()
}