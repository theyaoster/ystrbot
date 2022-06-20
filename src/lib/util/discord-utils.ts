import { CommandInteraction, Client, GuildMember, TextChannel, Message, Guild, Role } from "discord.js"
import _ from "underscore"
import { useTextChannelOops, useTextChannelThreadOops } from "./error-responses"
import { discordConfig, waitForDiscordConfig } from "../../config/discord-config"
import { getConfigsFromFirestore, getDebugData } from "../firestore"
import config from "../../config/config"
import { sleep, sleepSeconds, wait } from "./async-utils"

// Auxiliary discord client for fetching resources
const client = new Client({
    intents: [
        "GUILDS",
        "GUILD_MEMBERS",
        "GUILD_MESSAGES",
    ]
})

client.login(config.DISCORD_TOKEN)

const VAL_ROLE_ID_NAME = "VAL_ROLE_ID"

let discordLoaded = false

// Cache for discord elements
let GUILD : Guild | undefined
let PATCH_NOTES_CHANNEL : TextChannel | undefined
let BOT_CHANNEL : TextChannel | undefined
let PING_CHANNEL : TextChannel | undefined
let FEEDBACK_CHANNEL : TextChannel | undefined
let VAL_ROLE : Role | undefined
let BOT_MEMBER : GuildMember | undefined

// Fetch discord elements
waitForDiscordConfig().then(async () => {
    while (!client.isReady()) {
        await wait()
    }

    GUILD = client.guilds.cache.get(discordConfig.GUILD_ID)!
    PATCH_NOTES_CHANNEL = client.channels.cache.get(discordConfig.PATCH_NOTES_CHANNEL_ID) as TextChannel
    BOT_CHANNEL = client.channels.cache.get(discordConfig.BOT_TEXT_CHANNEL_ID) as TextChannel
    PING_CHANNEL = client.channels.cache.get(discordConfig.VAL_PING_CHANNEL_ID) as TextChannel
    FEEDBACK_CHANNEL = client.channels.cache.get(discordConfig.FEEDBACK_CHANNEL_ID) as TextChannel

    VAL_ROLE = GUILD.roles.cache.get(discordConfig.VAL_ROLE_ID)

    BOT_MEMBER = GUILD.members.cache.get(discordConfig.CLIENT_ID)

    discordLoaded = true
})

// Wait for all discord elements to be fetched
export async function waitForDiscordElements() {
    while (!discordLoaded) {
        await wait()
    }
}

// Getters for basic discord elements
export async function guild() { await waitForDiscordElements(); return GUILD! }
export async function botChannel() { await waitForDiscordElements(); return BOT_CHANNEL! }
export async function patchNotesChannel() { await waitForDiscordElements(); return PATCH_NOTES_CHANNEL! }
export async function pingChannel() { await waitForDiscordElements(); return PING_CHANNEL! }
export async function feedbackChannel() { await waitForDiscordElements(); return FEEDBACK_CHANNEL! }
export async function valRole() { await waitForDiscordElements(); return VAL_ROLE! }
export async function self() { await waitForDiscordElements(); return BOT_MEMBER! }

// Whether the member has admin permissions
export function isAdmin(member: GuildMember | null) {
    return !_.isNull(member) && member.roles.cache.has(discordConfig.ADMIN_ROLE_ID)
}

// Whether the member is in the bots role
export function isBot(member: GuildMember | null) {
    return !_.isNull(member) && member.roles.cache.has(discordConfig.BOTS_ROLE_ID)
}

// Get the preferred nickname of a member if possible (otherwise get their username)
export function preferredName(member: GuildMember) {
    return member.nickname ? member.nickname : member.user.username
}

// Gets an emoji object by name
export function findEmoji(alias: string) {
    return client.emojis.cache.find(e => e.name === alias)
}

// Whether a string corresponds to a command defined in src/commands
export function isCommand(commandName: string) {
    const commandModules = require("../../commands/index")
    const helpCommand = require("../../commands/help")
    return commandName in Object(commandModules) || commandName === helpCommand.data.name
}

// Whether the command came from a text channel or not
export function commandFromTextChannel(interaction: CommandInteraction) {
    if (!interaction?.channelId) {
        useTextChannelOops(interaction)
        return false
    }
    const channel = client.channels.cache.get(interaction.channelId)
    if (!channel || channel.type !== "GUILD_TEXT") {
        useTextChannelOops(interaction)
        return false
    }
    return true
}

// Whether the command came from a thread or not
export function commandFromTextChannelThread(interaction: CommandInteraction) {
    if (!interaction?.channelId) {
        useTextChannelThreadOops(interaction)
        return false
    }
    const channel = client.channels.cache.get(interaction.channelId)
    if (!channel || !["GUILD_PUBLIC_THREAD", "GUILD_PRIVATE_THREAD"].includes(channel.type)) {
        useTextChannelThreadOops(interaction)
        return false
    }
    return true
}

// Sent a message that edits itself to countdown, until it deletes itself
export async function countdown(start: number, timeUnitInMillis: number, textChannel: TextChannel, textBuilder: (n: number) => string) {
    let message : Message | undefined = undefined
    for (let i of _.range(start, 0, -1)) {
        if (_.isUndefined(message)) {
            message = await textChannel.send(textBuilder(i))
        } else {
            message.edit(textBuilder(i))
        }

        await sleep(timeUnitInMillis)
    }

    message?.delete()
}

// Get the channel that the bot sends updates to
export async function sendBotMessage(message: string, interaction?: CommandInteraction, timeoutSeconds?: number) {
    const channel = await botChannel()

    // Send message
    let promise
    if (interaction) {
        if (interaction.channelId == channel.id) {
            promise = interaction.reply(message)
        } else {
            interaction.reply({ content: `See ${channel} for output.`, ephemeral: true })
            promise = channel.send(message)
        }
    } else {
        promise = channel.send(message)
    }

    // Delete the message if a timeout is specified
    if (timeoutSeconds) {
        promise.then(async output => {
            await sleepSeconds(timeoutSeconds)

            if (output instanceof Message) {
                output.delete()
            } else {
                interaction?.deleteReply()
            }
        })
    }
}

// Handle all things that change when debug is flipped
export async function handleDebug(newValue: boolean) {
    if (newValue) {
        // Change role ID to testing role
        const debugData = await getDebugData()
        discordConfig[VAL_ROLE_ID_NAME] = debugData[VAL_ROLE_ID_NAME]
    } else {
        // Change role ID to actual role
        const configData = await getConfigsFromFirestore()
        discordConfig[VAL_ROLE_ID_NAME] = configData[VAL_ROLE_ID_NAME]
    }
}