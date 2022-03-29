import { Message, GuildMember, TextChannel } from "discord.js"
import { Queue } from "queue-typescript"
import _ from "underscore"
import { resetPingResponses } from "./response-tracker"
import { sleep, findEmoji } from "./utils"

// Track active /val pings per user
const activePings = new Map<GuildMember, Set<Promise<void>>>()

// Track total number of pings fired per user
const firedPings = new Map<GuildMember, Queue<Message>>()

// Set of member ids that are temporarily banned from pinging
const blocklist = new Set<GuildMember>()

// Last ping message that's visible
let latestPingMessage : Message | undefined
let latestPinger : GuildMember | undefined
let latestPingTimestamp : number | undefined

const FIRED_PING_RATE_LIMIT_WINDOW = 2 // hours
const FIRED_PING_RATE_LIMIT_THRESHOLD = 5
const FIRED_PING_RATE_LIMIT_PENALTY = 3 // hours
const FIRED_PING_COOLDOWN = 300 * 1000 // seconds
const MAX_ACTIVE_PING_COUNT = 3

// An "active" ping is one queued with delay that hasn't fired yet
export function trackActivePing(member: GuildMember, promise: Promise<any>) {
    if (!activePings.has(member)) {
        activePings.set(member, new Set())
    }

    activePings.get(member)?.add(promise)
    promise.then(_ => {
        activePings.get(member)?.delete(promise)
    })
}

// Get the number of queued pings
export function numActivePings(member: GuildMember) {
    return activePings.get(member)?.size || 0
}

// Check if there's more queued pings than allowed
export function exceedsActivePingLimit(member: GuildMember) {
    return numActivePings(member) >= MAX_ACTIVE_PING_COUNT
}

// Track a ping that has just fired
export function trackFiredPing(member: GuildMember, message: Message, visibleMessage?: Message) {
    if (!firedPings.has(member)) {
        firedPings.set(member, new Queue())
    }
    firedPings.get(member)!.enqueue(message)

    if (visibleMessage) {
        latestPingMessage = visibleMessage
        latestPinger = member
        latestPingTimestamp = Date.now().valueOf()
    }

    resetPingResponses()
}

// How many seconds of cooldown remaining every user has (or NaN if no cooldown)
export function cooldownRemaining(): number {
    if (!latestPingMessage || !latestPingTimestamp) {
        // No pings in recent memory...
        return NaN
    }

    const difference = Date.now().valueOf() - latestPingTimestamp
    if (difference < FIRED_PING_COOLDOWN) {
        return Math.floor((FIRED_PING_COOLDOWN - difference) / 1000)
    } else {
        return NaN
    }
}

// Whether the given member has exceeded the fired ping limit
export function exceedsFiredPingRateLimit(member: GuildMember) {
    if (!firedPings.has(member)) {
        return false
    }

    // Dequeue all pings outside of the window
    const memberQueue = firedPings.get(member)!
    while (memberQueue.length > 0 && Date.now().valueOf() - memberQueue.front.createdTimestamp > FIRED_PING_RATE_LIMIT_PENALTY * 3600 * 1000) {
        memberQueue.dequeue()
    }

    return memberQueue.length >= FIRED_PING_RATE_LIMIT_THRESHOLD
}

// Temporarily ban a member from using /val; notify them of this in the provided channel
export async function tempPingBan(member: GuildMember, channel: TextChannel) {
    blocklist.add(member)
    let sentMessage = undefined
    for (const hourCount of _.range(FIRED_PING_RATE_LIMIT_WINDOW, 0, -1)) {
        const messageContent = `take a break ${member}... no more pinging for the next ${hourCount} hours ${findEmoji("angery", member.guild.client)}`
        if (_.isUndefined(sentMessage)) {
            sentMessage = await channel.send(messageContent) 
        } else {
            sentMessage.edit(messageContent)
        }

        await sleep(3600 * 1000); // Sleep for an hour
    }

    sentMessage!.delete()
    blocklist.delete(member)
}

// Whether the given player is currently banned from using /val
export function isPingBanned(member: GuildMember) {
    return blocklist.has(member)
}

// Retrieve the latest visible ping message and the time of the latest ping
export function getLatestPing() {
    return [latestPingMessage, latestPinger, latestPingTimestamp]
}