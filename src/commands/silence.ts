import { SlashCommandBuilder } from "@discordjs/builders"
import { ChatInputCommandInteraction, Client, GuildMember } from "discord.js"
import { isSilenced, silence } from "../lib/firestore/admin"
import { evalArithmetic } from "../lib/util/data-structure-utils"
import { commandFromTextChannel, isAdmin, isBot, member } from "../lib/util/discord-utils"
import { unauthorizedOops } from "../lib/util/error-responses"

export const data = new SlashCommandBuilder()
    .setName("silence")
    .setDescription("temporarily silence a user in text (ADMIN)")
    .addUserOption(option => option.setName("user").setDescription("the user to silence").setRequired(true))
    .addStringOption(option => option.setName("duration_min").setDescription("number of minutes to silence for").setRequired(true))

export async function execute(interaction: ChatInputCommandInteraction, __: Client) {
    if (!commandFromTextChannel(interaction)) return

    const user = interaction.options.getUser("user", true)
    const mem = await member(user.id)
    const name = user.username
    const durationString = interaction.options.getString("duration_min", true)

    const numberForm = Number(durationString)
    const duration = isNaN(numberForm) ? evalArithmetic(durationString) : numberForm

    if (!(await isAdmin(interaction.member as GuildMember))) return unauthorizedOops(interaction)
    if (await isBot(mem)) return interaction.reply({ content: "Bot cannot be silenced.", ephemeral: true })
    if (!duration || isNaN(duration)) return interaction.reply({ content: "Duration must be a number or expression.", ephemeral: true })
    if (await isSilenced(name)) return interaction.reply({ content: `${name} is already silenced.`, ephemeral: true })

    const endDate = new Date(Date.now() + duration * 60 * 1000)
    silence(name, endDate.valueOf()).then(_ => {
        interaction.reply({ content: `${name} is silenced until ${endDate.toLocaleString()}.`, ephemeral: true })
    }).catch(console.error)
}