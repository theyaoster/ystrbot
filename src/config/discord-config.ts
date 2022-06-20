import _ from "underscore"
import { getConfigsFromFirestore, getDebug, getDebugData, signIn } from "../lib/firestore"
import { wait } from "../lib/util/async-utils"

const VAL_ROLE_ID_NAME = "VAL_ROLE_ID"

export const discordConfig : Record<string, string> = {}

// Export this promise so other modules can block until the config is loaded
export async function waitForDiscordConfig() {
    while (Object.keys(discordConfig).length === 0) {
        await wait()
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
            // Populate discord config
            Object.keys(configData).forEach(key => discordConfig[key] = configData[key])

            // Populate discord channels

            const debugValue = await getDebug()
            if (debugValue === true) {
                console.log("Starting in debug mode...")

                 // Change role ID to testing role
                const debugData = await getDebugData()
                discordConfig[VAL_ROLE_ID_NAME] = debugData[VAL_ROLE_ID_NAME]
            }

            console.log("Discord configs successfully loaded from Firestore.")
        })
    })
}