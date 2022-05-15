import got from "got"
import _ from "underscore"

// In-memory caches of game data
const AGENTS : string[] = []

// Get a list of all agent names
export async function fetchAgents() {
    if (_.isEmpty(AGENTS)) {
        const { data } = await got.get("https://valorant-api.com/v1/agents?language=en-US&isPlayableCharacter=true").json()
        for (const agentDatum of data) {
            AGENTS.push(agentDatum["displayName"].toLowerCase())
        }
    }

    return AGENTS
}