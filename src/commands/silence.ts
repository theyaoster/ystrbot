import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client, GuildMember } from "discord.js"
import _ from "underscore"
import { isSilenced, silence } from "../lib/firestore/admin"
import { evalArithmetic } from "../lib/util/data-structure-utils"
import { commandFromTextChannel, isAdmin, isBot } from "../lib/util/discord-utils"
import { unauthorizedOops } from "../lib/util/error-responses"

export const data = new SlashCommandBuilder()
    .setName("silence")
    .setDescription("temporarily silence a user in text (ADMIN)")
    .addUserOption(option => option.setName("user").setDescription("the user to silence").setRequired(true))
    .addStringOption(option => option.setName("duration_min").setDescription("number of minutes to silence for").setRequired(true))

export async function execute(interaction: CommandInteraction, __: Client) {
    if (!commandFromTextChannel(interaction)) return

    const member = interaction.options.getMember("user", true) as GuildMember
    const name = member.user.username
    const durationString = interaction.options.getString("duration_min", true)

    const numberForm = Number(durationString)
    const duration = isNaN(numberForm) ? evalArithmetic(durationString) : numberForm

    if (!(await isAdmin(interaction.member as GuildMember))) return unauthorizedOops(interaction)
    if (await isBot(member)) return interaction.reply({ content: "Bot cannot be silenced.", ephemeral: true })
    if (!duration || isNaN(duration)) return interaction.reply({ content: "Duration must be a number or expression.", ephemeral: true })
    if (await isSilenced(name)) return interaction.reply({ content: `${name} is already silenced.`, ephemeral: true })

    const endDate = new Date(Date.now() + duration * 60 * 1000)
    silence(name, endDate.valueOf()).then(_ => {
        interaction.reply({ content: `${name} is silenced until ${endDate.toLocaleString()}.`, ephemeral: true })
    }).catch(console.error)
}