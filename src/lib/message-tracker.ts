import { GuildMember, Message, TextChannel } from "discord.js";

const latestMessages = new Map<TextChannel, Map<GuildMember, Message>>()

// Set latest message for a member
export function setLatestMessage(channel: TextChannel, member: GuildMember,  message: Message) {
    if (!latestMessages.has(channel)) {
        latestMessages.set(channel, new Map())
    }

    latestMessages.get(channel)?.set(member, message)
}

// Get the latest message, either per member or globally
export function getLatestMessage(channel: TextChannel, member?: GuildMember) {
    if (!latestMessages.has(channel)) {
        return null // Channel is not tracked
    }
    if (member) {
        if (!latestMessages.get(channel)?.has(member)) {
            return null // Member is not tracked in channel
        }
        return latestMessages.get(channel)?.get(member)
    } else {
        return [...latestMessages.get(channel)!.values()].reduce((prev, curr) => prev.createdTimestamp > curr.createdTimestamp ? prev : curr)
    }
}