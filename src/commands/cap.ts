import { SlashCommandBuilder } from "@discordjs/builders"
import { Client, GuildMember, TextChannel, ChatInputCommandInteraction } from "discord.js"
import { nameToEmoji } from "../lib/util/data-structure-utils"
import { getLatestMessage, isBot, resolveInteraction } from "../lib/util/discord-utils"

export const data = new SlashCommandBuilder()
    .setName("cap")
    .setDescription("show you feel lied to, cheated, or deceived")
    .addUserOption(option => option.setName("capper").setDescription("the one who is capping").setRequired(false))

export async function execute(interaction: ChatInputCommandInteraction, _: Client) {
    const member = interaction.options.getMember("capper")

    // Bots never cap
    if (member && (await isBot(member as GuildMember))) return interaction.reply("bot don't cap")

    const channel = interaction.channel as TextChannel
    const lastMessage = member ? getLatestMessage(channel, member as GuildMember) : getLatestMessage(channel)
    const billedCap = nameToEmoji("billed_cap")

    if (lastMessage) {
        if (await isBot(lastMessage.member)) {
            channel.send(billedCap)
        } else {
            lastMessage.react(billedCap)
            lastMessage.reply(billedCap)
        }

        resolveInteraction(interaction)
    } else {
        interaction.reply(billedCap)
    }
}