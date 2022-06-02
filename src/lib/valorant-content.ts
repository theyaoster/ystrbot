import got from "got"
import _ from "underscore"

const AGENT_ENDPOINT = "https://valorant-api.com/v1/agents?language=en-US&isPlayableCharacter=true"

// In-memory caches of game data
const AGENTS : string[] = []

// Get a list of all agent names
export async function fetchAgents() {
    if (_.isEmpty(AGENTS)) {
        const { data } = await got.get(AGENT_ENDPOINT).json()
        for (const agentDatum of data) {
            AGENTS.push(agentDatum["displayName"].toLowerCase())
        }
    }

    return AGENTS
}