import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client, GuildMember, TextChannel } from "discord.js"
import { getLatestMessage } from "../lib/trackers/message-tracker"
import { nameToEmoji } from "../lib/util/data-structure-utils"

export const data = new SlashCommandBuilder()
    .setName("cap")
    .setDescription("show you feel lied to, cheated, or deceived")
    .addUserOption(option => option.setName("capper").setDescription("the one who is capping").setRequired(false))

export async function execute(interaction: CommandInteraction, _: Client) {
    const user = interaction.options.getMember("capper")
    const channel = interaction.channel as TextChannel
    const lastMessage = user ? getLatestMessage(channel, user as GuildMember) : getLatestMessage(channel)
    const billedCap = nameToEmoji("billed_cap")

    if (lastMessage) {
        lastMessage.react(billedCap)
        lastMessage.reply(billedCap)
    }

    // Hacky workaround to avoid replying
    interaction.deferReply()
    interaction.deleteReply()
}