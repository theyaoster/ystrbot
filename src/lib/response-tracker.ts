import { GuildMember, Message, TextChannel } from "discord.js"
import _ from "underscore"
import { getLatestPing } from "./ping-tracker"
import { currentTime, numToEmoji, readableArray } from "./utils"

// Mapping from ping message to set of yes responders
let yesResponders = new Array<GuildMember>()
let yesResponse : Message | undefined

// Track a response to a ping - returns whether the response was added or removed
export async function trackYes(pingMessage: Message, member: GuildMember, channel: TextChannel, delay?: number) {
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

    const oldEmoji = numToEmoji(oldSize + 1) // Add 1 to include the pinger
    pingMessage.reactions.cache.delete(oldEmoji)
    if (yesResponders.length > 0) {
        const newEmoji = numToEmoji(yesResponders.length + 1)
        pingMessage.react(newEmoji)
    }

    const responderString = readableArray(yesResponders.map(member => member.nickname || member.user.username))
    const delayString = delay ? ` in ${delay} (at ${currentTime(delay)})` : ""
    const newText = `${responderString} ${yesResponders.length === 1 ? "is" : "are"} down${delayString}`
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