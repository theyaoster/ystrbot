import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, DiscordGatewayAdapterCreator, entersState, joinVoiceChannel, NoSubscriberBehavior, StreamType, VoiceConnection } from "@discordjs/voice"
import { GuildMember, Snowflake, VoiceChannel } from "discord.js"
import _ from "underscore"
import got from "got"
import ytdl from "ytdl-core"
import { FFmpeg } from "prism-media"
import { channel, guild, member, sendBotMessage } from "../util/discord-utils"
import { nameFromDirectUrl, readableTimeSeconds, timeCode } from "../util/data-structure-utils"
import { getCurrentRequest, getCurrentMessage, getQueue, popAudioRequest, pushAudioRequest, pushSkipVote, setCurrentMessageId, skipVotesNeeded, updateSkipVotesNeeded } from "../firestore/audio_requests"
import { AudioRequest } from "../../config/firestore-schema"

const MAX_DURATION = 24 * 3600 * 1000 // ms
const PADDING_FRAMES = 50
const DEFAULT_PERCEIVED_LOUDNESS_MULTIPLIER = 0.5 // for ear safety

const YOUTUBE_URL_REGEX = /(?:youtube\.com\/watch\?v=|youtu.be\/)(?:[a-zA-Z0-9\-_]{11})(?:(?:\?|&)t=([0-9]+))?/
const FFMPEG_OPUS_ARGUMENTS = ['-analyzeduration', '0', '-acodec', 'libopus', '-f', 'opus', '-ar', '48000', '-ac', '2']
const FFMPEG_BASE_ARGUMENTS = ['-reconnect_streamed', '1', '-reconnect_at_eof', '1', '-reconnect_on_network_error', '1', '-reconnect_on_http_error', '4xx,5xx', '-reconnect_delay_max', '15', ...FFMPEG_OPUS_ARGUMENTS]

// Track audio player and voice connection
const player : AudioPlayer = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } })
let connection : VoiceConnection | null = null

// Skip the currently playing request
export function skipRequest() {
    console.log("Skipping current request.")

    player.stop()
}

// Whether the player is currently idle
export function playerIdle() {
    return player.state.status === AudioPlayerStatus.Idle
}

// Submit a skip vote - returns whether the member's vote was counted
export async function voteSkip(member: GuildMember) {
    if (playerIdle()) throw new Error("Vote to skip failed - nothing is currently playing.")

    const voted = await pushSkipVote(member.user.username)
    if (voted) {
        const currentMessage = await getCurrentMessage(member)
        currentMessage?.edit(await generateBotPlayingMessage())

        // Skip the request if the needed skip votes is reached
        const currentRequest = await getCurrentRequest()
        if (currentRequest.skipVotes.length >= await skipVotesNeeded()) skipRequest()
    }

    return voted
}

// Play ALL audio currently queued up
export async function processAudioQueue() {
    while ((await getQueue()).length > 0) {
        // Fetch the next request and set it as the current request in Firestore
        const request = await popAudioRequest()
        const requester = await member(request.requesterId)

        // Send message indicating this request is now playing
        const currentMessage = await sendBotMessage(await generateBotPlayingMessage(), requester)

        // Update metadata for current state
        const requestChannel = await channel(request.channelId) as VoiceChannel
        setCurrentMessageId(currentMessage.id)
        updateSkipVotesNeeded(requestChannel.members.size)

        // Check if we need to switch channels
        if (connection && request.channelId !== connection?.joinConfig.channelId) resetConnection()

        // If connection doesn't exist, create new connection and subscribe to the audio player
        if (!connection) {
            const thisGuild = await guild()
            connection = joinVoiceChannel({
                channelId: request.channelId,
                guildId: thisGuild.id,
                adapterCreator: thisGuild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
            })

            connection.subscribe(player)
        }

        // Create resource (playable OGG data stream)
        let resource
        try {
            resource = getOggResource(request.url, request.yt, request.start)
            resource.volume?.setVolumeLogarithmic(DEFAULT_PERCEIVED_LOUDNESS_MULTIPLIER)
        } catch (error: any) {
            console.error(`Error occurred while creating audio resource: ${error.stack}`)

            sendBotMessage(`Skipping ${request.title} as an error occurred while creating audio resource.`, requester)

            continue
        }

        // Start playing audio
        player.play(resource)

        console.log(`Now playing ${request.title}...`)

        // Wait for resource to complete playing (or until the max duration is exceeded)
        try {
            await entersState(player, AudioPlayerStatus.Idle, request.duration ? request.duration * 1000 : MAX_DURATION)
        } catch (error: any) {
            console.error(error.stack)
            console.log(`Stopping playback of ${request.title} as duration (${readableTimeSeconds(request.duration ? request.duration : MAX_DURATION)}) has been exceeded.`)

            skipRequest()
        }
    }

    console.log("Audio queue complete.")

    resetConnection()
}

