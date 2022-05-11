import express from "express"
import _ from "underscore"
import { getPlayerStaticData, setPlayerStatus, getPlayerContract } from "./lib/firestore"
import { sleep } from "./lib/data-structure-utils"
import { discordConfig, signInAndLoadDiscordConfig, waitForDiscordConfig } from "./config/discord-config"
import { Client, Guild, GuildMember, Role } from "discord.js"
import config from "./config/config"
import { Fields } from "./lib/firestore-schema"

const APP = express()
const HOST = "0.0.0.0"
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 80
const BACKLOG = 511 // default
const NAME_KEY = "name"

const LIVE_STATUS_REQUIRED_FIELDS = [NAME_KEY, Fields.STATUS, Fields.SECRET]
const CONTRACT_REQUIRED_FIELDS = [NAME_KEY, Fields.SECRET]

const SLEEP_TIME = 1000 // ms

// Status code regexes
const DELIMITER = ";"
const AFK_REGEX = /^AFK;.*$/
const STARTUP_REGEX = /^STARTUP;.*$/
const LOBBY_REGEX = /^MENUS;(DEFAULT|CUSTOM_GAME_SETUP);.*$/
const QUEUE_REGEX = /^MENUS;MATCHMAKING;.*$/
const PREGAME_REGEX = /^PREGAME;.*$/
const RANGE_REGEX = /^INGAME;[a-zA-Z]*;ShootingRange$/
const INGAME_REGEX = /^INGAME;[a-zA-Z]*;[a-zA-Z]*(?<!ShootingRange)$/

const STATUS_ROLE_MAP = new Map<RegExp, Role>()

// Helper for assigning role based on status
async function updateStatusRole(member: GuildMember, status_message: string) {
    const lastDelim = status_message.lastIndexOf(DELIMITER)

    let newRole : Role | undefined // Offline by default
    if (lastDelim >= 0) {
        const status_code = status_message.substring(0, lastDelim)

        // Check which role the status code corresponds to
        const matchingRegexKey = [...STATUS_ROLE_MAP.keys()].find((regex: RegExp) => regex.test(status_code))
        if (!matchingRegexKey) {
            console.error(`Couldn't find a matching role for status code ${status_code}`)
        } else {
            newRole = STATUS_ROLE_MAP.get(matchingRegexKey)
        }
    }

    // Reset status roles
    if (!newRole || (newRole && !member.roles.cache.has(newRole.id))) {
        await member.roles.remove([...STATUS_ROLE_MAP.values()])
    }

    if (newRole) {
        if (member.roles.cache.has(newRole.id)) {
            console.log(`Status role for ${member.user.username} is already '${newRole.name}' - skipping.`)
        } else {
            await member.roles.add(newRole)

            console.log(`Updated status role for ${member.user.username} to '${newRole.name}'.`)
        }
    }
}

// Create Discord client
const client = new Client({
    intents: [
        "GUILDS",
        "GUILD_MEMBERS",
    ]
})

client.login(config.DISCORD_TOKEN)

// Authenticate and load status roles
let initialized = false
let guild : Guild | undefined
signInAndLoadDiscordConfig() // This also initializes the Firestore connection
waitForDiscordConfig().then(async () => {
    while (!client.isReady()) {
        await sleep(SLEEP_TIME) // Wait for client to initialize
    }

    guild = client.guilds.cache.get(discordConfig.GUILD_ID)!

    // Populate status roles
    STATUS_ROLE_MAP.set(AFK_REGEX, (await guild?.roles.fetch(discordConfig.AFK_ROLE_ID))!)
    STATUS_ROLE_MAP.set(LOBBY_REGEX, (await guild?.roles.fetch(discordConfig.IN_LOBBY_ROLE_ID))!)
    STATUS_ROLE_MAP.set(STARTUP_REGEX, STATUS_ROLE_MAP.get(LOBBY_REGEX)!)
    STATUS_ROLE_MAP.set(QUEUE_REGEX, (await guild?.roles.fetch(discordConfig.IN_QUEUE_ROLE_ID))!)
    STATUS_ROLE_MAP.set(PREGAME_REGEX, (await guild?.roles.fetch(discordConfig.IN_PREGAME_ROLE_ID))!)
    STATUS_ROLE_MAP.set(RANGE_REGEX, (await guild?.roles.fetch(discordConfig.IN_RANGE_ROLE_ID))!)
    STATUS_ROLE_MAP.set(INGAME_REGEX, (await guild?.roles.fetch(discordConfig.IN_GAME_ROLE_ID))!)

    initialized = true
})

// Expect JSON content type
APP.use(express.json())

APP.put("/live_status", async (request, response) => {
    const missingFields = LIVE_STATUS_REQUIRED_FIELDS.filter(field => !request.body[field])
    if (!_.isEmpty(missingFields)) {
        response.json({ message: `Request body is missing expected fields: ${missingFields}` })
        return
    }

    // Wait for initialization to complete if needed
    while (!initialized) {
        await sleep(SLEEP_TIME)
    }

    // Get the status message that will be stored in firestore
    const full_msg = request.body[Fields.STATUS]
    const status = full_msg.includes(DELIMITER) ? full_msg.split(DELIMITER).pop() : full_msg

    // Set the player status
    setPlayerStatus(request.body[NAME_KEY], status, request.body[Fields.SECRET]).then(async _ => {
        const playerData = await getPlayerStaticData()
        const member = await guild!.members.fetch(playerData[request.body[NAME_KEY]][Fields.DISCORD_ID])
        if (!member) {
            throw Error(`Couldn't find member with discord ID ${playerData[request.body[NAME_KEY]][Fields.DISCORD_ID]}`)
        } else {
            updateStatusRole(member, full_msg) // Code will be of the form status_type|party_state|provisioning_flow
            response.json({ message: `Updated status for ${request.body[NAME_KEY]} to ${status}.` })
        }
    }).catch(error => {
        console.error(`Error occurred while setting player status: ${error}`)
    })
})

APP.get("/contract", async (request, response) => {
    const missingFields = CONTRACT_REQUIRED_FIELDS.filter(field => !request.body[field])
    if (!_.isEmpty(missingFields)) {
        response.json({ message: `Request body is missing expected fields: ${missingFields}` })
        return
    }

    // Wait for initialization to complete if needed
    while (!initialized) {
        await sleep(SLEEP_TIME)
    }

    getPlayerContract(request.body[NAME_KEY], request.body[Fields.SECRET]).then(async agent => {
        const playerData = await getPlayerStaticData()
        const member = await guild!.members.fetch(playerData[request.body[NAME_KEY]][Fields.DISCORD_ID])
        if (!member) {
            throw Error(`Couldn't find member with discord ID ${playerData[request.body[NAME_KEY]][Fields.DISCORD_ID]}`)
        } else {
            response.json({ contract: agent })
        }
    }).catch(error => {
        console.error(`Error occurred while getting player contract: ${error}`)
    })
})

APP.listen(PORT, HOST, BACKLOG, () => {
    console.log(`Listening for events on ${HOST}:${PORT}...`)
})