import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client, GuildMember } from "discord.js"
import { createAudioRequest, playerIdle, processAudioQueue, pushYtPlaylist } from "../lib/util/audio-request-utils"
import { resolveInteraction } from "../lib/util/discord-utils"

const VALID_URL_REGEX = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/
const PLAYLIST_PREFIX = "https://www.youtube.com/playlist"

export const data = new SlashCommandBuilder()
    .setName("play")
    .setDescription("play audio from a YouTube link (or direct link to an audio file)")
    .addStringOption(option => option.setName("url").setDescription("Either direct URL of audio file or YouTube link.").setRequired(true))
    .addChannelOption(option => option.setName("channel").setDescription("The voice channel to play in.").setRequired(false))
    .addIntegerOption(option => option.setName("duration").setDescription("How many seconds to play the audio for.").setRequired(false))

export async function execute(interaction: CommandInteraction, _: Client) {
    const member = interaction.member as GuildMember
    const url = interaction.options.getString("url", true)
    const channelOption = interaction.options.getChannel("channel")
    const duration = interaction.options.getInteger("duration") || undefined

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
    try {
        if (url.startsWith(PLAYLIST_PREFIX)) {
            console.log(`Processing playlist of audio requests...`)

            await resolveInteraction(interaction)
            await pushYtPlaylist(member.id, url, channelToJoin.id)

            console.log(`Done pushing playlist requests.`)
        } else{
            await resolveInteraction(interaction)
            await createAudioRequest(member.id, url, channelToJoin.id, duration)
        }
    } catch (error: any) {
        console.error(`Error in /play while queuing request: ${error.stack}`)

        interaction.reply({ content: `Failed to queue that: ${error}`, ephemeral: true })
    }

    // Play audio
    if (playerIdle()) {
        console.log("Processing audio queue now...")

        processAudioQueue()
    }
}
