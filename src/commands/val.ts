import { SlashCommandBuilder } from "@discordjs/builders"
import { Client, CommandInteraction, TextChannel, GuildMember, Message, GuildMemberRoleManager } from "discord.js"
import _ from "underscore"
import { commandFromTextChannel, findEmoji, pingChannel, preferredName, resolveInteraction, valRole } from "../lib/util/discord-utils"
import { trackActivePing, trackFiredPing, exceedsActivePingLimit, exceedsFiredPingRateLimit, tempPingBan, isPingBanned, cooldownRemaining, numActivePings } from "../lib/trackers/ping-tracker"
import { findBestMatch } from "string-similarity"
import { readableTimeMinutes, readableTimeSeconds } from "../lib/util/data-structure-utils"
import { sleepMinutes } from "../lib/util/async-utils"
import { fetchGameModes } from "../lib/valorant-content"

const MIN_DELAY = 1 // 1 minute
const MAX_DELAY = 24 * 60 // 1 day max
const MIN_TTL = 1 // 1 minute
const MAX_TTL = 12 * 60 // 12 hours max

export const data = new SlashCommandBuilder()
    .setName("val")
    .setDescription("ping everyone in the @fragl0rds role (from any text channel)")
    .addIntegerOption(option => option.setName("delay_in_min").setDescription("Time in minutes before ping is sent.").setRequired(false))
    .addIntegerOption(option => option.setName("ttl_in_min").setDescription("How long this ping will be up for before being marked as expired.").setRequired(false))
    .addStringOption(option => option.setName("mode").setDescription("The mode you want to play (unrated, comp, custom, etc.).").setRequired(false))

export async function execute(interaction: CommandInteraction, __: Client) {
    if (!commandFromTextChannel(interaction)) {
        return
    }

    const member = interaction.member as GuildMember
    const playChannel = await pingChannel(member)

    // Check for naughty behavior
    let cooldownLeft = cooldownRemaining()
    if (isPingBanned(member)) {
        const whereString = interaction.channel === playChannel ? "" : ` in ${playChannel}`
        return interaction.reply({ content: `bitch did you not read what I said${whereString}? ${findEmoji("lmao")}`, ephemeral: true })
    } else if (!isNaN(cooldownLeft)) {
        return interaction.reply({ content: `wait at least **${readableTimeSeconds(cooldownLeft)}** before pinging again ${findEmoji("sagetilt")} (on cooldown)`, ephemeral: true })
    } else if (exceedsActivePingLimit(member)) {
        return interaction.reply({ content: `slow your roll homie ${findEmoji("no")} (too many queued pings)`, ephemeral: true })
    }

    const role = await valRole(member)
    const username = preferredName(member)

    // Validate params
    const delayMinutes = getBoundedIntegerParam("delay_in_min", MIN_DELAY, MAX_DELAY, interaction)
    if (_.isNull(delayMinutes)) return

    const ttlMinutes = getBoundedIntegerParam("ttl_in_min", MIN_TTL, MAX_TTL, interaction)
    if (_.isNull(ttlMinutes)) return

    const modeRaw = interaction.options.getString("mode")
    const mode = modeRaw ? findBestMatch(modeRaw.toLowerCase(), await fetchGameModes()).bestMatch.target : undefined

    // Don't reply to the user
    resolveInteraction(interaction)

    if (!isNaN(delayMinutes)) {
        // Notify the channel that a ping is on the way
        const delayPromise = handleNotificationCountdown(username, playChannel, delayMinutes, numActivePings(member) < 1, mode)
        trackActivePing(member, delayPromise)
        await delayPromise // Wait for the countdown to complete before proceeding
    }

    // Temporarily remove member from the gaming role - not great, but the only
    // workaround I can think of to avoid pinging the caller
    const memberRoles = member.roles as GuildMemberRoleManager
    let isGamer = false
    if (memberRoles.cache.has(role.id)) {
        await memberRoles.remove(role)
        isGamer = true
    }

    // Ping gamers
    const modeString = mode ? ` (**${mode}**)` : ""
    const baseText = `${username} - ${role}${modeString}`

    playChannel.send(baseText).then(async sentMessage => {
        // Determine which message is visible in channel that can be interacted with
        trackFiredPing(member, sentMessage, sentMessage)
        if (exceedsFiredPingRateLimit(member)) {
            tempPingBan(member, playChannel) // Punish naughty spammers
        }

        // If removed from the gaming role, add them back
        if (isGamer) {
            memberRoles.add(role)
        }

        // Handle TTL if specified
        if (!isNaN(ttlMinutes)) {
            // Update the expiry message every minute
            for (const count of _.range(ttlMinutes, 0, -1)) {
                const suffix = ` (expires in **${readableTimeMinutes(count)}**)`
                sentMessage.edit(baseText + suffix)

                await sleepMinutes(1) // Sleep 1 minute
            }

            sentMessage.edit(`~~${baseText}~~ [EXPIRED]`)
        }
    }).catch(console.error)
}

// Let the ping channel know the ping is on the way
async function handleNotificationCountdown(username: string, pingChannel: TextChannel, delayMin: number, firstActivePing: boolean, mode?: string) {
    const alsoString = firstActivePing ? "" : " *also*"
    const modeString = mode ? `**${mode}** ` : ""

    let buildNotif = (s1: string, s2: string, s3: string) => `${s1}${s2} wants to play ${s3}`
    let sentNotif : Message | undefined
    for (const count of _.range(delayMin, 0, -1)) {
        // Only display countdown if a delay is provided
        const notifString = buildNotif(username, alsoString, `${modeString}in **${readableTimeMinutes(count)}**. :eyes:`)

        if (!sentNotif) {
            sentNotif = await pingChannel.send(notifString)
            sentNotif.pin() // Just in case the message gets scrolled past
        } else {
            sentNotif.edit(notifString)
        }

        await sleepMinutes(1) // Sleep 1 minute
    }

    const finalText = buildNotif(username, "", `${modeString}**now** (ping is below). :tada:`)
    sentNotif!.edit(finalText)
    sentNotif!.unpin()
}

// Helper for retrieving an integer parameter and checking if it's within bounds, if not it returns null
function getBoundedIntegerParam(paramName: string, min: number, max: number, interaction: CommandInteraction) {
    const rawValue = interaction.options.getInteger(paramName)
    if (rawValue && (rawValue < min || rawValue > max)) {
        interaction.reply({ content: `${paramName} must be between ${min} and ${max}, inclusive.`, ephemeral: true })
        return null
    }

    return rawValue ? rawValue : NaN
}