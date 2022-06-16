import { getConfigsFromFirestore, getDebug, signIn } from "../lib/firestore"
import { handleDebug } from "../lib/util/discord-utils"
import { sleepSeconds } from "../lib/util/data-structure-utils"

const BUFFER = 3 // seconds

export const discordConfig: Record<string, string> = {}

// Export this promise so other modules can block until the config is loaded
export async function waitForDiscordConfig() {
    while (Object.keys(discordConfig).length === 0) {
        await sleepSeconds(BUFFER)
    }
}

let signedIn = false

export function signInAndLoadDiscordConfig() {
    if (signedIn) {
        console.error("Already signed in. Skipping...")
        return
    }

    signIn().then(() => {
        signedIn = true
        getConfigsFromFirestore().then(async configData => {
            Object.keys(configData).forEach(key => discordConfig[key] = configData[key])
            const debugValue = await getDebug()
            if (debugValue === true) {
                console.log("Starting in debug mode...")
                handleDebug(debugValue)
            }

            console.log("Discord configs successfully loaded from Firestore.")
        })
    })
}