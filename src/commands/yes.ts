import { SlashCommandBuilder } from "@discordjs/builders"
import { Client, CommandInteraction, GuildMember, Message, TextChannel } from "discord.js"
import { discordConfig } from "../config/discord-config"
import { getLatestPing } from "../lib/ping-tracker"
import { trackYes } from "../lib/response-tracker"
import { commandFromTextChannel } from "../lib/utils"

export const data = new SlashCommandBuilder()
    .setName("yes")
    .setDescription("You're down to play.")
    .addIntegerOption(option => option.setName("delay_in_min").setDescription("Time in minutes before you are ready to play.").setRequired(false))

export async function execute(interaction: CommandInteraction, client: Client) {
    if (!commandFromTextChannel(interaction, client)) {
        return
    }

    const latest = getLatestPing()
    const pingMessage = latest[0] as Message
    if (!pingMessage) {
        return interaction.reply({ content: "I can't find the latest ping... maybe I was restarted recently?", ephemeral: true })
    }

    // Check if the caller is the same person who pinged
    const pinger = latest[1] as GuildMember
    if (pinger.id === interaction.user.id) {
        return interaction.reply({ content: "well yeah, you are the one sounding the horn", ephemeral: true })
    }

    const pingChannel = client.channels.cache.get(discordConfig.VAL_PING_CHANNEL_ID) as TextChannel
    const member = interaction.member as GuildMember
    const delayMinutes = interaction.options.getInteger("delay_in_min") || undefined
    const added = await trackYes(pingMessage, member, pingChannel, delayMinutes)
    interaction.reply({ content: added ? "you've reported for duty" : "you've left your duty", ephemeral: true })
}