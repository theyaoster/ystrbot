import { getConfigsFromFirestore, getDebug } from "../lib/firestore"
import { handleDebug } from "../lib/discord-utils"
import { sleep } from "../lib/data-structure-utils"

const BUFFER = 3000 // ms

export const discordConfig: Record<string, string> = {}

// Export this promise so other modules can block until the config is loaded
export async function waitForDiscordConfig() {
    while (Object.keys(discordConfig).length === 0) {
        await sleep(BUFFER)
    }
}

export function loadDiscordConfig() {
    getConfigsFromFirestore().then(async configData => {
        Object.keys(configData).forEach(key => discordConfig[key] = configData[key])
        const debugValue = await getDebug()
        if (debugValue === true) {
            console.log("Starting in debug mode...")
            handleDebug(debugValue)
        }
    })
}