import express from "express"
import _ from "underscore"
import { getPlayerStaticData, setPlayerStatus, getPlayerContract, setPlayerContract, setPlayerGameData } from "./lib/firestore"
import { sleep } from "./lib/util/data-structure-utils"
import { discordConfig, signInAndLoadDiscordConfig, waitForDiscordConfig } from "./config/discord-config"
import { Client, Guild, GuildMember, Role } from "discord.js"
import config from "./config/config"
import { Fields } from "./config/firestore-schema"

const APP = express()
const HOST = "0.0.0.0"
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 80
const BACKLOG = 511 // default
const NAME_KEY = "name"

const LIVE_STATUS_REQUIRED_FIELDS = [NAME_KEY, Fields.STATUS, Fields.SECRET]
const GET_CONTRACT_REQUIRED_FIELDS = [NAME_KEY, Fields.SECRET]
const PUT_CONTRACT_REQUIRED_FIELDS = [NAME_KEY, Fields.SECRET, Fields.CONTRACT_AGENT]
const PUT_PLAYER_REQUIRED_FIELDS = [NAME_KEY, Fields.SECRET, Fields.IGN]

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
    await validateRequest(request, response, LIVE_STATUS_REQUIRED_FIELDS)

    // Get the status message that will be stored in firestore
    const full_msg = request.body[Fields.STATUS]
    const indexOfDelim = full_msg.lastIndexOf(DELIMITER)
    const status = indexOfDelim >= 0 ? full_msg.substring(indexOfDelim + 1) : full_msg
    const status_code = indexOfDelim >= 0 ? full_msg.substring(0, indexOfDelim) : full_msg

    // Set the player status
    setPlayerStatus(request.body[NAME_KEY], request.body[Fields.SECRET], status, status_code).then(async _ => {
        const playerData = await getPlayerStaticData()
        const member = await guild!.members.fetch(playerData[request.body[NAME_KEY]][Fields.DISCORD_ID])
        if (!member) {
            throw Error(`Couldn't find member with discord ID ${playerData[request.body[NAME_KEY]][Fields.DISCORD_ID]}`)
        } else {
            updateStatusRole(member, status_code) // Code will be of the form status_type|party_state|provisioning_flow
            response.json({ message: `Updated status for ${request.body[NAME_KEY]} to '${status}'.` })
        }
    }).catch(error => {
        console.error(`Error occurred while setting player status: ${error}`)
    })
})

APP.get("/contract", async (request, response) => {
    await validateRequest(request, response, GET_CONTRACT_REQUIRED_FIELDS)

    getPlayerContract(request.body[NAME_KEY], request.body[Fields.SECRET]).then(async agent => {
        response.json({ contract_agent: agent })
    }).catch(error => {
        console.error(`Error occurred while getting contract for '${request.body[NAME_KEY]}': ${error}`)
    })
})

APP.put("/contract", async (request, response) => {
    await validateRequest(request, response, PUT_CONTRACT_REQUIRED_FIELDS)

    setPlayerContract(request.body[NAME_KEY], request.body[Fields.SECRET], request.body[Fields.CONTRACT_AGENT]).then(async () => {
        response.json({ message: `Updated contract agent for ${request.body[NAME_KEY]} to ${request.body[Fields.CONTRACT_AGENT]}.` })
    }).catch(error => {
        console.error(`Error occurred while updating contract for '${request.body[NAME_KEY]}': ${error}`)
    })
})

APP.put("/game_data", async (request, response) => {
    await validateRequest(request, response, PUT_PLAYER_REQUIRED_FIELDS)

    setPlayerGameData(request.body[NAME_KEY], request.body[Fields.SECRET], request.body[Fields.IGN]).then(async () => {
        response.json({ message: `Updated in-game data for ${request.body[NAME_KEY]} to ${request.body[Fields.IGN]}.` })
    }).catch(error => {
        console.error(`Error occurred while updating in-game data for ${request.body[NAME_KEY]}: ${error}`)
    })
})

APP.listen(PORT, HOST, BACKLOG, () => {
    console.log(`Listening for events on ${HOST}:${PORT}...`)
})

// Helpers //

// Helper for assigning role based on status
async function updateStatusRole(member: GuildMember, statusCode: string) {
    let newRole : Role | undefined // Offline by default
    if (statusCode.includes(DELIMITER)) {
        // Check which role the status code corresponds to
        const matchingRegexKey = [...STATUS_ROLE_MAP.keys()].find((regex: RegExp) => regex.test(statusCode))
        if (!matchingRegexKey) {
            console.error(`Couldn't find a matching role for status code ${statusCode}`)
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

// Helper for validating API request contents
async function validateRequest(request: express.Request, response: express.Response, requiredFields: string[]) {
    const missingFields = requiredFields.filter(field => _.isUndefined(request.body[field]))
    if (!_.isEmpty(missingFields)) {
        response.json({ message: `Request body is missing these required fields: ${missingFields}` })
        return
    }

    // Wait for initialization to complete if needed
    while (!initialized) {
        await sleep(SLEEP_TIME)
    }

    return
}