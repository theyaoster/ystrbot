import { CommandInteraction, Client, GuildMember, TextChannel, Message, Guild } from "discord.js"
import _ from "underscore"
import { useTextChannelOops, useTextChannelThreadOops } from "./error-responses"
import { getConfig, waitForDiscordConfig } from "../../config/discord-config"
import config from "../../config/config"
import { sleep, sleepSeconds } from "./async-utils"

// Auxiliary discord client for fetching resources
const client = new Client({
    intents: [
        "GUILDS",
        "GUILD_MEMBERS",
        "GUILD_MESSAGES",
    ]
})

client.login(config.DISCORD_TOKEN)

// Cache for static discord elements
let GUILD : Guild | undefined
let BOT_MEMBER : GuildMember | undefined

// Getters for basic discord elements
export async function self() { await waitForDiscordConfig(); return BOT_MEMBER ??= (await guild()).members.cache.get(getConfig().CLIENT_ID)! }
export async function guild() { await waitForDiscordConfig(); return GUILD ??= client.guilds.cache.get(getConfig().GUILD_ID)! }
export async function botChannel(member?: GuildMember) { await waitForDiscordConfig(); return client.channels.cache.get(getConfig(member).BOT_TEXT_CHANNEL_ID) as TextChannel }
export async function patchNotesChannel(member?: GuildMember) { await waitForDiscordConfig(); return client.channels.cache.get(getConfig(member).PATCH_NOTES_CHANNEL_ID) as TextChannel }
export async function pingChannel(member?: GuildMember) { await waitForDiscordConfig(); return client.channels.cache.get(getConfig(member).VAL_PING_CHANNEL_ID) as TextChannel }
export async function videoChannel(member?: GuildMember) { await waitForDiscordConfig(); return client.channels.cache.get(getConfig(member).VIDEO_CHANNEL_ID) as TextChannel }
export async function feedbackChannel(member?: GuildMember) { await waitForDiscordConfig(); return client.channels.cache.get(getConfig(member).FEEDBACK_CHANNEL_ID) as TextChannel }
export async function valRole(member?: GuildMember) { await waitForDiscordConfig(); return (await guild()).roles.cache.get(getConfig(member).VAL_ROLE_ID)! }
export async function adminRole(member?: GuildMember) { await waitForDiscordConfig(); return (await guild()).roles.cache.get(getConfig(member).ADMIN_ROLE_ID)! }
export async function botRole(member?: GuildMember) { await waitForDiscordConfig(); return (await guild()).roles.cache.get(getConfig(member).BOTS_ROLE_ID)! }


// Whether the member has admin permissions
export async function isAdmin(member: GuildMember | null) {
    return !_.isNull(member) && member.roles.cache.has((await adminRole()).id)
}

// Whether the member is in the bots role
export async function isBot(member: GuildMember | null) {
    return (!_.isNull(member) && member.roles.cache.has((await botRole()).id)) || member?.user.bot
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

// Resolves a command interaction without a reply... nice and hacky!
export function resolveInteraction(interaction: CommandInteraction) {
    interaction.deferReply()
    interaction.deleteReply()
}

// Get the latest message (by a specific member, if provided) in a particular channel
export function getLatestMessage(channel: TextChannel, member?: GuildMember) {
    if (member) {
        channel.messages.cache.find(msg => msg.author.id === member.id)
    }

    return channel.messages.cache.get(channel.lastMessageId!)
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