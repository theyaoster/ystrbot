import { CommandInteraction, Client, GuildMember, TextChannel, Message, Guild, Snowflake, ChannelType, GatewayIntentBits } from "discord.js"
import _ from "underscore"
import { useTextChannelOops, useTextChannelThreadOops } from "./error-responses"
import { getConfig, waitForDiscordConfig } from "../../config/discord-config"
import config from "../../config/config"
import { sleep, sleepSeconds } from "./async-utils"

// Auxiliary discord client for fetching resources
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
    ]
})

client.login(config.DISCORD_TOKEN)

// Cache for static discord elements
let GUILD : Guild | undefined
let BOT_MEMBER : GuildMember | undefined

// Getters for basic discord elements
export async function self() { await waitForDiscordConfig(); return BOT_MEMBER ??= await (await guild()).members.fetch(getConfig().CLIENT_ID) }
export async function guild() { await waitForDiscordConfig(); return GUILD ??= await client.guilds.fetch(getConfig().GUILD_ID) }
export async function member(id: Snowflake) { return (await guild()).members.fetch(id) }
export async function channel(id: Snowflake) { return (await guild()).channels.cache.get(id)! }
export async function message(channel: TextChannel, id: Snowflake) { await waitForDiscordConfig(); return await channel.messages.fetch(id) }
export async function botChannel(member?: GuildMember) { await waitForDiscordConfig(); return client.channels.cache.get(getConfig(member).BOT_TEXT_CHANNEL_ID) as TextChannel }
export async function patchNotesChannel(member?: GuildMember) { await waitForDiscordConfig(); return client.channels.cache.get(getConfig(member).PATCH_NOTES_CHANNEL_ID) as TextChannel }
export async function pingChannel(member?: GuildMember) { await waitForDiscordConfig(); return client.channels.cache.get(getConfig(member).VAL_PING_CHANNEL_ID) as TextChannel }
export async function videoChannel(member?: GuildMember) { await waitForDiscordConfig(); return client.channels.cache.get(getConfig(member).VIDEO_CHANNEL_ID) as TextChannel }
export async function feedbackChannel(member?: GuildMember) { await waitForDiscordConfig(); return client.channels.cache.get(getConfig(member).FEEDBACK_CHANNEL_ID) as TextChannel }
export async function valRole(member?: GuildMember) { return (await guild()).roles.cache.get(getConfig(member).VAL_ROLE_ID)! }
export async function adminRole(member?: GuildMember) { return (await guild()).roles.cache.get(getConfig(member).ADMIN_ROLE_ID)! }
export async function botRole(member?: GuildMember) { return (await guild()).roles.cache.get(getConfig(member).BOTS_ROLE_ID)! }

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
    return member.nickname ? member.nickname : member.displayName
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
export async function resolveInteraction(interaction: CommandInteraction) {
    await interaction.deferReply()
    interaction.deleteReply()
}

// Get the latest message (by a specific member, if provided) in a particular channel
export function getLatestMessage(channel: TextChannel, member?: GuildMember) {
    if (member) {
        const lastMsg = channel.messages.cache.find(msg => msg.author.id === member.id)
        if (!lastMsg) console.log(`Failed to find last message by ${preferredName(member)} in ${channel.name}.`)
        return lastMsg
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
    if (!channel || channel.type !== ChannelType.GuildText) {
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
    if (!channel || ![ChannelType.GuildPublicThread, ChannelType.GuildPrivateThread].includes(channel.type)) {
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

// Send message in the bot-dedicated channel
export async function sendBotMessage(message: string, member?: GuildMember, interaction?: CommandInteraction, timeoutSeconds?: number) {
    const channel = await botChannel(member)

    // Handle interaction if provided
    if (interaction) {
        if (interaction.channelId !== channel.id) {
            interaction.reply({ content: `See ${channel} for output.`, ephemeral: true })
        } else {
            resolveInteraction(interaction)
        }
    }

    // Send message
    const sentMessage = await channel.send(message)

    // Delete the message if a timeout is specified
    if (timeoutSeconds) sleepSeconds(timeoutSeconds).then(() => sentMessage.delete())

    return sentMessage
}