import { SlashCommandBuilder } from "@discordjs/builders"
import { Client, CommandInteraction, SnowflakeUtil } from "discord.js"
import _ from "underscore"
import { commandFromTextChannel, resolveInteraction } from "../lib/util/discord-utils"
import { findBestMatch } from "string-similarity"
import { fetchGameModes } from "../lib/valorant-content"
import { Ping } from "../config/firestore-schema"
import { trackPing } from "../lib/firestore/pings"
import { sendDelay, firePing, updateTtl } from "../lib/util/ping-utils"

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
    if (!commandFromTextChannel(interaction)) return

    // Validate params
    const delay = getBoundedIntegerParam("delay_in_min", MIN_DELAY, MAX_DELAY, interaction)
    if (delay && isNaN(delay)) return

    const ttl = getBoundedIntegerParam("ttl_in_min", MIN_TTL, MAX_TTL, interaction)
    if (ttl && isNaN(ttl)) return

    const modeRaw = interaction.options.getString("mode")
    const mode = modeRaw ? findBestMatch(modeRaw.toLowerCase(), await fetchGameModes()).bestMatch.target : null

    const requesterId = interaction.user.id

    // Create and store ping obj
    const ping : Ping = { pingId: SnowflakeUtil.generate(), requesterId, createdAt: Date.now(), fired: false, responses: [] }
    if (mode) ping.mode = mode
    if (delay) ping.delayLeft = delay
    if (ttl) ping.ttlLeft = ttl

    await trackPing(ping)

    if (delay) {
        // Send a delay message if delay was provided
        await sendDelay(ping)
    } else {
        // Fire immediately if there is no delay
        await firePing(ping)
        if (ttl) updateTtl(ping.pingId) // Update message to contain TTL info
    }

    // Don't reply to the user
    resolveInteraction(interaction)
}

// Helper for retrieving an integer parameter and checking if it's within bounds, if not it returns null
function getBoundedIntegerParam(paramName: string, min: number, max: number, interaction: CommandInteraction) {
    const rawValue = interaction.options.getInteger(paramName)
    if (rawValue && (rawValue < min || rawValue > max)) {
        interaction.reply({ content: `${paramName} must be between ${min} and ${max}, inclusive.`, ephemeral: true })
        return NaN
    }

    return rawValue ? rawValue : null
}