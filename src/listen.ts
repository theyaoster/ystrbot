import express from "express"
import _ from "underscore"
import { getPlayerStaticData, setPlayerStatus } from "./lib/firestore"
import { sleep, stringMap } from "./lib/data-structure-utils"
import { discordConfig, signInAndLoadDiscordConfig, waitForDiscordConfig } from "./config/discord-config"
import { Client, Guild, GuildMember, Role } from "discord.js"
import config from "./config/config"
import { Fields } from "./lib/firestore-schema"

const APP = express()
const HOST = "0.0.0.0"
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 80
const BACKLOG = 511 // default
const NAME_KEY = "name"
const STATUS_KEY = "status"
const SECRET_KEY = "secret"
const REQUIRED_FIELDS = [NAME_KEY, STATUS_KEY, SECRET_KEY]
const SLEEP_TIME = 1000 // ms

const MENU_KEY = "menu"
const RANGE_KEY = "range"
const INGAME_KEY = "ingame"
const AFK_KEY = "afk"

const STATUS_KEYWORDS : { [key: string] : string[] } = stringMap([MENU_KEY, AFK_KEY, RANGE_KEY, INGAME_KEY], [["Menu", "Queue", "Setup", "Pre", "Loading", "Updating", "Found"], ["Away"], ["Range"], [" to "]])
const STATUS_ROLES : { [status_key: string] : Role } = {} // This is populated later

// Helper for assigning role based on status
async function updateStatusRole(member: GuildMember, status: string) {
    let newRole : Role | undefined // Offline by default
    const matchingStatusKey = [MENU_KEY, AFK_KEY, RANGE_KEY, INGAME_KEY].find(key => STATUS_KEYWORDS[key].some(kw => status.includes(kw)))
    if (matchingStatusKey) {
        // In menu, in range, or afk
        newRole = STATUS_ROLES[matchingStatusKey]
    }

    // Reset status roles if player is offline or has changed status
    if (!newRole || (newRole && !member.roles.cache.has(newRole.id))) {
        await member.roles.remove(Object.values(STATUS_ROLES))
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
        "GUILD_INVITES",
        "GUILD_MESSAGES",
        "GUILD_MESSAGE_REACTIONS",
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

    STATUS_ROLES[MENU_KEY] = (await guild?.roles.fetch(discordConfig.IN_MENU_ROLE_ID))!
    STATUS_ROLES[AFK_KEY] = (await guild?.roles.fetch(discordConfig.AFK_ROLE_ID))!
    STATUS_ROLES[RANGE_KEY] = (await guild?.roles.fetch(discordConfig.IN_RANGE_ROLE_ID))!
    STATUS_ROLES[INGAME_KEY] = (await guild?.roles.fetch(discordConfig.IN_GAME_ROLE_ID))!

    initialized = true
})

// Expect JSON content type
APP.use(express.json())

APP.put("/live_status", async (request, response) => {
    const missingFields = REQUIRED_FIELDS.filter(field => !request.body[field])
    if (!_.isEmpty(missingFields)) {
        response.json({ message: `Request body is missing expected fields: ${missingFields}` })
        return
    }

    // Wait for initialization to complete if needed
    while (!initialized) {
        await sleep(SLEEP_TIME)
    }

    setPlayerStatus(request.body[NAME_KEY], request.body[STATUS_KEY], request.body[SECRET_KEY]).then(async _ => {
        const playerData = await getPlayerStaticData()
        const member = await guild!.members.fetch(playerData[request.body[NAME_KEY]][Fields.DISCORD_ID])
        if (!member) {
            console.error(`Couldn't find member with discord ID ${playerData[request.body[NAME_KEY]][Fields.DISCORD_ID]}`)
        } else {
            updateStatusRole(member, request.body[STATUS_KEY])
        }
        response.json({ message: `Updated status for ${request.body[NAME_KEY]} to ${request.body[STATUS_KEY]}.` })
    }).catch(error => {
        console.error(`Error occurred while setting player status: ${error}`)
    })
})

APP.listen(PORT, HOST, BACKLOG, () => {
    console.log(`Listening for events on ${HOST}:${PORT}...`)
})