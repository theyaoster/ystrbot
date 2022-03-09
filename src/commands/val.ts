import { SlashCommandBuilder } from "@discordjs/builders"
import { Client, CommandInteraction, TextChannel, GuildMember, Role, Message } from "discord.js"
import _ from "underscore"
import { discordConfig } from "../config/discord-config"
import { sleep, commandFromTextChannel, findEmoji } from "../lib/utils"
import { trackActivePing, trackFiredPing, exceedsActivePingLimit, exceedsFiredPingRateLimit, tempPingBan, isPingBanned, cooldownRemaining, numActivePings } from "../lib/ping-tracker"

const MIN_DELAY = 1 // 1 minute
const MAX_DELAY = 24 * 60 // 1 day max
const MIN_TTL = 1 // 1 minute
const MAX_TTL = 12 * 60 // 12 hours max
// const REPLY_TTL = 3 // seconds

export const data = new SlashCommandBuilder()
    .setName("val")
    .setDescription("Ping fragl0rds.")
    .addIntegerOption(option => option.setName("delay_in_min").setDescription("Time in minutes before ping is sent.").setRequired(false))
    .addIntegerOption(option => option.setName("ttl_in_min").setDescription("How long this ping will be up for before being marked as expired.").setRequired(false))

export async function execute(interaction: CommandInteraction, client: Client) {
    if (!commandFromTextChannel(interaction, client)) {
        return
    }

    const member = interaction.member as GuildMember
    const pingChannel = client.channels.cache.get(discordConfig.VAL_PING_CHANNEL_ID) as TextChannel
    if (!pingChannel) {
        return console.error("Failed to find text channel by VAL_PING_CHANNEL_ID!")
    }

    // Check for naughty behavior
    let cooldownLeft = cooldownRemaining(member)
    if (isPingBanned(member)) {
        const whereString = interaction.channel === pingChannel ? "" : ` in ${pingChannel}`
        return interaction.reply({ content: `bitch did you not read what I said${whereString}? ${findEmoji("lmao", client)}`, ephemeral: true })
    } else if (!isNaN(cooldownLeft)) {
        return interaction.reply({ content: `wait at least **${cooldownLeft} seconds** before pinging again ${findEmoji("sagetilt", client)} (on cooldown)`, ephemeral: true })
    } else if (exceedsActivePingLimit(member)) {
        return interaction.reply({ content: `slow your roll homie ${findEmoji("no", client)} (too many queued pings)`, ephemeral: true })
    }

    const guild = client.guilds.cache.get(discordConfig.GUILD_ID)!
    const valRole = guild.roles.cache.get(discordConfig.VAL_ROLE_ID)!
    const username = member.nickname || member.user.username

    // Validate numerical params (if provided)
    const delayRaw = interaction.options.getInteger("delay_in_min")
    if (delayRaw && (delayRaw < MIN_DELAY || delayRaw > MAX_DELAY)) {
        return interaction.reply({ content: `Delay must be between ${MIN_DELAY} and ${MAX_DELAY} (inclusive).`, ephemeral: true })
    }
    const delayMinutes = delayRaw || NaN // NaN means no delay (default)
    const ttlRaw = interaction.options.getInteger("ttl_in_min")
    if (ttlRaw && (ttlRaw < MIN_TTL || ttlRaw > MAX_TTL)) {
        return interaction.reply(`TTL must be between ${MIN_TTL} and ${MAX_TTL} (inclusive).`)
    }
    const ttlMinutes = ttlRaw || NaN // NaN means infinite TTL (default)

    // Reply to user
    await interaction.reply(`ping incoming ${isNaN(delayMinutes) ? "**now**" : `in **${delayMinutes} minutes**`}.`)
    interaction.deleteReply()
    
    let notifMessage : Message | undefined = undefined
    let originalNotifContent : string | undefined = undefined
    if (!isNaN(delayMinutes)) {
        // Notify the channel that a ping is on the way
        const promise = handleNotificationCountdown(username, pingChannel, delayMinutes, numActivePings(member) < 1, valRole)
        trackActivePing(member, promise)
        const result = await promise

        notifMessage = result[0] as Message
        originalNotifContent = result[1] as string
    }

    // Ping gamers
    const baseMessage = `${username} - ${valRole}`
    pingChannel.send(baseMessage).then(async sentMessage => {
        trackFiredPing(member, sentMessage)
        if (exceedsFiredPingRateLimit(member)) {
            tempPingBan(member, pingChannel)
        }

        // Reuse delay notification if possible
        if (!_.isUndefined(notifMessage)) {
            sentMessage.delete().catch(console.error)
        }

        // Handle TTL if specified
        if (!isNaN(ttlMinutes)) {
            const messageToUpdate = _.isUndefined(notifMessage) ? sentMessage : notifMessage
            const originalContent = _.isUndefined(notifMessage) ? baseMessage : originalNotifContent

            // Update the expiry message every minute
            for (const count of _.range(ttlMinutes, 0, -1)) {
                const suffix = ` (expires in **${count} minutes**)`
                messageToUpdate.edit(originalContent + suffix)
                
                await sleep(60 * 1000) // Sleep 1 minute
            }
            
            messageToUpdate.edit(`~~${originalContent}~~ [EXPIRED]`)
        }
    }).catch(console.error)
}

// Let the ping channel know the ping is on the way
async function handleNotificationCountdown(username: string, pingChannel: TextChannel, delayMin: number, firstActivePing: boolean, valRole: Role) {
    const alsoString = firstActivePing ? "" : " *also*"

    let buildNotif = (s1: string, s2: string, s3: string, s4: string) => `${s1}${s2} wants to play ${s3}${s4}`
    let sentNotif = undefined
    for (let count of _.range(delayMin, 0, -1)) {
        // Only display countdown if a delay is provided
        const plurality = count === 1 ? "**. :eyes:" : "s**. :eyes:"
        const notifString = buildNotif(username, alsoString, `in **${count} minute`, plurality)

        if (!sentNotif) {
            sentNotif = await pingChannel.send(notifString)
        } else {
            sentNotif.edit(notifString)
        }

        await sleep(60 * 1000) // Sleep 1 minute
    }

    const finalText = buildNotif(username, "", "**now", `**. ${valRole}`)
    sentNotif!.edit(finalText)
    return [sentNotif!, finalText]
}