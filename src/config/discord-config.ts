import { getConfigsFromFirestore, getDebug, signIn } from "../lib/firestore"
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