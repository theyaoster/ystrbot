import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client, GuildMember } from "discord.js"
import { createAudioRequest, idle, processAudioQueue } from "../lib/audio-tracker"

const VALID_URL_REGEX = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/

export const data = new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play some audio in your current channel (or channel specified in the channel parameter).")
    .addStringOption(option => option.setName("url").setDescription("Either direct URL of audio file or YouTube link.").setRequired(true))
    .addChannelOption(option => option.setName("channel").setDescription("The voice channel to play in.").setRequired(false))

export async function execute(interaction: CommandInteraction, client: Client) {
    const member = interaction.member as GuildMember
    const url = interaction.options.getString("url")!
    const channelOption = interaction.options.getChannel("channel")

    // Validate inputs
    if (!VALID_URL_REGEX.test(url)) {
        return interaction.reply({ content: "That doesn't looks like a valid URL...", ephemeral: true })
    } else if (channelOption && channelOption.type != "GUILD_VOICE") {
        return interaction.reply({ content: "The channel you provide needs to be a voice channel.", ephemeral: true })
    } else if (!channelOption && !member.voice.channel) {
        return interaction.reply({ content: "You need to be in a voice channel.", ephemeral: true })
    }

    // Enqueue this request
    const channelToJoin = channelOption ? channelOption : member.voice.channel!
    const requestData = await createAudioRequest(member, url, channelToJoin)

    interaction.reply({ content: `Added "${requestData.title}" to the queue. Use **/queue** to view the queue.`, ephemeral: true })

    // Play audio
    if (idle()) {
        console.log("Processing audio queue now...")

        processAudioQueue(client)
    }
}