// Append request to the queue and return request data
export async function createAudioRequest(requesterId: Snowflake, url: string, channelId: Snowflake, duration?: number) {
    // Determine if input is YouTube or direct link
    const match = YOUTUBE_URL_REGEX.exec(url)
    const yt = !_.isNull(match)

    // Name of the video or file we're getting our audio from
    const title = yt ? (await ytdl.getBasicInfo(url)).videoDetails.title : nameFromDirectUrl(url)
    const start = yt ? (match[1] ? parseInt(match[1]) : 0) : 0

    const requestData: AudioRequest = { requesterId, yt, url, start, title, channelId, skipVotes: [] }
    if (duration) requestData.duration = duration

    await pushAudioRequest(requestData)

    return requestData
}

// Generate message content based on votes
export async function generateBotPlayingMessage() {
    const current = await getCurrentRequest()
    if (!current || _.isEmpty(current)) throw Error("Unable to generate bot message - current request is empty.")

    const votesNeeded = await skipVotesNeeded()
    const numVotes = current.skipVotes.length

    let newMessage = `Now playing "${requestToString(current)}".`
    if (numVotes > 0) {
        newMessage += ` [Skip? **${numVotes}/${votesNeeded}**]`
        if (numVotes >= votesNeeded) {
            newMessage = `~~${newMessage}~~ SKIPPED`
        }
    }

    return newMessage
}

// Convert an audio request to a human-readable format
export function requestToString(request: AudioRequest) {
    let baseString = request.title
    const parenData : string[] = []
    if (request.start > 0) parenData.push(`starting at ${timeCode(request.start)}`)
    if (request.duration) parenData.push(`for ${readableTimeSeconds(request.duration)}`)
    if (!_.isEmpty(parenData)) baseString += ` _(${parenData.join(", ")})_`

    return baseString
}

// Helper for creating an OGG stream from url
function getOggResource(url: string, yt: boolean, start: number) {
    // Create stream to pull raw audio data from
    let rawStream
    try {
        rawStream = yt ? ytdl(url, { filter: "audioonly" }) : got.stream(url)
    } catch (error: any) {
        throw new Error(`Error occurred while creating stream from \`${url}\`: ${error.stack}`)
    }

    // Construct ffmpeg args
    const args = Object.assign([], FFMPEG_BASE_ARGUMENTS) // shallow copy
    if (start > 0) args.push("-ss", timeCode(start))

    // The ogg stream we'll be playing audio from
    const remoteAudioStream = rawStream.pipe(new FFmpeg({ args }))
    remoteAudioStream.on("error", error => { console.error(`Error while processing "${url}" in ffmpeg: ${error}`) }) // This can happen when a request is skipped

    return createAudioResource(remoteAudioStream, { inputType: StreamType.OggOpus, silencePaddingFrames: PADDING_FRAMES, inlineVolume: true })
}

// Reset audio connection
function resetConnection() {
    connection?.destroy()
    connection = null
}
