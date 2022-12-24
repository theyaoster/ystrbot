import got from "got"
import _ from "underscore"

// Resource locations
const BASE_URL = "https://valorant-api.com/v1"
const AGENT_ENDPOINT = BASE_URL + "/agents?language=en-US&isPlayableCharacter=true"
const GAMEMODE_ENDPOINT = BASE_URL + "/gamemodes?language=en-US"

// Sadly, there are some names that differ from what is in game
const GAMEMODES_TO_ADD = ["unrated", "competitive", "custom"]
const GAMEMODES_TO_REMOVE = ["standard", "practice", "onboarding"]

// In-memory caches of game data
const AGENTS : string[] = []
const GAMEMODES : string[] = []

// Get a list of all agent names (lower case)
export async function fetchAgents() {
    if (_.isEmpty(AGENTS)) {
        const { data } = await got.get(AGENT_ENDPOINT).json() as any
        for (const agentDatum of data) {
            AGENTS.push(agentDatum["displayName"].toLowerCase())
        }

        console.log(`Fetched VALORANT agents: ${AGENTS}`)
    }

    return AGENTS
}

// Get a list of all gamemode names (lower case)
export async function fetchGameModes() {
    if (_.isEmpty(GAMEMODES)) {
        // First add the ones not listed by the API
        GAMEMODES.push(...GAMEMODES_TO_ADD)

        // Fetch the rest from
        const { data } = await got.get(GAMEMODE_ENDPOINT).json() as any
        for (const modeDatum of data) {
            const gamemode = modeDatum["displayName"].toLowerCase()
            if (!GAMEMODES_TO_REMOVE.includes(gamemode)) {
                GAMEMODES.push(gamemode)
            }
        }

        console.log(`Fetched VALORANT gamemodes: ${GAMEMODES}`)
    }

    return GAMEMODES
}