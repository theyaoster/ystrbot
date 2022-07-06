import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client, GuildMember } from "discord.js"
import _ from "underscore"
import { silence } from "../lib/firestore"
import { evalArithmetic } from "../lib/util/data-structure-utils"
import { commandFromTextChannel, isAdmin } from "../lib/util/discord-utils"
import { unauthorizedOops } from "../lib/util/error-responses"

export const data = new SlashCommandBuilder()
    .setName("silence")
    .setDescription("temporarily silence a user in text")
    .addUserOption(option => option.setName("user").setDescription("the user to silence").setRequired(true))
    .addStringOption(option => option.setName("duration_sec").setDescription("number of seconds to silence for").setRequired(true))

export async function execute(interaction: CommandInteraction, __: Client) {
    if (!commandFromTextChannel(interaction)) return

    const member = interaction.options.getMember("user", true) as GuildMember
    const durationString = interaction.options.getString("duration_sec", true)

    const numberForm = Number(durationString)
    const duration = isNaN(numberForm) ? evalArithmetic(durationString) : numberForm

    if (!isAdmin(interaction.member as GuildMember)) {
        return unauthorizedOops(interaction)
    } else if (duration && isNaN(duration)) {
        return interaction.reply({ content: "Duration must be a number or expression.", ephemeral: true })
    }

    const endDate = Date.now() + duration * 1000
    silence(member.user.username, endDate).then(succeeded => {
        interaction.reply({ content: succeeded ? `${member.user.username} is silenced until ${endDate}.` : `${member.user.username} is already silenced.`, ephemeral: true })
    }).catch(console.error)
}