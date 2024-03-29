import { Message, TextChannel } from "discord.js"
import { getConfig, waitForDiscordConfig } from "../config/discord-config"
import { countdown, isBot } from "../lib/util/discord-utils"

const COUNTDOWN = 3 // seconds
const CHANNELS_TO_KEEP_CLEAN : string[] = []
let countdownActive = false

// Wait for discord config to load
async function waitForConfig() {
    await waitForDiscordConfig()
    CHANNELS_TO_KEEP_CLEAN.push(getConfig().FEEDBACK_CHANNEL_ID)
}

waitForConfig()

export async function execute(message: Message) {
    // Skip if the message was sent by the bot
    if (!message.channelId || !CHANNELS_TO_KEEP_CLEAN.includes(message.channelId) || (await isBot(message.member))) {
        return
    }

    const textChannel = message.channel as TextChannel
    message.delete()

    if (!countdownActive) {
        const promise = countdown(COUNTDOWN, 1000, textChannel, _ => "please keep this channel clean! (this will autodelete)")
        countdownActive = true
        promise.then(_ => countdownActive = false)
    }
}