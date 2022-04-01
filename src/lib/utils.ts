import { CommandInteraction, Client, GuildMember, TextChannel, Message } from "discord.js";
import _ from "underscore";
import { useTextChannelOops, useTextChannelThreadOops } from "./error-responses";
import { discordConfig } from "../config/discord-config";
import { getConfigsFromFirestore, getDebugData } from "./firestore";
import converter from "number-to-words"
const toEmoji = require("emoji-name-map") // doesn't have @types

const CAPTURE_EMOJIS_REGEX = /(:[^:\s]+:|<:[^:\s]+:[0-9]+>|<a:[^:\s]+:[0-9]+>)/gi
const VAL_ROLE_ID_NAME = "VAL_ROLE_ID"

// Idle wait
export async function sleep(milliseconds: number) {
    await new Promise(f => setTimeout(f, milliseconds));
}

// Whether the command came from a text channel or not
export function commandFromTextChannel(interaction: CommandInteraction, client: Client) {
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
export function commandFromTextChannelThread(interaction: CommandInteraction, client: Client) {
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

// Whether the member has admin permissions
export function isAdmin(member: GuildMember | null) {
    if (!member) {
        return false
    }
    return member.roles.cache.has(discordConfig.ADMIN_ROLE_ID)
}

// Whether the member is in the bots role
export function isBot(member: GuildMember | null) {
    if (!member) {
        return false
    }
    return member.roles.cache.has(discordConfig.BOTS_ROLE_ID)
}

// Filters custom emojis out of a string
export function withoutEmojis(message: string) {
   return message.replaceAll(CAPTURE_EMOJIS_REGEX, "")
}

// Gets an emoji object by name
export function findEmoji(alias: string, client: Client) {
    return client.emojis.cache.find(e => e.name === alias)
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

// The current time with just hours and minutes
export async function currentTime(addMinutes?: number) {
    const options: { [key: string] : string } = {
        timeZone: "PDT",
        timeZoneName: "short",
        hour: "numeric",
        minute: "numeric"
    }

    const minutes = addMinutes || 0
    return new Date(Date.now().valueOf() + minutes * 60 * 1000).toLocaleString("en-US", options)
}

// Convert number into the appropriate unicode emoji(s)
export function numToEmoji(number: number): string[] {
    if (number < 0) {
        throw new Error("Input out of range: must be nonnegative.")
    } else if (number <= 10) {
        return [toEmoji.get(converter.toWords(number))]
    } else {
        return [toEmoji.get("arrow_forward"), toEmoji.get(converter.toWords(10))]
    }
}

// Convert an array of strings into a comma separated list, with "and" inserted as needed
export function readableArray(array: string[]) {
    return array.reduce((a, b, i, array) => a + (i < array.length - 1 ? ', ' : ' and ') + b)
}
