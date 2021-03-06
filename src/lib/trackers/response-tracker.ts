import { GuildMember, Message, TextChannel } from "discord.js"
import _ from "underscore"
import { numToEmoji, readableArray } from "../util/data-structure-utils"
import { getLatestPing } from "./ping-tracker"

// Mapping from ping message to set of yes responders
let yesResponders = new Array<GuildMember>()
let yesResponse : Message | undefined

// Track a response to a ping - returns whether the response was added or removed
export async function trackYes(pingMessage: Message, member: GuildMember, channel: TextChannel) {
    const oldSize = yesResponders.length
    const index = yesResponders.indexOf(member)
    if (index >= 0) {
        // If the member has already responded, consider this an "undo" of the response
        yesResponders.splice(index, 1)
    } else {
        yesResponders.push(member)

        // Notify the pinger someone responded
        const pinger = getLatestPing()[1]
        channel.send(`${pinger}`).then(notification => notification.delete())
    }

    // Clear out reacts
    await pingMessage.reactions.removeAll()
    if (yesResponders.length > 0) {
        const newEmojis = numToEmoji(yesResponders.length + 1) // Add 1 to include the pinger
        for (const emoji of newEmojis) {
            await pingMessage.react(emoji)
        }
    }

    const responderString = readableArray(yesResponders.map(member => member.nickname || member.user.username))
    const newText = `${responderString} ${yesResponders.length === 1 ? "is" : "are"} down`
    if (yesResponse) {
        if (_.isEmpty(yesResponders)) {
            // If there are now zero people down...
            yesResponse.delete()
            yesResponse = undefined
        } else {
            yesResponse.edit(newText)
        }
    } else {
        yesResponse = await channel.send(newText)
    }

    return yesResponders.length > oldSize
}

// Reset the tracker state (for when a new ping comes in)
export function resetPingResponses() {
    yesResponders = new Array()
    yesResponse = undefined
}