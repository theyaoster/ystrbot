import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, DiscordGatewayAdapterCreator, entersState, joinVoiceChannel, NoSubscriberBehavior, StreamType, VoiceConnection } from "@discordjs/voice"
import { Client, GuildMember, Message, VoiceBasedChannel } from "discord.js"
import { Queue } from "queue-typescript"
import _ from "underscore"
import got from "got"
import ytdl from "ytdl-core"
import { FFmpeg } from "prism-media"
import { sendBotMessage } from "../util/discord-utils"
import { timeCode } from "../util/data-structure-utils"

const VOTE_FRACTION_NEEDED = 0.5
const MAX_DURATION = 24 * 3600 * 1000 // ms
const PADDING_FRAMES = 50

const YOUTUBE_URL_REGEX = /(?:youtube\.com\/watch\?v=|youtu.be\/)(?:[a-zA-Z0-9\-_]{11})(?:(?:\?|&)t=([0-9]+))?/
const FFMPEG_OPUS_ARGUMENTS = ['-analyzeduration', '0', '-acodec', 'libopus', '-f', 'opus', '-ar', '48000', '-ac', '2']
const FFMPEG_BASE_ARGUMENTS = ['-reconnect_streamed', '1', '-reconnect_at_eof', '1', '-reconnect_on_network_error', '1', '-reconnect_on_http_error', '4xx,5xx', '-reconnect_delay_max', '15', ...FFMPEG_OPUS_ARGUMENTS]

type AudioRequest = {
    requester: GuildMember,
    url: string,
    yt: boolean, // youtube link?
    title: string,
    start: number, // seconds
    duration: number | null, // seconds
    channel: VoiceBasedChannel,
    skipVotes: Set<GuildMember>,
}

type AudioTracker = {
    player: AudioPlayer,
    connection: VoiceConnection | null,
    queue: Queue<AudioRequest>,
    current: AudioRequest | null,
    currentMessage: Message | null,
    skipVotesNeeded: number,
}

export const audioTracker: AudioTracker = {
    player: createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } }),
    connection: null,
    queue: new Queue<AudioRequest>(),
    current: null,
    currentMessage: null,
    skipVotesNeeded: NaN,
}

// Configure player to complete request if it transitions from playing audio to being idle
audioTracker.player.on(AudioPlayerStatus.Idle, (oldState, _) => {
    if (oldState.status == AudioPlayerStatus.Playing) {
        completeAudioRequest()
    }
})

export const idle = () => _.isNull(audioTracker.current)
export const skip = () => audioTracker.player.stop()

// Submit a skip vote - returns whether the member's vote was counted
export function voteSkip(member: GuildMember) {
    if (!audioTracker.current) {
        throw new Error("Vote to skip failed - nothing is currently playing.")
    }

    if (audioTracker.current.skipVotes.has(member)) {
        return false
    } else {
        audioTracker.current.skipVotes.add(member)
        return true
    }
}

// Play ALL audio currently queued up
export async function processAudioQueue(client: Client) {
    while (audioTracker.queue.length > 0) {
        const request = audioTracker.queue.dequeue()

        audioTracker.current = request
        audioTracker.skipVotesNeeded = Math.max(1, Math.floor((audioTracker.current.channel.members.size - 1) * VOTE_FRACTION_NEEDED))

        audioTracker.currentMessage = (await sendBotMessage(client, generateBotPlayingMessage()))!

        // Check if we need to switch channels
        if (request.channel.id != audioTracker.connection?.joinConfig.channelId) {
            if (audioTracker.connection) {
                // Destroy existing connection
                audioTracker.connection.destroy()
            }

            // Create new connection and subscribe to the audio player
            audioTracker.connection = joinVoiceChannel({
                channelId: request.channel.id,
                guildId: request.channel.guild.id,
                adapterCreator: request.channel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator
            })
            audioTracker.connection.subscribe(audioTracker.player)
        }

        // Create resource (playable OGG data stream)
        let resource
        try {
            resource = getOggResource(request.url, request.yt, request.start)
        } catch (error: any) {
            console.error(`Error occurred while creating audio resource: ${error.stack}`)

            sendBotMessage(client, `Skipping ${request.title} as an error occurred while creating audio resource.`)

            continue
        }

        // Start playing audio
        audioTracker.player.play(resource)

        // Wait for resource to complete playing (or until the max duration is exceeded)
        try {
            await entersState(audioTracker.player, AudioPlayerStatus.Idle, request.duration ? request.duration * 1000 : MAX_DURATION)
        } catch (error) {
            console.log(`Stopping playback of ${request.title} as duration (${request.duration}s) has been exceeded. (${error})`)

            skip()
        }
    }

    // Reset connection
    audioTracker.connection?.destroy()
    audioTracker.connection = null
}

// Append request to the queue and return request data
export async function createAudioRequest(requester: GuildMember, url: string, channel: VoiceBasedChannel, duration: number | null) {
    // Determine if input is YouTube or direct link
    const match = YOUTUBE_URL_REGEX.exec(url)
    const yt = !_.isNull(match)

    // Name of the video or file we're getting our audio from
    const title = yt ? (await ytdl.getBasicInfo(url)).videoDetails.title : url.substring(url.lastIndexOf('/') + 1)
    const start = yt ? (match.length > 0 ? parseInt(match[1]) : 0) : 0

    const requestData: AudioRequest = { requester, url, yt, start, duration, title, channel, skipVotes: new Set<GuildMember>() }
    audioTracker.queue.enqueue(requestData)

    return requestData
}

// Generate message content based on votes
export function generateBotPlayingMessage() {
    if (!audioTracker.current) {
        throw new Error("Can only generate bot message while something is playing.")
    }

    let newMessage = `Now playing "${requestToString(audioTracker.current)}".`
    const numVotes = audioTracker.current.skipVotes.size
    if (numVotes > 0) {
        newMessage += ` [Skip? ${numVotes}/${audioTracker.skipVotesNeeded}]`
        if (numVotes >= audioTracker.skipVotesNeeded) {
            newMessage = `~~${newMessage}~~ SKIPPED`
        }
    }

    return newMessage
}

// Convert an audio request to a human-readable format
export function requestToString(request: AudioRequest) {
    let baseString = request.title
    let parenData : string[] = []
    if (request.start > 0) {
        parenData.push(`at ${Math.floor(request.start / 60)}:${String(request.start % 60).padStart(2, "0")}`)
    }
    if (request.duration) {
        parenData.push("for " + (request.duration >= 60 ? `${Math.floor(request.duration / 60)} minutes ${request.duration % 60} seconds` : `${request.duration} seconds`))
    }

    if (!_.isEmpty(parenData)) {
        baseString += ` _(${parenData.join(", ")})_`
    }

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
    if (start > 0) {
        args.push("-ss", timeCode(start))
    }

    // The ogg stream we'll be playing audio from
    const remoteAudioStream = rawStream.pipe(new FFmpeg({ args }))
    remoteAudioStream.on("error", error => { console.error(`Error while processing "${url}" in ffmpeg: ${error}`) }) // This can happen when a request is skipped

    return createAudioResource(remoteAudioStream, { inputType: StreamType.OggOpus, silencePaddingFrames: PADDING_FRAMES })
}

// Mark request as complete - this is also run when a request is skipped
function completeAudioRequest() {
    if (idle()) {
        throw new Error("Audio player is not playing - nothing to complete.")
    } else {
        audioTracker.current = null
        audioTracker.currentMessage = null
        audioTracker.skipVotesNeeded = NaN
    }
}
