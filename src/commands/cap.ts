import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client, GuildMember, TextChannel } from "discord.js";
import { getLatestMessage } from "../lib/message-tracker";

export const data = new SlashCommandBuilder()
    .setName("cap")
    .setDescription("stop the cap")
    .addUserOption(option => option.setName("capper").setDescription("the one who is capping").setRequired(false))

export async function execute(interaction: CommandInteraction, _: Client) {
    const user = interaction.options.getMember("capper")
    const channel = interaction.channel as TextChannel
    const lastMessage = user ? getLatestMessage(channel, user as GuildMember) : getLatestMessage(channel)
    const billedCap = "🧢"
    if (lastMessage) {
        lastMessage.react(billedCap)
    }
    interaction.reply(billedCap)
}